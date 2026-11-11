import { expect, test } from '@playwright/test';
import { choose, clearWords, openExplorer } from './helpers';
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
  await expect(page.getByRole('article').first().locator('.transcript-reader').first()).toBeVisible();
}

test('repeated terms share one coarse jump and original text with a player advertising hint', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('**/episodes/coverage-complete.json', coarseEpisode);
  await openExplorer(page);
  await search(page, 'grüße');
  const hits = page.getByRole('article').getByRole('button', { name: 'Anhören ab 0:10', exact: true });
  await expect(hits).toHaveCount(1);
  await expect(hits.first()).toHaveAccessibleName('Anhören ab 0:10');
  await expect(page.locator('.reader-caption')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Vollständiger Transkripttext' })).toContainText('Signal');
  await expect(page.getByRole('article').locator('.passage')).toHaveCount(0);
  await search(page, 'laterne katze fenster');
  const complete = page.getByRole('article').filter({ hasText: 'Abdeckung vollständig' });
  await complete.scrollIntoViewIfNeeded();
  await expect(complete.getByRole('button', { name: 'Anhören ab 0:10', exact: true })).toHaveCount(1);

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
  await expect(page.getByRole('link', { name: 'Fundstelle teilen' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Gemeinsamer Audioplayer' }).locator('p').first()).toHaveText('Werbung kann die Zeit in der Online-Audiodatei verschieben.');
  await page.goto('./?episode=missing-episode&t=12');
  await expect(page.getByRole('status').filter({ hasText: 'Episoden-ID' })).toContainText('Episoden-ID ist im aktuellen Suchstand unbekannt');
  await expect(page.locator('audio')).toHaveCount(0);
});

test('terms in successive transcript segments remain separate Fundstellen with original context', async ({ page }) => {
  await openExplorer(page);
  await search(page, 'münze kleingeld');
  const result = page.getByRole('article').filter({ hasText: 'Synthetische Beispielfolge' });
  await expect(result).toHaveCount(1);
  await expect(result).toContainText('Ein Eimer voller Münzen steht neben dem Tisch.');
  await expect(result.getByRole('button', { name: 'Anhören ab 0:10', exact: true })).toBeVisible();
  await expect(result).toContainText('Nach einer Pause sprechen wir über Kleingeld.');
  await expect(result.getByRole('button', { name: 'Anhören ab 1:00', exact: true })).toBeVisible();
});

test('failed audio shows the original episode source in the minimal player', async ({ page }) => {
  await page.route('https://example.org/fixture.mp3', (route) => route.abort());
  await openExplorer(page);
  await search(page, 'fenster');
  await page.getByRole('article').first().getByRole('button', { name: /Anhören ab/ }).first().click();
  await expect(page.getByRole('alert')).toContainText('Audio nicht verfügbar');
  await expect(page.getByRole('link', { name: 'Zur Episodenseite', exact: true })).toHaveAttribute('href', 'https://example.org/coverage-complete');
  await expect(page.getByRole('region', { name: 'Gemeinsamer Audioplayer' }).getByRole('button')).toHaveCount(1);
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
  await openExplorer(page, './?episode=coverage-complete&t=68');
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
  await expect(player.getByRole('link', { name: 'Fundstelle teilen' })).toHaveCount(0);
  const media = player.locator('audio');
  await expect.poll(() => media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeGreaterThanOrEqual(10);
  expect(await media.evaluate((element: HTMLAudioElement) => element.currentTime)).toBeLessThan(15);
});


test('episode header plays from zero; closing stops, releases and can reopen audio', async ({ page }) => {
  await page.route('**/episodes/synthetic-episode-001.json', controlledEpisode);
  await openExplorer(page); await choose(page, 'münze');
  const card = page.getByRole('article'); const start = card.getByRole('button', { name: 'Folge von Anfang abspielen' });
  await expect(start).toHaveText('');
  await expect(start).toBeEnabled(); await start.click();
  const closeButton = page.getByRole('button', { name: 'Player schließen' });
  const centers = await closeButton.evaluate(element => {
    const button = element.getBoundingClientRect(), icon = element.querySelector('svg')!.getBoundingClientRect();
    return { x: Math.abs(button.x + button.width / 2 - icon.x - icon.width / 2), y: Math.abs(button.y + button.height / 2 - icon.y - icon.height / 2) };
  });
  expect(centers.x).toBeLessThan(1); expect(centers.y).toBeLessThan(1);
  const player = page.getByRole('region', { name: 'Gemeinsamer Audioplayer' });
  await expect.poll(() => player.locator('audio').evaluate((element: HTMLAudioElement) => element.paused)).toBe(false);
  const media = await player.locator('audio').elementHandle();
  expect(new URL(page.url()).searchParams.get('t')).toBe('0');
  await player.getByRole('button', { name: 'Player schließen' }).click();
  await expect(player).toHaveCount(0);
  expect(await media!.evaluate((element: HTMLAudioElement) => element.paused)).toBe(true);
  expect(await media!.getAttribute('src')).toBeNull();
  expect(new URL(page.url()).searchParams.get('episode')).toBeNull();
  expect(new URL(page.url()).searchParams.get('q')).toBe('münze');
  await expect(start).toBeFocused();
  await start.click(); await expect(player).toBeVisible();
  await expect.poll(() => player.locator('audio').evaluate((element: HTMLAudioElement) => element.paused)).toBe(false);
});

test('closing before audio metadata arrives cannot reopen the player', async ({ page }) => {
  let release: () => void = () => {}; const pending = new Promise<void>(resolve => { release = resolve; }); let requested = false;
  await page.route('https://example.org/synthetic-audio.mp3', async route => {
    requested = true; await pending;
    await route.fulfill({ contentType: 'audio/wav', body: longSilentWav(90) }).catch(() => {});
  });
  await openExplorer(page); await choose(page, 'münze');
  await page.getByRole('article').getByRole('button', { name: 'Folge von Anfang abspielen' }).click();
  await expect.poll(() => requested).toBe(true);
  await page.getByRole('button', { name: 'Player schließen' }).click(); release();
  await page.waitForTimeout(150);
  await expect(page.getByRole('region', { name: 'Gemeinsamer Audioplayer' })).toHaveCount(0);
  await expect(page.locator('audio')).toHaveCount(0);
});
