import { expect, test } from '@playwright/test';
import { parseQuery } from '../src/query';
import { choose, clearWords, openExplorer, chartEpisodes, search } from './helpers';

test('normalization preserves order, handles quotes/commas and rejects excess terms', () => {
  expect(parseQuery(' "MÜNZEN", Eimer MÜNZEN Café Cafe\u0301 ')).toEqual({ terms: ['münzen', 'eimer', 'café'] });
  expect(parseQuery('Euro-Münze Wort/Teil')).toEqual({ terms: ['euro-münze', 'wort/teil'] });
  expect(parseQuery('die und ähm').terms).toEqual(['die', 'und', 'ähm']);
  expect(parseQuery('eins zwei drei vier fünf sechs sieben acht neun zehn').terms).toHaveLength(10);
  expect(() => parseQuery('eins zwei drei vier fünf sechs sieben acht neun zehn elf')).toThrow(/höchstens zehn/);
});

test('common and unknown words are searched without fake zero/error conflation', async ({ page }) => {
  const details: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.pf_fragment')) details.push(request.url()); });
  await openExplorer(page); await choose(page, 'dem');
  await expect(page.getByRole('article').first().locator('.reader-legend')).toContainText('dem');
  await expect(page.getByText(/Ignoriert:/)).toHaveCount(0);
  await expect(page.getByRole('article').first().locator('.transcript-reader')).toBeVisible();
  expect(details.length).toBeGreaterThan(0);
  details.length = 0;
  await clearWords(page); await choose(page, 'unauffindbareswort');
  await expect(page.getByRole('status')).toContainText('Keine Treffer');
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await expect(chartEpisodes(page)).toHaveCount(17); expect(details).toEqual([]);
  await clearWords(page); await choose(page, 'eins zwei drei vier fünf sechs sieben acht neun zehn elf');
  await expect(page.getByRole('alert')).toContainText('höchstens zehn');
});

test('a newer submitted query owns results while older details are pending', async ({ page }) => {
  let release: () => void = () => {}; const held = new Promise<void>(resolve => { release = resolve; }); let requested = false;
  await page.route('**/episodes/coverage-complete.json', async route => { requested = true; await held; await route.continue().catch(() => {}); });
  await openExplorer(page); await choose(page, 'fenster'); await expect.poll(() => requested).toBe(true);
  await clearWords(page); await choose(page, 'münze');
  await expect(page.getByRole('article')).toContainText('Synthetische Beispielfolge');
  release(); await page.waitForTimeout(100);
  await expect(page.getByRole('article')).not.toContainText('Abdeckung vollständig');
});

test('an explicit empty detail scope downloads no fragments or records', async ({ page }) => {
  const details: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.pf_fragment') || /\/episodes\/.+\.json$/.test(request.url())) details.push(request.url()); });
  await page.goto('./');
  expect((await search(page, 'Münze', [])).page!.results).toEqual([]);
  expect(details).toEqual([]);
});


test('ten terms have colors and only an eleventh term displays the limit hint', async ({ page }) => {
  await openExplorer(page);
  const input = page.getByRole('searchbox');
  const query = 'münze kleingeld eimer tisch pause sprechen wir einer dem ein';
  await expect(page.locator('#search-help')).toHaveCount(0);
  await input.fill(query);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  const legend = page.locator('.chart-legend li');
  await expect(legend).toHaveCount(10);
  const colors = await legend.evaluateAll(elements => elements.map(element => getComputedStyle(element).getPropertyValue('--word-color').trim()));
  expect(new Set(colors).size).toBe(10); expect(colors.every(color => /^#[0-9a-f]{6}$/i.test(color))).toBe(true);
  await input.fill(`${query} urlaub`);
  await expect(page.getByRole('alert')).toContainText('höchstens zehn');
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await input.fill(query);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
