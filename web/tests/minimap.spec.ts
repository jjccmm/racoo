import { expect, test } from '@playwright/test';
import { choose, openExplorer } from './helpers';
import { controlledText } from './highlights-fixture';

for (const width of [1280, 390, 320]) {
  test(`light vertical minimap navigates original text and keeps layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); await openExplorer(page);
    await controlledText(page, true); await choose(page, 'münze euro');
    const card = page.getByRole('article');
    const open = card.getByRole('button', { name: /Transkript öffnen/ }); await open.click();
    const reader = card.getByRole('region', { name: /Transkript:/ }); const map = reader.getByRole('scrollbar');
    await expect(map).toHaveAttribute('aria-orientation', 'vertical');
    expect(await map.evaluate(element => getComputedStyle(element.parentElement!).backgroundColor)).toBe('rgb(237, 241, 238)');
    const text = reader.getByRole('region', { name: 'Vollständiger Transkripttext' });
    await expect(reader.locator('.reader-segment')).toHaveCount(4);
    await reader.getByRole('button', { name: 'Nächste Fundstelle' }).click();
    await expect(reader.locator('mark[data-current=true]')).toHaveCount(1);
    await expect(reader.getByRole('status')).toContainText('1/');
    await reader.getByRole('button', { name: 'Vorherige Fundstelle' }).click();
    await expect(reader.getByRole('status')).toContainText('5/5');
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
    await reader.getByRole('button', { name: 'Transkript schließen', exact: true }).click();
    await expect(reader).toHaveCount(0); await expect(open).toBeFocused();
  });
}
