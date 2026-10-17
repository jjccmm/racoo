import { expect, test } from '@playwright/test';

test('a visitor selects a Grundform and sees exact large counts and known zeros', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Wortstatistik öffnen' }).click();
  await page.getByRole('textbox', { name: 'Grundform' }).fill('hund');
  await page.getByRole('button', { name: 'hund', exact: true }).click();
  const table = page.getByRole('table', { name: 'Exakte Grundformzählung' });
  await expect(table.getByRole('row').filter({ hasText: 'Titelgeheimnis' })).toContainText('256');
  await expect(table.getByRole('row').filter({ hasText: 'Synthetische Beispielfolge' })).toContainText('0');
  await expect(page.getByText('Gesamtwörter einschließlich Stoppwörtern: 284')).toBeVisible();
});

test('suggestions stay bounded and the stopword toggle preserves the total', async ({ page }) => {
  const shards: string[] = [];
  page.on('request', (request) => { if (/\/stats\/counts\//.test(request.url())) shards.push(request.url()); });
  await page.goto('./');
  await page.getByRole('button', { name: 'Wortstatistik öffnen' }).click();
  const suggestions = page.getByRole('list', { name: 'Grundformvorschläge' });
  await expect(suggestions.getByRole('button')).toHaveCount(10);
  expect(shards).toEqual([]);
  await page.getByRole('textbox', { name: 'Grundform' }).fill('ein');
  await expect(suggestions.getByRole('button', { name: 'ein', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Stoppwörter in Vorschlägen einschließen' }).check();
  await suggestions.getByRole('button', { name: 'ein', exact: true }).click();
  const table = page.getByRole('table', { name: 'Exakte Grundformzählung' });
  await expect(table.getByRole('row').filter({ hasText: 'Titelgeheimnis' })).toContainText('1');
  await expect(table.getByRole('row').filter({ hasText: 'Synthetische Beispielfolge' })).toContainText('2');
  await expect(page.getByText('Gesamtwörter einschließlich Stoppwörtern: 284')).toBeVisible();
  expect(shards).toHaveLength(1);
});

test('a failed shard is an error until a deliberate retry, never a zero count', async ({ page }) => {
  let failures = 0;
  await page.route('**/stats/counts/*.json', (route) => {
    failures += 1;
    return route.fulfill({ status: 503, body: 'Unavailable' });
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Wortstatistik öffnen' }).click();
  await page.getByRole('textbox', { name: 'Grundform' }).fill('hund');
  await page.getByRole('button', { name: 'hund', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Fehlende Daten sind kein Nullwert');
  await expect(page.getByRole('table', { name: 'Exakte Grundformzählung' })).toHaveCount(0);
  await page.waitForTimeout(250);
  expect(failures).toBe(1);
  await page.unroute('**/stats/counts/*.json');
  await page.getByRole('button', { name: 'hund', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Exakte Grundformzählung' })).toContainText('256');
});
