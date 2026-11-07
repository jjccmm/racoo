import { expect, test } from '@playwright/test';
import { beginSearch, finishSearch, more, search } from './helpers';

const orderedTitles = [
  'Abdeckung vollständig', 'Paar B', 'Paar A', 'Paar C', 'Paar D',
  'Einzelne Laterne 1', 'Einzelne Katze 2', 'Einzelne Laterne 3', 'Einzelne Katze 4', 'Einzelne Laterne 5',
  'Einzelne Katze 6', 'Einzelne Laterne 7', 'Einzelne Katze 8', 'Einzelne Laterne 9', 'Einzelne Katze 10',
];

test('public search session preserves complete and partial coverage with ten lazy details', async ({ page }) => {
  const fragments: string[] = []; const records: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.pf_fragment')) fragments.push(request.url());
    if (/\/episodes\/.+\.json$/.test(request.url())) records.push(request.url());
  });
  await page.goto('./'); expect(fragments).toEqual([]); expect(records).toEqual([]);
  const first = (await search(page, 'Laterne Katzen Fenster')).page!;
  expect(first.total).toBe(15); expect(first.results).toHaveLength(10);
  expect(first.results.map((result) => result.matchedTerms.length)).toEqual([3, 2, 2, 2, 2, 1, 1, 1, 1, 1]);
  expect(fragments).toHaveLength(10); expect(records).toHaveLength(10);
  const next = (await more(page)).page!;
  expect(next.results).toHaveLength(5); expect(fragments).toHaveLength(15); expect(records).toHaveLength(15);
});

test('coverage, native rank sum, publication instant and identity decide public search order', async ({ page }) => {
  await page.goto('./');
  const first = (await search(page, 'Laterne Katzen Fenster')).page!;
  const next = (await more(page)).page!;
  expect([...first.results, ...next.results].map((result) => result.title)).toEqual(orderedTitles);
});

test('case, repetitions, whitespace and input order preserve distinct-term coverage', async ({ page }) => {
  await page.goto('./');
  for (const query of ['KATZEN   Laterne fenster Laterne KATZEN', '  FENSTER katzen LATERNE  ']) {
    const found = (await search(page, query)).page!;
    expect(found.terms).toEqual(['fenster', 'katzen', 'laterne']);
    expect(found.results.map((result) => result.title)).toEqual(orderedTitles.slice(0, 10));
    expect(found.results[1].matchedTerms).toEqual(['katzen', 'laterne']);
  }
});

test('German inflections, umlauts and sharp S stay eligible without exact spelling', async ({ page }) => {
  await page.goto('./');
  for (const query of ['Fuß Gruss', 'FÜSSE Grüße FÜSSE']) {
    const found = (await search(page, query)).page!;
    expect(found.results).toHaveLength(1); expect(found.results[0].matchedTerms).toHaveLength(2);
    expect(found.results[0].passages[0].text).toContain('Füße und Grüße.');
  }
  const found = (await search(page, 'Katze Fenster')).page!;
  expect(found.results[0].title).toBe('Abdeckung vollständig');
  expect(found.results[0].matchedTerms).toHaveLength(2); expect(found.results[1].matchedTerms).toHaveLength(1);
});

test('a failed additional page retains its offset until a deliberate retry', async ({ page }) => {
  let failures = 0;
  await page.route('**/episodes/coverage-single-06.json', (route) => { failures += 1; return route.fulfill({ status: 503, body: 'Unavailable' }); });
  await page.goto('./');
  const first = (await search(page, 'Laterne Katzen Fenster')).page!;
  expect(first.results.map((result) => result.title)).toEqual(orderedTitles.slice(0, 10));
  expect((await more(page)).error).toBeTruthy();
  await page.waitForTimeout(250); expect(failures).toBe(1);
  await page.unroute('**/episodes/coverage-single-06.json');
  expect((await more(page)).page!.results.map((result) => result.title)).toEqual(orderedTitles.slice(10));
});

test('an aborted public search cannot replace a newer search session', async ({ page }) => {
  let release: () => void = () => {}; const pending = new Promise<void>((resolve) => { release = resolve; }); let held = false;
  await page.route('**/episodes/coverage-complete.json', async (route) => { held = true; await pending; await route.continue().catch(() => {}); });
  await page.goto('./'); await beginSearch(page, 'Fenster');
  await expect.poll(() => held).toBe(true);
  const current = (await search(page, 'Münzen')).page!;
  expect(current.results.map((result) => result.episodeId)).toEqual(['synthetic-episode-001']);
  release(); await page.waitForTimeout(100);
  expect((await finishSearch(page)).page!.results.map((result) => result.episodeId)).toEqual(['synthetic-episode-001']);
});

test('an obsolete additional page is aborted before a new session is used', async ({ page }) => {
  let release: () => void = () => {}; const pending = new Promise<void>((resolve) => { release = resolve; }); let held = false;
  await page.route('**/episodes/coverage-single-06.json', async (route) => { held = true; await pending; await route.continue().catch(() => {}); });
  await page.goto('./'); await search(page, 'Laterne Katzen Fenster');
  const oldPage = more(page); await expect.poll(() => held).toBe(true);
  const current = (await search(page, 'Münzen')).page!;
  expect(current.results[0].episodeId).toBe('synthetic-episode-001');
  expect((await oldPage).error).toBeTruthy(); release();
});
