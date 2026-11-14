import { expect, test } from '@playwright/test';
import { choose, openExplorer } from './helpers';
import { controlledText } from './highlights-fixture';

test('options explain native top-ten forms without changing standard counts, then exact uses original words', async ({ page }) => {
  await openExplorer(page); await controlledText(page); await choose(page, 'Münze');
  const card = page.getByRole('article');
  await expect(card.locator('mark')).toHaveText(['Münzen', 'Euro-Münze', 'Münze']);
  await expect(card).toContainText('3 Suchwort-Treffer');
  await page.getByRole('button', { name: 'Suchoptionen', exact: true }).click();
  const options = page.getByRole('region', { name: 'Suchoptionen', exact: true });
  await expect(options.getByRole('button', { name: 'Standard', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const variants = options.getByRole('region', { name: 'Gefundene Wörter: Münze' });
  await expect(variants.locator('li')).toHaveCount(3);
  await expect(variants.getByRole('button')).toHaveCount(0);
  await expect(card).toContainText('3 Suchwort-Treffer');
  await options.getByLabel('Suchmodi erklärt').click();
  const popup = page.getByRole('dialog', { name: 'Die Suchmodi' });
  await expect(popup).toBeVisible();
  await expect(popup).toContainText('exakte Übereinstimmungen');
  await expect(popup).not.toContainText('vollständige Wörter');
  await page.keyboard.press('Escape');
  await expect(popup).not.toBeVisible();
  await expect(options.getByLabel('Suchmodi erklärt')).toBeFocused();
  await options.getByRole('button', { name: 'Exakt', exact: true }).click();
  await expect(card).toContainText('1 Suchwort-Treffer');
  await expect(card.locator('mark')).toHaveText(['Münze']);
  await expect(variants.locator('li')).toHaveText(['Münze1']);
  await expect(page.getByRole('button', { name: 'Alle', exact: true })).toBeDisabled();
  await expect(page).toHaveURL(/match=exact/);
  await options.getByRole('button', { name: 'Standard', exact: true }).click();
  await expect(card.locator('mark')).toHaveText(['Münzen', 'Euro-Münze', 'Münze']);
  await expect(page.getByRole('button', { name: 'Alle', exact: true })).toBeEnabled();
});

test('exact scans only the fixed top ten and never fetches candidates outside them', async ({ page }) => {
  await page.goto('./');
  const requests: string[] = [];
  page.on('request', request => { if (/\/episodes\/.+\.json$/.test(request.url())) requests.push(decodeURIComponent(request.url().split('/episodes/')[1].replace('.json', ''))); });
  const result = await page.evaluate(async () => {
    const manifest = await (await fetch('.vite/manifest.json')).json();
    const api = await import(new URL(manifest['src/search.ts'].file, location.href).href) as typeof import('../src/search');
    const terms = ['laterne', 'katzen', 'fenster']; const signal = new AbortController().signal;
    const overview = await api.countEpisodes(terms, signal, './');
    const ids = [...overview.episodes].sort((a, b) => Object.values(b.counts).reduce((n, c) => n + c, 0) - Object.values(a.counts).reduce((n, c) => n + c, 0) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.episodeId.localeCompare(b.episodeId)).slice(0, 10).map(row => row.episodeId);
    const publication = await (await fetch('publication.json')).json();
    const details = await api.inspectTopEpisodes(terms, ids, 'exact', signal, './', publication.publicationId);
    let oversizedRejected = false;
    try { await api.inspectTopEpisodes(terms, overview.episodes.slice(0, 11).map(row => row.episodeId), 'exact', signal, './', publication.publicationId); } catch { oversizedRejected = true; }
    return { ids, all: overview.episodes.length, details, oversizedRejected };
  });
  expect(result.all).toBeGreaterThan(10); expect(result.ids).toHaveLength(10);
  expect([...new Set(requests)].sort()).toEqual([...result.ids].sort());
  expect(result.details.results.map(row => row.episodeId).sort()).toEqual([...result.ids].sort());
  expect(result.details.results.find(row => row.title === 'Paar B')?.positionsByTerm.katzen).toHaveLength(3);
  expect(result.oversizedRejected).toBe(true);
});

test('exact empty state and Unicode word boundaries retain the input spelling', async ({ page }) => {
  await openExplorer(page); await controlledText(page); await choose(page, 'MÜNZE');
  await page.getByRole('button', { name: 'Suchoptionen', exact: true }).click();
  await page.getByRole('button', { name: 'Exakt', exact: true }).click();
  await expect(page.getByRole('article').locator('mark')).toHaveText(['Münze']);
  await expect(page.getByRole('region', { name: 'Gefundene Wörter: MÜNZE' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByLabel('Suchmodi erklärt').click();
  const popup = page.getByRole('dialog', { name: 'Die Suchmodi' });
  expect((await popup.locator('p').first().boundingBox())!.width).toBeGreaterThan(180);
  await popup.getByRole('button', { name: 'Erklärung schließen' }).click();
  await expect(popup).not.toBeVisible();
  await page.getByRole('button', { name: 'Dunkelmodus einschalten' }).click();
  await page.getByLabel('Suchmodi erklärt').click();
  await expect(popup).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole('searchbox', { name: 'Wörter suchen' }).fill('Wort');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByText('Keine Treffer für diese Stichwörter.', { exact: true })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Wörter suchen' }).fill('Euro-Münze Café Straße');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('article').locator('mark')).toHaveText(['Euro-Münze', 'Café', 'Straße']);
});

test('exact download failure stays an error and can be retried', async ({ page }) => {
  await page.route('**/episodes/synthetic-episode-001.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await openExplorer(page, './?podcast=podcast-ufo&q=Münzen&match=exact');
  await expect(page.getByRole('alert')).toContainText('Suche konnte nicht ausgeführt werden');
  await expect(page.getByText('Keine Treffer für diese Stichwörter.', { exact: true })).toHaveCount(0);
  await page.unroute('**/episodes/synthetic-episode-001.json');
  await page.getByRole('button', { name: 'Suche erneut laden', exact: true }).click();
  await expect(page.getByRole('article').locator('mark')).toHaveText(['Münzen']);
});
