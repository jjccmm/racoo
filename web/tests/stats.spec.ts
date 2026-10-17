import { expect, test } from '@playwright/test';

test('suggestions are bounded and comparison selection has a five-word limit', async ({ page }) => {
  const shards: string[] = [];
  page.on('request', (request) => { if (/\/stats\/counts\//.test(request.url())) shards.push(request.url()); });
  await page.goto('./');
  await page.getByRole('button', { name: 'Wortstatistik öffnen' }).click();
  const suggestions = page.getByRole('list', { name: 'Grundformvorschläge' });
  const buttons = suggestions.getByRole('button');
  await expect(buttons).toHaveCount(10);
  expect(shards).toEqual([]);

  for (let index = 0; index < 5; index += 1) {
    await buttons.nth(index).click();
    await expect(page.getByRole('region', { name: 'Grundformvergleich' })).toBeVisible();
  }
  await expect(page.getByRole('list', { name: 'Ausgewählte Grundformen' }).getByRole('listitem')).toHaveCount(5);
  await expect(buttons.nth(5)).toBeDisabled();
  expect(shards).toHaveLength(5);
});
