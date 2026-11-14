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

test('normal UFO entry uses Eimer and a deliberately cleared query stays empty on reload', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 }); await page.goto('./');
  await page.getByRole('link', { name: /DAS PODCAST UFO/ }).click();
  await expect(page.getByRole('searchbox', { name: 'Wörter suchen' })).toHaveValue('Eimer');
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('searchbox', { name: 'Wörter suchen' }).fill('');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.reload();
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


test('FAQ is initially collapsed and opens all concise answers using the keyboard', async ({ page }) => {
  await page.goto('./');
  const faq = page.locator('.faq');
  await expect(faq).not.toHaveAttribute('open');
  await expect(faq.getByText('Warum gibt es Racoo?', { exact: true })).not.toBeVisible();
  await faq.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(faq).toHaveAttribute('open', '');
  await expect(faq.locator('dt')).toHaveCount(8);
  await expect(faq).toContainText('unabhängiges Hobbyprojekt');
  await expect(faq).toContainText('±2 Minuten');
  await expect(faq).toContainText('Waschbär');
  await expect(faq).toContainText('Es werden zu viele oder zu wenige Wörter gefunden');
  await expect(faq).toContainText('Kommentar');
  await expect(faq).toContainText('Nomen (Substantive)');
  await expect(faq).toContainText('Die Inhalte stammen von den jeweiligen Podcast-Autorinnen und -Autoren');
  await page.keyboard.press('Enter');
  await expect(faq).not.toHaveAttribute('open');
});
