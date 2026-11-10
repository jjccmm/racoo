import { expect, test } from '@playwright/test';
import { choose, clearWords, openExplorer, chartEpisodes } from './helpers';
import { controlledText } from './highlights-fixture';

test('free text produces complete summed stacks, exact per-term labels and chronological zeros', async ({ page }) => {
  await openExplorer(page);
  await expect(page.getByRole('searchbox')).toHaveValue('');
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await choose(page, 'Laterne Katzen Fenster');
  await expect(chartEpisodes(page)).toHaveCount(10);
  await expect(page.getByRole('article')).toHaveCount(10);
  const labels = await chartEpisodes(page).evaluateAll(elements => elements.map(element => element.getAttribute('aria-label')!));
  const sums = labels.map(label => Number(/Summe: (\d+)/.exec(label)![1]));
  expect(sums).toEqual([...sums].sort((a, b) => b - a));
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await expect(chartEpisodes(page)).toHaveCount(17);
  await expect(chartEpisodes(page).filter({ hasText: 'Titelgeheimnis' })).toHaveAccessibleName(/Titelgeheimnis.*; laterne: 0; katzen: 0; fenster: 0; Summe: 0/);
  const expected = await page.evaluate(async () => (await (await fetch('catalog.json')).json()).episodes.sort((a: { publishedAt: string; episodeId: string }, b: { publishedAt: string; episodeId: string }) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || a.episodeId.localeCompare(b.episodeId)).map((episode: { title: string }) => episode.title));
  expect((await chartEpisodes(page).evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')!.split(';')[0])))).toEqual(expected);
  expect(await page.getByRole('article').count()).toBe(10);
});

test('overlapping terms keep independent series but one highlighted position', async ({ page }) => {
  await openExplorer(page); await choose(page, 'Münze Münzen');
  const card = page.getByRole('article');
  await expect(card).toContainText('2 Suchwort-Treffer');
  await expect(card.locator('.episode-counts')).toContainText('2/2 Suchwörter');
  await expect(card.locator('mark')).toHaveCount(1);
  await card.getByRole('button', { name: /Transkript öffnen · 1 Fundstelle/ }).click();
  const reader = card.getByRole('region', { name: /Transkript:/ });
  await expect(reader.locator('mark')).toHaveCount(1);
  await expect(reader.locator('mark')).toHaveAttribute('data-terms', 'münze münzen');
  await expect(reader.getByRole('status')).toContainText('1 Fundstelle');
  await clearWords(page); await expect(page.getByRole('article')).toHaveCount(0);
});

test('a term named total cannot overwrite the chart sum or metadata', async ({ page }) => {
  await openExplorer(page); await controlledText(page); await choose(page, 'total');
  await expect(chartEpisodes(page)).toHaveCount(1);
  await expect(chartEpisodes(page)).toHaveAccessibleName(/Synthetische Beispielfolge.*; total: 2; Summe: 2/);
});
