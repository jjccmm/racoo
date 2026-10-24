import { expect, test } from '@playwright/test';
import type { Route } from '@playwright/test';

function longSilentWav(seconds: number) {
  const samples = 8000 * seconds;
  const bytes = Buffer.alloc(44 + samples, 128);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + samples, 4); bytes.write('WAVE', 8);
  bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(8000, 28);
  bytes.writeUInt16LE(1, 32); bytes.writeUInt16LE(8, 34); bytes.write('data', 36); bytes.writeUInt32LE(samples, 40);
  return bytes;
}

const controlledAudioUrl = `data:audio/wav;base64,${longSilentWav(90).toString('base64')}`;

async function controlledEpisode(route: Route) {
  const response = await route.fetch();
  const episode = await response.json();
  episode.audio.url = controlledAudioUrl;
  return route.fulfill({ response, json: episode });
}

async function coarseEpisode(route: Route) {
  const response = await route.fetch();
  const episode = await response.json();
  const segment = episode.segments[0];
  episode.audio.url = controlledAudioUrl;
  segment.start_seconds = 10;
  segment.end_seconds = 89;
  segment.text += ` ${'Langer weiterer Gesprächskontext. '.repeat(120)}Abschluss des vollständigen Segments.`;
  return route.fulfill({ response, json: episode });
}

async function search(page: import('@playwright/test').Page, query: string) {
  await page.getByRole('textbox', { name: /Stichwort/ }).fill(query);
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('article').first()).toBeVisible();
}

test('repeated terms share one coarse jump with an advertising hint and expandable original text', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/episodes/coverage-complete.json', coarseEpisode);
  await page.goto('./');
  await search(page, 'und');
  const hits = page.getByLabel('Fundstellen in passage').getByRole('button');
  await expect(hits).toHaveCount(1);
  await expect(hits.first()).toContainText('· und');
  await expect(hits.first()).toHaveAccessibleDescription(/Segmentanfang; Werbung/);
  const completeText = page.getByText(/Abschluss des vollständigen Segments\.$/);
  await expect(completeText).toBeHidden();
  await page.getByText('Vollständiges Segment anzeigen', { exact: true }).click();
  await expect(completeText).toBeVisible();

  await search(page, 'Laterne Katzen Fenster');
  await expect(page.getByRole('article').first().getByRole('button', { name: /fenster, katzen, laterne/ })).toHaveCount(1);

  await search(page, 'Grüße');
  const lateHit = page.getByRole('button', { name: /Anhören ab 0:10/ });
  await expect(lateHit).toBeVisible();
  await lateHit.click();
  const media = page.locator('audio');
  await expect.poll(() => media.evaluate((element: HTMLAudioElement) => element.paused)).toBe(false);
  expect(await media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThanOrEqual(10);
  expect(await media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeLessThan(12);
  expect(new URL(page.url()).searchParams.get('episode')).toBe('coverage-complete');
  expect(new URL(page.url()).searchParams.get('t')).toBe('10');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('a shared episode/time link loads the player without autoplay and an unknown identity is explicit', async ({ page }) => {
  await page.route('**/episodes/coverage-complete.json', controlledEpisode);
  await page.goto('./?episode=coverage-complete&t=89');
  await expect(page.getByRole('heading', { name: /Wiedergabe: Abdeckung vollständig/ })).toBeVisible();
  const media = page.locator('audio');
  await expect.poll(() => media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBe(89);
  expect(await media.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  await expect(page.getByRole('link', { name: 'Fundstelle teilen' })).toHaveAttribute('href', /episode=coverage-complete&t=89/);
  await page.getByRole('button', { name: '10 Sekunden vor' }).click();
  expect(await media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBe(90);
  await page.getByRole('button', { name: '10 Sekunden zurück' }).click();
  expect(await media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBe(80);
  await page.goto('./?episode=missing-episode&t=12');
  await expect(page.getByRole('status')).toContainText('Episoden-ID ist im aktuellen Suchstand unbekannt');
  await expect(page.locator('audio')).toHaveCount(0);
});

test('terms in successive transcript segments remain separate Fundstellen with original context', async ({ page }) => {
  await page.goto('./');
  await search(page, 'Münzen Kleingeld');
  const result = page.getByRole('article').filter({ hasText: 'Synthetische Beispielfolge' });
  await expect(result).toHaveCount(1);
  await expect(result).toContainText('Ein Eimer voller Münzen steht neben dem Tisch.');
  await expect(result.getByLabel('Fundstellen in segment-001').getByRole('button')).toContainText('münzen');
  await expect(result).toContainText('Nach einer Pause sprechen wir über Kleingeld.');
  await expect(result.getByLabel('Fundstellen in segment-002').getByRole('button')).toContainText('kleingeld');
});

test('failed audio shows the original episode source and player controls stay within the duration', async ({ page }) => {
  await page.route('https://example.org/fixture.mp3', (route) => route.abort());
  await page.goto('./');
  await search(page, 'Fenster');
  await page.getByRole('article').first().getByRole('button', { name: /Anhören ab/ }).first().click();
  await expect(page.getByRole('alert')).toContainText('Audio nicht verfügbar');
  await expect(page.getByRole('link', { name: 'Zur Episodenseite' })).toHaveAttribute('href', 'https://example.org/coverage-complete');
  const media = page.locator('audio');
  await media.evaluate((element: HTMLAudioElement) => { element.currentTime = 89; });
  await page.getByRole('button', { name: '10 Sekunden vor' }).click();
  expect(await media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeLessThanOrEqual(90);
  await page.getByRole('button', { name: '10 Sekunden zurück' }).click();
  expect(await media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThanOrEqual(0);
});
