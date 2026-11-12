import { expect, test } from '@playwright/test';
import { choose, openExplorer } from './helpers';

test('system preference is the first default and a manual choice survives reload and podcast navigation', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Hellmodus einschalten' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('link', { name: /DAS PODCAST UFO/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Dunkelmodus einschalten' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.getByRole('button', { name: 'Hellmodus einschalten' })).toHaveAttribute('aria-pressed', 'true');
});

test('dark mode recolors a loaded reader and minimap without losing query or scroll position', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await openExplorer(page); await choose(page, 'münze');
  const reader = page.getByRole('region', { name: /Transkript:/ });
  await expect(reader).toBeVisible();
  const map = reader.locator('canvas');
  const pixels = () => map.evaluate((canvas: HTMLCanvasElement) => canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data.reduce((hash, value) => ((hash * 31) ^ value) >>> 0, 0));
  await expect.poll(async () => (await pixels()) !== 0).toBe(true);
  const before = await pixels();
  const selected = await reader.locator('mark[data-current=true]').getAttribute('data-hit-id');
  const scroll = await reader.locator('.reader-scroll').evaluate(el => el.scrollTop);
  await page.getByRole('button', { name: 'Dunkelmodus einschalten' }).click();
  await expect(page.getByRole('searchbox')).toHaveValue('münze');
  await expect(reader.locator('mark[data-current=true]')).toHaveAttribute('data-hit-id', selected!);
  expect(await reader.locator('.reader-scroll').evaluate(el => el.scrollTop)).toBe(scroll);
  await expect.poll(pixels).not.toEqual(before);
  const colors = await reader.evaluate(el => ({ card: getComputedStyle(el).backgroundColor, map: getComputedStyle(el.querySelector('.map-surface')!).backgroundColor, ink: getComputedStyle(el).color }));
  expect(colors.card).toBe(colors.map); expect(colors.card).not.toBe('rgb(255, 255, 255)');
  expect(colors.ink).toBe('rgb(236, 242, 238)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Hellmodus einschalten' }).click();
  expect(await reader.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(255, 255, 255)');
});

test('theme remains usable when browser storage is unavailable', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage disabled', 'SecurityError'); } }));
  await page.goto('./');
  await page.getByRole('button', { name: 'Dunkelmodus einschalten' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Hellmodus einschalten' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});
