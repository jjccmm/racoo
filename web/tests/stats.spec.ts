import { expect, test } from '@playwright/test';

test('episode processing timings use the compact catalog without loading transcripts', async ({ page }) => {
  const transcripts: string[] = [];
  page.on('request', (request) => { if (/\/episodes\/.+\.json$/.test(request.url())) transcripts.push(request.url()); });
  await page.route('**/stats/catalog.json', async (route) => {
    const response = await route.fetch();
    const catalog = await response.json();
    const episode = catalog.episodes.find((entry: { episodeId: string }) => entry.episodeId === 'coverage-complete');
    episode.durationSeconds = 3665.25;
    episode.timings = { downloadSeconds: 2.4, transcriptionSeconds: 140.5, totalSeconds: 149.8 };
    const legacy = catalog.episodes.find((entry: { episodeId: string }) => entry.episodeId === 'synthetic-episode-001');
    delete legacy.durationSeconds;
    delete legacy.timings;
    return route.fulfill({ response, json: catalog });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await page.getByText('Verarbeitete Folgen und Laufzeiten', { exact: true }).click();
  const overview = page.getByRole('table', { name: 'Verarbeitete Folgen und Laufzeiten' });
  const measured = overview.getByRole('row').filter({ hasText: 'Abdeckung vollständig' });
  await expect(measured.getByRole('cell')).toHaveText(['1:01:05', '2,4 s', '140,5 s', '149,8 s']);
  const legacy = overview.getByRole('row').filter({ hasText: 'Synthetische Beispielfolge' });
  await expect(legacy.getByRole('cell')).toHaveText(['Nicht erfasst', 'Nicht erfasst', 'Nicht erfasst', 'Nicht erfasst']);
  expect(transcripts).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
