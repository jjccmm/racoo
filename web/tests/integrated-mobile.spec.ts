import { expect, test } from '@playwright/test';
import { choose, openExplorer } from './helpers';

test('mobile visitors can use search, the shared player, and both statistics views without page overflow', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://example.org/fixture.mp3', (route) => route.abort());

  const requests: string[] = [];
  page.on('request', (request) => requests.push(new URL(request.url()).pathname));
  await openExplorer(page);

  await page.getByText('Über die Daten', { exact: true }).click();
  await expect(page.getByLabel('Veröffentlichungsstand')).toContainText('synthetic-podcast');
  await choose(page, 'münze');
  const result = page.getByRole('article').filter({ hasText: 'Synthetische Beispielfolge' });
  await expect(result).toBeVisible();
  await result.getByRole('button', { name: /Anhören ab/ }).click();
  await expect(page.getByRole('region', { name: 'Gemeinsamer Audioplayer' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Audio nicht verfügbar');

  await expect(page.getByRole('region', { name: 'Grundformvergleich' })).toBeVisible();
  await expect(page.getByText('Diagrammdaten anzeigen', { exact: true })).toHaveCount(0);
  await page.getByText('Gesamtwörter und Wortschatz', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Wortentwicklung öffnen' }).click();
  await expect(page.getByRole('table', { name: 'Chronologische Wortentwicklung je Folge' })).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
  expect(dimensions.body).toBeLessThanOrEqual(dimensions.viewport);
  expect(requests.some((path) => path.endsWith('/stats/vocabulary.json'))).toBe(true);
  expect(requests.some((path) => path.endsWith('/stats/catalog.json'))).toBe(true);
  await expect(page.getByRole('link', { name: 'Fundstelle teilen' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('word-explorer-mobile-integrated.png'), fullPage: true });
});

test('direct episode/time links and production assets work at the selected deployment base', async ({ page }) => {
  await page.route('https://example.org/fixture.mp3', (route) => route.abort());
  const failed: string[] = [];
  page.on('requestfailed', (request) => failed.push(request.url()));
  await page.goto('./?episode=coverage-complete&t=12');

  await expect(page.getByRole('heading', { name: /Wiedergabe: Abdeckung vollständig/ })).toBeVisible();
  await expect(page.locator('audio')).toHaveAttribute('src', /fixture\.mp3/);
  await expect(page.locator('audio')).toHaveJSProperty('paused', true);
  await expect(page.getByRole('alert')).toContainText(/Audio nicht verfügbar/);
  const basePath = new URL('.', page.url()).pathname;
  const assets = await page.evaluate(async (base) => {
    const paths = ['publication.json', 'search/manifest.json', 'stats/manifest.json'];
    return Promise.all(paths.map(async (path) => {
      const response = await fetch(`${base}${path}`);
      return { path, ok: response.ok };
    }));
  }, basePath);
  expect(assets).toEqual([
    { path: 'publication.json', ok: true },
    { path: 'search/manifest.json', ok: true },
    { path: 'stats/manifest.json', ok: true },
  ]);
  expect(failed.filter((url) => new URL(url).origin === new URL(page.url()).origin)).toEqual([]);
});
