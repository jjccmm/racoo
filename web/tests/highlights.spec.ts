import { expect, test } from '@playwright/test';
import { choose, search, openExplorer } from './helpers';

/** A real controlled Pagefind index at the publication's HTTP boundary. */
import { controlledText } from './highlights-fixture';

test('native positions mark whole original Unicode and compound tokens, merging shared term ranges', async ({ page }) => {
  await page.goto('./'); const segments = await controlledText(page);
  const found = (await search(page, 'Münze Euro Wort Teil Straße', ['synthetic-episode-001'])).page!;
  expect(found.results).toHaveLength(1);
  const passages = found.results[0].passages;
  expect(passages.map((passage) => passage.id)).toEqual(['unicode', 'final']);
  expect(passages[0].highlights.map((range) => passages[0].text.slice(range.start, range.end))).toEqual(['Münzen', 'Euro-Münze', 'Wort/Teil', 'Straße']);
  expect(passages[0].highlights.find((range) => passages[0].text.slice(range.start, range.end) === 'Wort/Teil')!.terms).toEqual(['teil', 'wort']);
  expect(passages[0].text).toBe(segments[0].text);
  expect(passages[1].highlights.map((range) => passages[1].text.slice(range.start, range.end))).toEqual(['Münze']);
});

test('original text renders safely as text with the selected word color', async ({ page }) => {
  await openExplorer(page); await controlledText(page); await choose(page, 'münze');
  const card = page.getByRole('article');
  await expect(card.locator('mark')).toHaveText(['Münzen', 'Euro-Münze', 'Münze']);
  await expect(card).toContainText('<img src=x onerror=alert(1)>'); await expect(card.locator('img')).toHaveCount(0);
  const chipColor = await page.getByRole('list', { name: 'Wörter im Diagramm' }).locator('li').first().evaluate((element) => getComputedStyle(element).getPropertyValue('--word-color'));
  expect(await card.locator('mark').first().evaluate((element) => getComputedStyle(element).getPropertyValue('--word-color'))).toBe(chipColor);
});

test('a source/index mismatch keeps exact counts and offers a passage retry without invented highlights', async ({ page }) => {
  await page.route('**/episodes/synthetic-episode-001.json', async (route) => {
    const response = await route.fetch(); const data = await response.json(); data.segments[0].text = 'Anderer Text mit falschen Positionen.'; await route.fulfill({ response, json: data });
  });
  await openExplorer(page); await choose(page, 'münze');
  await expect(page.getByRole('alert')).toContainText('Originalpassagen konnten nicht geladen werden');
  await expect(page.getByRole('article')).toContainText('1 Suchwort-Treffer'); await expect(page.locator('mark')).toHaveCount(0);
  await page.unroute('**/episodes/synthetic-episode-001.json'); await page.getByRole('button', { name: 'Passagen erneut laden' }).click();
  await expect(page.locator('mark')).toHaveText(['Münzen']);
});

test('complete original transcripts are directly open without duplicate excerpts', async ({ page }) => {
  await openExplorer(page); const segments = await controlledText(page, true); await choose(page, 'münze');
  const card = page.getByRole('article');
  await expect(card.locator('.passage')).toHaveCount(0);
  await expect(card.getByRole('button', { name: /Transkript öffnen/ })).toHaveCount(0);
  const reader = card.getByRole('region', { name: /Transkript:/ });
  await expect(reader.locator('.reader-segment')).toHaveCount(4);
  expect((await reader.locator('.reader-segment').nth(2).locator('p').allTextContents()).join('')).toBe(segments[2].text);
  await expect(reader.locator('mark')).toHaveCount(5);
  await expect(reader.getByRole('scrollbar')).toHaveAttribute('aria-orientation', 'vertical');
});

test('counts use every native position including repeats and shared compound tokens', async ({ page }) => {
  await page.goto('./'); await controlledText(page);
  const details: string[] = []; page.on('request', request => { if (request.url().endsWith('.pf_fragment')) details.push(request.url()); });
  const found = await page.evaluate(async () => {
    const manifest = await (await fetch('.vite/manifest.json')).json();
    const api = await import(new URL(manifest['src/search.ts'].file, location.href).href);
    return api.countEpisodes(['münze', 'euro', 'wort', 'teil', 'straße'], new AbortController().signal, './');
  });
  expect(found.episodes[0].counts).toEqual({ münze: 3, euro: 1, wort: 1, teil: 1, straße: 1 });
  expect(found.episodes[0].uniqueCount).toBe(5); expect(details).toEqual([]);
});
