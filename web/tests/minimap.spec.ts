import { expect, test } from '@playwright/test';
import { choose, openExplorer } from './helpers';
import { controlledText } from './highlights-fixture';

for (const width of [1280, 390, 320]) {
  test(`light vertical minimap navigates original text and keeps layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); await openExplorer(page);
    await controlledText(page, true); await choose(page, 'münze euro');
    const card = page.getByRole('article');
    await expect(card.getByRole('button', { name: /Transkript öffnen/ })).toHaveCount(0);
    const reader = card.getByRole('region', { name: /Transkript:/ }); const map = reader.getByRole('scrollbar');
    await expect(map).toHaveAttribute('aria-orientation', 'vertical');
    expect(await map.evaluate(element => getComputedStyle(element.parentElement!).backgroundColor)).toBe('rgb(255, 255, 255)');
    const text = reader.getByRole('region', { name: 'Vollständiger Transkripttext' });
    await expect(reader.locator('.reader-segment')).toHaveCount(4);
    await reader.getByRole('button', { name: 'Nächste Fundstelle' }).click();
    await expect(reader.locator('mark[data-current=true]')).toHaveCount(1);
    await expect(reader.getByRole('status')).toContainText('2/5');
    await reader.getByRole('button', { name: 'Vorherige Fundstelle' }).click();
    await expect(reader.getByRole('status')).toContainText('1/5');
    await map.focus(); await map.press('End'); await expect.poll(() => map.getAttribute('aria-valuenow')).toBe('100');
    await map.press('Home'); await expect.poll(() => map.getAttribute('aria-valuenow')).toBe('0');
    const box = await map.boundingBox();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + 5); await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height * .75, { steps: 5 }); await page.mouse.up();
    await expect.poll(() => text.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    await page.setViewportSize({ width: width + 20, height: 900 });
    await expect(map).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('audio')).toHaveCount(0);
    await expect(reader.getByRole('button', { name: 'Transkript schließen', exact: true })).toHaveCount(0);
    await expect(reader.locator('.map-label, .map-end')).toHaveCount(0);
  });
}


test('initial position and resizing keep the earliest hit visible without stealing search focus', async ({ page }) => {
  await openExplorer(page); await controlledText(page, true); await choose(page, 'spätfund');
  const reader = page.getByRole('region', { name: /Transkript:/ });
  await expect(reader.locator('mark[data-current=true]')).toHaveText('Spätfund');
  await expect.poll(() => reader.getByRole('region', { name: 'Vollständiger Transkripttext' }).evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Suchen', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => reader.evaluate(element => {
    const hit = element.querySelector('mark[data-current=true]')!.getBoundingClientRect();
    const view = element.querySelector('.reader-scroll')!.getBoundingClientRect();
    return hit.top >= view.top && hit.bottom <= view.bottom;
  })).toBe(true);
  await page.getByRole('searchbox').fill('xyzunauffindbar münze'); await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('region', { name: /Transkript:/ }).locator('mark[data-current=true]')).toHaveText('Münzen');
});


test('several episode transcripts stay open while their cards are read', async ({ page }) => {
  await openExplorer(page); await choose(page, 'eimer');
  const cards = page.getByRole('article'); await expect(cards).toHaveCount(2);
  await expect(cards.first().getByRole('region', { name: /Transkript:/ })).toBeVisible();
  await cards.nth(1).scrollIntoViewIfNeeded();
  await expect(cards.nth(1).getByRole('region', { name: /Transkript:/ })).toBeVisible();
  await expect(page.locator('.transcript-reader')).toHaveCount(2);
});


test('extending a query selects the earliest hit in a cached transcript', async ({ page }) => {
  await openExplorer(page); await controlledText(page, true);
  let originals = 0;
  page.on('request', request => { if (request.url().endsWith('/episodes/synthetic-episode-001.json')) originals++; });
  await choose(page, 'spätfund');
  const reader = page.getByRole('region', { name: /Transkript:/ });
  await expect(reader.locator('mark[data-current=true]')).toHaveText('Spätfund');
  const before = originals; expect(before).toBe(1);
  await choose(page, 'münze');
  await expect(reader.locator('mark[data-current=true]')).toHaveText('Münzen');
  await expect(reader.getByRole('status')).toHaveText('1/6');
  expect(originals).toBe(before);
  await expect(page.getByRole('button', { name: 'Suchen', exact: true })).toBeFocused();
});


test('text fades only at overflowing edges and updates after scrolling and resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExplorer(page); await controlledText(page, true); await choose(page, 'münze');
  const reader = page.getByRole('region', { name: /Transkript:/ });
  const text = reader.getByRole('region', { name: 'Vollständiger Transkripttext' });
  const map = reader.getByRole('scrollbar');
  await map.focus(); await map.press('Home');
  await expect(text).toHaveAttribute('data-fade-top', 'false');
  await expect(text).toHaveAttribute('data-fade-bottom', 'true');
  expect(await text.evaluate(el => getComputedStyle(el).maskImage)).toContain('linear-gradient');
  expect(await text.evaluate(el => el.clientHeight)).toBeGreaterThan(357);
  expect(await text.evaluate(el => el.clientHeight)).toBeLessThan(360);
  await text.evaluate(el => { el.scrollTop = (el.scrollHeight - el.clientHeight) / 2; });
  await expect(text).toHaveAttribute('data-fade-top', 'true');
  await expect(text).toHaveAttribute('data-fade-bottom', 'true');
  await map.press('End');
  await expect(text).toHaveAttribute('data-fade-top', 'true');
  await expect(text).toHaveAttribute('data-fade-bottom', 'false');
  await page.setViewportSize({ width: 390, height: 720 });
  await expect(text).toHaveAttribute('data-fade-bottom', 'true');
});
