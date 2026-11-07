import { expect, test } from '@playwright/test';
import { choose, clearWords } from './helpers';
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
  segment.text = segment.text.replace('Signal ', `Signal ${' '.repeat(650)}`);

  return route.fulfill({ response, json: episode });
}

async function search(page: import('@playwright/test').Page, query: string) {
  await clearWords(page);
  for (const lemma of query.toLocaleLowerCase('de-DE').split(' ')) await choose(page, lemma);
  await expect(page.getByRole('article').first().locator('.passage').first()).toBeVisible();
}

test('repeated terms share one coarse jump with an advertising hint and expandable original text', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/episodes/coverage-complete.json', coarseEpisode);
  await page.goto('./?podcast=podcast-ufo');
  await search(page, 'grüße');
  const hits = page.getByLabel('Fundstellen in passage').getByRole('button');
  await expect(hits).toHaveCount(1);
  await expect(hits.first()).toHaveAccessibleName(/· grüße/);
  await expect(hits.first()).toHaveAccessibleDescription(/Segmentanfang; Werbung/);
  const full = page.getByRole('article').locator('.passage details');
  await expect(full.locator('p')).toBeHidden();
  await full.getByText('Vollständiges Segment anzeigen', { exact: true }).click();
  await expect(full.locator('p')).toBeVisible();
  expect((await page.getByRole('article').locator('.passage > p').textContent())!.length).toBeLessThan(500);
  await search(page, 'laterne katze fenster');
  await expect(page.getByRole('article').filter({ hasText: 'Abdeckung vollständig' }).getByRole('button', { name: /fenster, katze, laterne/ })).toHaveCount(1);

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
  const player = await page.getByRole('region', { name: 'Gemeinsamer Audioplayer' }).boundingBox();
  expect(player!.y).toBeGreaterThanOrEqual(0); expect(player!.y + player!.height).toBeLessThanOrEqual(844);
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
  await expect(page.getByRole('status').filter({ hasText: 'Episoden-ID' })).toContainText('Episoden-ID ist im aktuellen Suchstand unbekannt');
  await expect(page.locator('audio')).toHaveCount(0);
});

test('terms in successive transcript segments remain separate Fundstellen with original context', async ({ page }) => {
  await page.goto('./?podcast=podcast-ufo');
  await search(page, 'münze kleingeld');
  const result = page.getByRole('article').filter({ hasText: 'Synthetische Beispielfolge' });
  await expect(result).toHaveCount(1);
  await expect(result).toContainText('Ein Eimer voller Münzen steht neben dem Tisch.');
  await expect(result.getByLabel('Fundstellen in segment-001').getByRole('button')).toHaveAccessibleName(/münze/);
  await expect(result).toContainText('Nach einer Pause sprechen wir über Kleingeld.');
  await expect(result.getByLabel('Fundstellen in segment-002').getByRole('button')).toHaveAccessibleName(/kleingeld/);
});

test('failed audio shows the original episode source and player controls stay within the duration', async ({ page }) => {
  await page.route('https://example.org/fixture.mp3', (route) => route.abort());
  await page.goto('./?podcast=podcast-ufo');
  await search(page, 'fenster');
  await page.getByRole('article').first().getByRole('button', { name: /Anhören ab/ }).first().click();
  await expect(page.getByRole('alert')).toContainText('Audio nicht verfügbar');
  await expect(page.getByRole('link', { name: 'Zur Episodenseite', exact: true })).toHaveAttribute('href', 'https://example.org/coverage-complete');
  const media = page.locator('audio');
  await media.evaluate((element: HTMLAudioElement) => { element.currentTime = 89; });
  await page.getByRole('button', { name: '10 Sekunden vor' }).click();
  expect(await media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeLessThanOrEqual(90);
  await page.getByRole('button', { name: '10 Sekunden zurück' }).click();
  expect(await media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThanOrEqual(0);
});

test('a newer passage playback wins over a pending shared episode link', async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let held = false;
  let released = false;
  await page.route('**/episodes/coverage-complete.json', async (route) => {
    const response = await route.fetch();
    const episode = await response.json();
    episode.audio.url = controlledAudioUrl;
    held = true;
    await pending;
    await route.fulfill({ response, json: episode }).catch(() => {});
    released = true;
  });
  await page.route('**/episodes/synthetic-episode-001.json', controlledEpisode);
  await page.goto('./?episode=coverage-complete&t=68');
  await expect.poll(() => held).toBe(true);
  await expect(page.getByRole('status').filter({ hasText: 'Geteilte Folge wird geladen' })).toBeVisible();
  await choose(page, 'münze');
  await page.getByRole('article').getByRole('button', { name: /Anhören ab 0:10/ }).click();
  const player = page.getByRole('region', { name: 'Gemeinsamer Audioplayer' });
  await expect(player.getByRole('heading')).toContainText('Synthetische Beispielfolge');
  await expect(page.getByRole('status').filter({ hasText: 'Geteilte Folge wird geladen' })).toHaveCount(0);
  release();
  await expect.poll(() => released).toBe(true);
  await page.waitForTimeout(150); // Observe any late shared-link response after the newer play action.
  await expect(player.getByRole('heading')).toContainText('Synthetische Beispielfolge');
  await expect(page.getByRole('status').filter({ hasText: 'Geteilte Folge wird geladen' })).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get('episode')).toBe('synthetic-episode-001');
  expect(new URL(page.url()).searchParams.get('t')).toBe('10');
  await expect(player.getByRole('link', { name: 'Fundstelle teilen' })).toHaveAttribute('href', /episode=synthetic-episode-001&t=10/);
  const media = player.locator('audio');
  await expect.poll(() => media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThanOrEqual(10);
  expect(await media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeLessThan(15);
});
