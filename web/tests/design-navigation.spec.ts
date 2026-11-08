import { expect, test } from '@playwright/test';

test.use({ hasTouch: true });

test('the first screen offers the real podcast identity without loading the search corpus', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Die Podcast Wort Suche', exact: true })).toBeVisible();
  await expect(page.getByText('Finde mit ein paar Schlüsselwörtern zu der gesuchten Folge', { exact: true })).toBeVisible();
  const podcast = page.getByRole('link', { name: /DAS PODCAST UFO.*Florentin Will.*Stefan Titze/ });
  await expect(podcast).toBeVisible();
  const cover = podcast.getByRole('img');
  await expect(cover).toHaveJSProperty('naturalWidth', 320);
  const bounds = await podcast.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(720);
  await expect(page.getByRole('combobox')).toHaveCount(0);
  expect(requests.filter((path) => /\/(stats|search)\/|\/publication\.json$/.test(path))).toEqual([]);
  await podcast.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\?podcast=podcast-ufo$/);
  await expect(page.getByRole('heading', { name: 'DAS PODCAST UFO', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Wörter suchen' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Racoo – Startseite', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('combobox')).toBeVisible();
  await page.getByRole('link', { name: 'Alle Podcasts' }).click();
  await expect(page.getByRole('heading', { name: 'Die Podcast Wort Suche', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('combobox')).toBeVisible();
});

test('mobile podcast selection keeps the first screen and search in the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  const podcast = page.getByRole('link', { name: /DAS PODCAST UFO.*Florentin Will/ });
  const bounds = await podcast.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await podcast.tap();
  const input = page.getByRole('combobox');
  await expect(input).toBeVisible();
  const searchBounds = await input.boundingBox();
  expect(searchBounds!.y + searchBounds!.height).toBeLessThan(350);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(page.getByRole('heading', { name: 'Die Podcast Wort Suche', exact: true })).toHaveCount(0);
});
