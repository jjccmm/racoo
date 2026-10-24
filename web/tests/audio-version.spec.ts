import { createHash } from 'node:crypto';
import { expect, test } from '@playwright/test';

function wav(seconds: number) {
  const samples = 8000 * seconds;
  const bytes = Buffer.alloc(44 + samples, 128);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(36 + samples, 4); bytes.write('WAVE', 8);
  bytes.write('fmt ', 12); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(8000, 24); bytes.writeUInt32LE(8000, 28);
  bytes.writeUInt16LE(1, 32); bytes.writeUInt16LE(8, 34); bytes.write('data', 36); bytes.writeUInt32LE(samples, 40);
  return bytes;
}

const reference = wav(90);
const different = wav(120);

test('changed online audio cannot silently seek on the transcript timeline; exact local bytes restore playback', async ({ page }) => {
  await page.route('**/episodes/coverage-complete.json', async (route) => {
    const response = await route.fetch();
    const episode = await response.json();
    episode.audio.url = `data:audio/wav;base64,${different.toString('base64')}`;
    episode.audio.sha256 = createHash('sha256').update(reference).digest('hex');
    episode.audio.duration_seconds = 90;
    await route.fulfill({ response, json: episode });
  });
  await page.goto('./?episode=coverage-complete&t=68');
  const media = page.locator('audio');
  await expect.poll(() => media.evaluate((e: HTMLAudioElement) => e.duration)).toBe(120);
  await expect(page.getByRole('alert')).toContainText('abweichende Audiofassung');
  expect(await media.evaluate((e: HTMLAudioElement) => e.currentTime)).toBe(0);
  expect(await media.evaluate((e: HTMLAudioElement) => e.paused)).toBe(true);
  await expect(page.getByRole('button', { name: '10 Sekunden vor' })).toBeDisabled();

  const file = page.getByLabel('Transkribierte Audiodatei öffnen');
  await file.setInputFiles({ name: 'wrong.wav', mimeType: 'audio/wav', buffer: different });
  await expect(page.getByRole('alert')).toContainText('Datei stimmt nicht mit dem Transkript überein');
  await file.setInputFiles({ name: 'exact.wav', mimeType: 'audio/wav', buffer: reference });
  await expect(page.getByText('Audiofassung anhand der Datei bestätigt.')).toBeVisible();
  await expect.poll(() => media.evaluate((e: HTMLAudioElement) => e.currentTime)).toBe(68);
  expect(await media.evaluate((e: HTMLAudioElement) => e.paused)).toBe(true);
  await expect(page.getByRole('button', { name: '10 Sekunden vor' })).toBeEnabled();
});
