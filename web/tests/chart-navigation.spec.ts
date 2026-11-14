import { expect, test } from '@playwright/test';
import { choose, openExplorer } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.route('https://cloud.umami.is/**', route => route.abort());
});

test('Top10 bars open the matching card by click and keyboard, without changing the query', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openExplorer(page); await choose(page, 'Laterne Katzen Fenster');
  const cards = page.getByRole('article');
  await expect(cards).toHaveCount(10);
  const chart = page.getByRole('region', { name: 'Suchwortvergleich' });
  for (const [index, action] of [[8, 'click'], [4, 'Enter'], [7, 'Space']] as const) {
    await page.evaluate(() => window.scrollTo(0, 0));
    const title = await cards.nth(index).locator('h3').innerText();
    const bar = chart.getByRole('button', { name: `Zur Folge ${title} ·` }).first();
    if (action === 'click') await bar.click();
    else { await bar.focus(); await bar.press(action === 'Space' ? ' ' : action); }
    await expect(cards.nth(index)).toBeFocused();
    await expect.poll(() => cards.nth(index).evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(120);
    expect(await cards.nth(index).evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(0);
    await expect(cards.nth(index).getByRole('region', { name: /Transkript:/ })).toBeVisible();
  }
  await expect(page.getByRole('searchbox')).toHaveValue('Laterne Katzen Fenster');
  await expect(page.getByText('Jedes Suchwort wird einzeln gezählt.', { exact: false })).toHaveCount(0);
  await page.getByRole('button', { name: 'Nach oben', exact: true }).click();
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await expect(chart.getByRole('button', { name: /^Zur Folge/ })).toHaveCount(0);
});

for (const width of [320, 1280]) {
  test(`floating return button appears after scrolling and returns to the top at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 720 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openExplorer(page); await choose(page, 'Laterne');
    await expect(page.getByRole('article')).toHaveCount(10);
    const up = page.getByRole('button', { name: 'Nach oben', exact: true });
    await expect(up).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(up).toBeVisible();
    expect(await up.evaluate(el => el.getBoundingClientRect().right <= innerWidth)).toBe(true);
    await up.click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(up).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Racoo – Startseite' })).toBeFocused();
  });
}

test('head includes the requested deferred Umami tracker', async ({ page }) => {
  await page.goto('./');
  const tracker = page.locator('head script[src="https://cloud.umami.is/script.js"]');
  await expect(tracker).toHaveAttribute('defer', '');
  await expect(tracker).toHaveAttribute('data-website-id', '8b14f323-fb03-47ba-b65a-0807ffdf3032');
});
