import { expect, test } from '@playwright/test';
import { choose, clearWords, search } from './helpers';

test('dropdown supports NFC matching, ranked suggestions, dismissal and keyboard selection', async ({ page }) => {
  await page.route('**/stats/vocabulary.json', async (route) => {
    const response = await route.fetch(); const data = await response.json();
    const coin = data.words.find((word: { lemma: string }) => word.lemma === 'münze');
    data.words = [{ ...coin, lemma: 'xxmünze', totalCount: 900 }, { ...coin, lemma: 'münzen', totalCount: 20 }, coin];
    await route.fulfill({ response, json: data });
  });
  await page.goto('./');
  const input = page.getByRole('combobox');
  await input.fill('MU\u0308NZE');
  await expect(page.getByRole('option')).toHaveText(['münze1 im Bestand', 'münzen20 im Bestand', 'xxmünze900 im Bestand']);
  await input.press('ArrowUp');
  await expect(page.getByRole('option').last()).toHaveAttribute('aria-selected', 'true');
  await input.press('Escape'); await expect(page.getByRole('listbox')).toHaveCount(0);
  await input.press('ArrowDown'); await input.press('Enter');
  await expect(page.getByRole('button', { name: 'münze entfernen' })).toBeVisible();
  await expect(input).toHaveValue('');
  await input.fill('münze');
  await expect(page.getByRole('option', { name: 'münze', exact: true })).toHaveCount(0);
  await page.getByRole('heading', { level: 1 }).click(); await expect(page.getByRole('listbox')).toHaveCount(0);
});

test('at most ten options and five removable chips keep their assigned colors', async ({ page }) => {
  const shards: string[] = []; page.on('request', (request) => { if (request.url().includes('/stats/counts/')) shards.push(request.url()); });
  await page.goto('./'); const input = page.getByRole('combobox'); await input.focus();
  await expect(page.getByRole('option')).toHaveCount(10); expect(shards).toEqual([]);
  for (const lemma of ['hund', 'katze', 'laterne', 'fenster', 'münze']) await choose(page, lemma);
  const chips = page.getByRole('list', { name: 'Ausgewählte Grundformen' }).getByRole('button');
  await expect(chips).toHaveCount(5); await input.fill('kleingeld'); await expect(page.getByRole('listbox')).toHaveCount(0);
  const cat = page.getByRole('button', { name: 'katze entfernen' }); const color = await cat.evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.getByRole('button', { name: 'hund entfernen' }).focus(); await page.keyboard.press('Enter');
  await choose(page, 'kleingeld'); await expect(chips).toHaveCount(5);
  expect(await cat.evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(color);
  await clearWords(page); await expect(page.getByRole('article')).toHaveCount(0);
});

test('a removed word cannot return after its count request completes', async ({ page }) => {
  let release: () => void = () => {}; const pending = new Promise<void>((resolve) => { release = resolve; }); let held = false;
  await page.route('**/stats/counts/*.json', async (route) => {
    const response = await route.fetch(); const data = await response.json();
    if (data.counts.hund) { held = true; await pending; }
    await route.fulfill({ response, json: data }).catch(() => {});
  });
  await page.goto('./'); await choose(page, 'hund'); await expect.poll(() => held).toBe(true);
  await expect(page.getByRole('status')).toContainText('Wortzählungen werden geladen');
  await page.getByRole('button', { name: 'hund entfernen' }).click(); await choose(page, 'münze');
  await expect(page.getByRole('article').locator('mark')).toHaveText(['Münzen']);
  release(); await page.waitForTimeout(150);
  await expect(page.getByRole('button', { name: 'hund entfernen' })).toHaveCount(0);
  await expect(page.getByRole('article')).toHaveCount(1);
});

test('a newer selection owns passages while an earlier text request is pending', async ({ page }) => {
  let release: () => void = () => {}; const pending = new Promise<void>((resolve) => { release = resolve; }); let held = false;
  await page.route('**/episodes/coverage-complete.json', async (route) => { held = true; await pending; await route.continue().catch(() => {}); });
  await page.goto('./'); await choose(page, 'fenster'); await expect.poll(() => held).toBe(true);
  await clearWords(page); await choose(page, 'münze');
  await expect(page.getByRole('article').locator('mark')).toHaveText(['Münzen']);
  release(); await page.waitForTimeout(150);
  await expect(page.getByRole('article')).toHaveCount(1); await expect(page.getByRole('article')).toContainText('Synthetische Beispielfolge');
});

test('statistics choose the detail targets before native top ten and preserve the summed card order', async ({ page }) => {
  let target = -1; let release: () => void = () => {}; const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/stats/catalog.json', async (route) => { const response = await route.fetch(); const data = await response.json(); target = data.episodes.findIndex((episode: { episodeId: string }) => episode.episodeId === 'coverage-single-10'); await route.fulfill({ response, json: data }); });
  await page.route('**/stats/counts/*.json', async (route) => {
    const response = await route.fetch(); const data = await response.json();
    if (data.counts.laterne) await pending;
    if (data.counts.katze) data.counts.katze = [...data.counts.katze.filter(([index]: [number, number]) => index !== target), [target, 500]];
    await route.fulfill({ response, json: data });
  });
  const records: string[] = []; const fragments: string[] = [];
  page.on('request', (request) => { if (/\/episodes\/.+\.json$/.test(request.url())) records.push(new URL(request.url()).pathname.split('/').at(-1)!); if (request.url().endsWith('.pf_fragment')) fragments.push(request.url()); });
  await page.goto('./'); await choose(page, 'laterne'); await choose(page, 'katze'); release();
  const cards = page.getByRole('article'); await expect(cards).toHaveCount(10);
  await expect(cards.first()).toContainText('Einzelne Katze 10'); await expect(cards.first()).toContainText('500 Vorkommen');
  await expect(cards.first().locator('mark')).toHaveText(['Katzen']);
  await expect(cards.getByRole('heading')).toHaveText(['Einzelne Katze 10', 'Paar C', 'Paar D', 'Paar B', 'Paar A', 'Abdeckung vollständig', 'Einzelne Laterne 1', 'Einzelne Katze 2', 'Einzelne Laterne 3', 'Einzelne Katze 4']);
  expect(records.sort()).toEqual(['coverage-single-10.json', 'coverage-pair-c.json', 'coverage-pair-d.json', 'coverage-pair-b.json', 'coverage-pair-a.json', 'coverage-complete.json', 'coverage-single-01.json', 'coverage-single-02.json', 'coverage-single-03.json', 'coverage-single-04.json'].sort());
  expect(fragments).toHaveLength(10);
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await expect(cards.first()).toContainText('Einzelne Katze 10'); expect(records).toHaveLength(10);
});

test('a counted lemma with no lexical passage retains its exact visible card', async ({ page }) => {
  let index = -1;
  await page.route('**/stats/catalog.json', async (route) => { const response = await route.fetch(); const data = await response.json(); index = data.episodes.findIndex((episode: { episodeId: string }) => episode.episodeId === 'coverage-complete'); await route.fulfill({ response, json: data }); });
  await page.route('**/stats/counts/*.json', async (route) => { const response = await route.fetch(); const data = await response.json(); data.counts.hund.push([index, 300]); await route.fulfill({ response, json: data }); });
  await page.goto('./'); await choose(page, 'hund'); const first = page.getByRole('article').first();
  await expect(first).toContainText('Abdeckung vollständig'); await expect(first).toContainText('300 Vorkommen');
  await expect(first).toContainText('die Textsuche findet dazu keine passende Originalpassage');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('zero occurrences load no passages and remain explicit in chronological mode', async ({ page }) => {
  await page.route('**/stats/counts/*.json', async (route) => { const response = await route.fetch(); const data = await response.json(); data.counts.hund = []; await route.fulfill({ response, json: data }); });
  const records: string[] = []; page.on('request', (request) => { if (request.url().includes('/episodes/')) records.push(request.url()); });
  await page.goto('./'); await choose(page, 'hund'); await expect(page.getByRole('status')).toContainText('Keine Vorkommen');
  await expect(page.getByRole('article')).toHaveCount(0); expect(records).toEqual([]);
  await page.getByRole('button', { name: 'Alle', exact: true }).click(); await page.getByText('Diagrammdaten anzeigen', { exact: true }).click();
  await expect(page.getByRole('table', { name: 'Vorkommen nach Folge' }).getByRole('row')).toHaveCount(18);
});

test('a lemma named total does not replace the chart sum or episode metadata', async ({ page }) => {
  await page.route('**/stats/vocabulary.json', async (route) => { const response = await route.fetch(); const data = await response.json(); data.words.find((word: { lemma: string }) => word.lemma === 'hund').lemma = 'total'; await route.fulfill({ response, json: data }); });
  await page.route('**/stats/counts/*.json', async (route) => { const response = await route.fetch(); const data = await response.json(); if (data.counts.hund) data.counts.total = data.counts.hund; await route.fulfill({ response, json: data }); });
  await page.goto('./'); await choose(page, 'total'); await choose(page, 'katze');
  await page.getByText('Diagrammdaten anzeigen', { exact: true }).click();
  const row = page.getByRole('table', { name: 'Vorkommen nach Folge' }).getByRole('row').nth(1);
  await expect(row).toContainText('Titelgeheimnis'); await expect(row.getByRole('cell')).toHaveText(['256', '0', '256']);
});

test('explicit empty detail targets load no Pagefind fragments or episode records', async ({ page }) => {
  const files: string[] = []; page.on('request', (request) => files.push(request.url())); await page.goto('./');
  const found = (await search(page, 'Laterne Katzen Fenster', [])).page!;
  expect(found.results).toEqual([]); expect(found.total).toBe(0);
  expect(files.filter((url) => url.endsWith('.pf_fragment') || /\/episodes\/.+\.json$/.test(url))).toEqual([]);
});
