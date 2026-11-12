import { expect, test } from '@playwright/test';

test('landing demo is free text, highlights its explanation and loads no podcast index', async ({ page }) => {
  const requests: string[] = []; page.on('request', request => requests.push(request.url()));
  await page.goto('./');
  const field = page.getByRole('searchbox', { name: 'Wörter im Beispieltext suchen' });
  await expect(field).toHaveValue('Die Podcast Wort Suche');
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await expect(page.locator('.demo-explanation mark')).not.toHaveCount(0);
  await field.fill('Folge');
  await expect(page.locator('.demo-explanation mark')).toHaveText(['Folge', 'Folgen']);
  expect(requests.some(url => /\/(search|stats)\//.test(url))).toBe(false);
  await page.getByRole('link', { name: /DAS PODCAST UFO/ }).click();
  await expect(page.getByRole('searchbox', { name: 'Wörter suchen' })).toHaveValue('Folge');
  expect(new URL(page.url()).searchParams.get('q')).toBe('Folge');
});

test('unmodified demo is not a real query and mobile entry stays within the screen', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 }); await page.goto('./');
  await page.getByRole('link', { name: /DAS PODCAST UFO/ }).click();
  await expect(page.getByRole('searchbox', { name: 'Wörter suchen' })).toHaveValue('');
  await expect(page.getByRole('article')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});


test('the mascot favicon resolves at the current deployment base', async ({ page }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="icon"]').getAttribute('href');
  const response = await page.request.get(new URL(href!, page.url()).href);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
  const icon = await response.text();
  expect(icon).toContain('viewBox="105 10 700 700"');
  expect(icon).toContain('data:image/png;base64,');
});
