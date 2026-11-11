import { expect, test } from '@playwright/test';
import { choose } from './helpers';

test.skip(process.env.PW_MULTI_PODCAST !== '1', 'Requires the generated configured-podcast fixture build');

test('configured directory shows coverage and the successful feed date without loading transcripts', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  await page.goto('./');
  const directory = page.getByRole('region', { name: 'Podcasts', exact: true });
  await expect(directory.getByRole('link')).toHaveCount(3);
  await expect(directory).toContainText('1/3 Folgen durchsuchbar (Stand 8.11.2026)');
  expect(requests.some(path => /\/(search|stats)\//.test(path))).toBe(false);
  await directory.getByRole('link', { name: /Zweiter Testpodcast/ }).click();
  await expect(page.getByRole('heading', { name: 'Zweiter Testpodcast', exact: true })).toBeVisible();
  await expect(page.getByText('1/1 Folgen durchsuchbar (Stand 8.11.2026)')).toBeVisible();
  await choose(page, 'hund');
  await expect(page.getByRole('heading', { name: 'Nur im zweiten Podcast', exact: true })).toBeVisible();
  expect(requests.some(path => /podcasts\/podcast-ufo\/(search|stats)\//.test(path))).toBe(false);
  expect(requests.some(path => /podcasts\/second-podcast\/search\//.test(path))).toBe(true);
});

test('legacy episode links locate the correct podcast after reload', async ({ page }) => {
  await page.goto('./?episode=second-episode&t=7');
  await expect(page.getByRole('heading', { name: 'Zweiter Testpodcast', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Wiedergabe: Nur im zweiten Podcast' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('episode')).toBe('second-episode');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Wiedergabe: Nur im zweiten Podcast' })).toBeVisible();
});

test('empty and unknown podcasts have honest states without requesting search data', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', request => requests.push(new URL(request.url()).pathname));
  await page.goto('./?podcast=empty-podcast');
  await expect(page.getByText('0/0 Folgen durchsuchbar (Stand 8.11.2026)')).toBeVisible();
  await expect(page.getByText(/Für diesen Podcast sind noch keine Folgen durchsuchbar/)).toBeVisible();
  expect(requests.some(path => /\/(search|stats)\//.test(path))).toBe(false);
  await page.goto('./?podcast=unknown');
  await expect(page.getByRole('alert')).toContainText('Dieser Podcast ist nicht vorhanden');
});

test('a failed directory load is visible and can be retried', async ({ page }) => {
  await page.route('**/podcasts.json', route => route.fulfill({ status: 503, body: 'offline' }));
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('Die Podcastübersicht konnte nicht geladen werden');
  await page.unroute('**/podcasts.json');
  await page.getByRole('button', { name: 'Podcastübersicht erneut laden' }).click();
  await expect(page.getByRole('link', { name: /Zweiter Testpodcast/ })).toBeVisible();
});
