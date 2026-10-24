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

const different = wav(120);

test('advertising may change online duration while shared jumps and player controls remain usable', async ({ page }) => {
  await page.route('**/episodes/coverage-complete.json', async (route) => {
    const response = await route.fetch();
    const episode = await response.json();
    episode.audio.url = `data:audio/wav;base64,${different.toString('base64')}`;
    episode.audio.duration_seconds = 90;
    await route.fulfill({ response, json: episode });
  });
  await page.goto('./?episode=coverage-complete&t=68');
  const media = page.locator('audio');
  await expect.poll(() => media.evaluate((e: HTMLAudioElement) => e.duration)).toBe(120);
  await expect.poll(() => media.evaluate((e: HTMLAudioElement) => e.currentTime)).toBe(68);
  expect(await media.evaluate((e: HTMLAudioElement) => e.paused)).toBe(true);
  await expect(page.getByRole('button', { name: '10 Sekunden vor' })).toBeEnabled();
  await page.getByRole('button', { name: '10 Sekunden vor' }).click();
  expect(await media.evaluate((e: HTMLAudioElement) => e.currentTime)).toBe(78);
  await expect(page.getByRole('region', { name: 'Gemeinsamer Audioplayer' })).toContainText('Werbung');
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
