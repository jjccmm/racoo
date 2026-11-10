import { expect, test } from '@playwright/test';
import { parseQuery } from '../src/query';
import { choose, clearWords, openExplorer, chartEpisodes, search } from './helpers';

test('normalization preserves order, handles quotes/commas and rejects excess terms', () => {
  expect(parseQuery(' "MÜNZEN", Eimer MÜNZEN Café Cafe\u0301 ', ['eimer'])).toEqual({ terms: ['münzen', 'café'], ignored: ['eimer'] });
  expect(parseQuery('Euro-Münze Wort/Teil')).toEqual({ terms: ['euro-münze', 'wort/teil'], ignored: [] });
  expect(() => parseQuery('eins zwei drei vier fünf sechs')).toThrow(/höchstens fünf/);
});

test('ignored and unknown words have clear states without fake zero/error conflation', async ({ page }) => {
  const details: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.pf_fragment')) details.push(request.url()); });
  await openExplorer(page); await choose(page, 'die und ähm');
  await expect(page.getByRole('status')).toContainText('Ignoriert: die, und, ähm');
  await expect(page.getByText('Ergänze ein aussagekräftiges Stichwort.')).toBeVisible();
  expect(details).toEqual([]);
  await clearWords(page); await choose(page, 'unauffindbareswort');
  await expect(page.getByRole('status')).toContainText('Keine Treffer');
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await expect(chartEpisodes(page)).toHaveCount(17); expect(details).toEqual([]);
  await clearWords(page); await choose(page, 'eins zwei drei vier fünf sechs');
  await expect(page.getByRole('alert')).toContainText('höchstens fünf');
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
