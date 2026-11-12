import { expect, test } from '@playwright/test';
import { openExplorer } from './helpers';

test('public results keep only podcast attribution instead of processing diagnostics', async ({ page }) => {
  const transcripts: string[] = [];
  page.on('request', request => { if (/\/episodes\/.+\.json$/.test(request.url())) transcripts.push(request.url()); });
  await openExplorer(page);
  await expect(page.getByText('Datenbestand', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Verarbeitete Folgen und Laufzeiten', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Über die Daten', { exact: true })).toHaveCount(0);
  await expect(page.locator('.transcript-credit')).toHaveText('Inhalte: DAS PODCAST UFO · Maschinelle Transkripte können Fehler enthalten.');
  await expect(page.locator('.podcast-header').getByRole('link', { name: 'Webseite' })).toHaveAttribute('href', 'https://www.daspodcastufo.com/');
  expect(transcripts).toEqual([]);
});
