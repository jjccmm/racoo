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
  await expect(card.locator('.episode-summary')).toContainText('2/2 Suchwörter');
  await expect(card.locator('mark')).toHaveCount(1);
  const reader = card.getByRole('region', { name: /Transkript:/ });
  await expect(reader.locator('mark')).toHaveCount(1);
  await expect(reader.locator('mark')).toHaveAttribute('data-terms', 'münze münzen');
  await expect(reader.getByRole('status')).toContainText('1/1');
  await clearWords(page); await expect(page.getByRole('article')).toHaveCount(0);
});

test('a term named total cannot overwrite the chart sum or metadata', async ({ page }) => {
  await openExplorer(page); await controlledText(page); await choose(page, 'total');
  await expect(chartEpisodes(page)).toHaveCount(1);
  await expect(chartEpisodes(page)).toHaveAccessibleName(/Synthetische Beispielfolge.*; total: 2; Summe: 2/);
});


for (const width of [320, 390, 1280]) {
  test(`both chart modes fit the viewport without scrolling at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); await openExplorer(page); await choose(page, 'Laterne Katzen Fenster');
    const chart = page.locator('.frequency-chart-scroll');
    await expect(chartEpisodes(page)).toHaveCount(10);
    for (const mode of ['Top 10', 'Alle']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      await expect(chartEpisodes(page)).toHaveCount(mode === 'Alle' ? 17 : 10);
      await expect(page.locator('.episode-axis-label').first()).toBeVisible();
      expect(await chart.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
      expect(await page.locator('.frequency-chart').evaluate(element => element.getBoundingClientRect().width <= element.parentElement!.clientWidth + 1)).toBe(true);
    }
    await expect(page.getByText(/Im Diagramm seitlich scrollen/)).toHaveCount(0);
  });
}
