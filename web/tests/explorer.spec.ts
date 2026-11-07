import { expect, test } from '@playwright/test';

test('one autocomplete builds absolute summed stacks and keeps chronological zero episodes', async ({ page }) => {
  await page.goto('./?podcast=podcast-ufo');
  const input = page.getByRole('combobox', { name: 'Wörter suchen' });
  await expect(input).toBeVisible();
  await expect(page.locator('input')).toHaveCount(1);
  await input.fill('HUND');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: 'hund entfernen' })).toBeVisible();
  await input.fill('katze');
  await page.getByRole('option', { name: 'katze', exact: true }).click();
  await page.getByText('Diagrammdaten anzeigen', { exact: true }).click();
  const rows = page.getByRole('table', { name: 'Vorkommen nach Folge' }).getByRole('row');
  await expect(rows.nth(1)).toContainText('Titelgeheimnis');
  await expect(rows.nth(1).getByRole('cell')).toHaveText(['256', '0', '256']);
  await expect(page.getByRole('region', { name: 'Folgen mit den meisten Vorkommen' }).getByRole('article').first()).toContainText('256 Vorkommen');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await expect(rows).toHaveCount(18);
  await expect(rows.nth(1)).toContainText('Abdeckung vollständig');
  await expect(rows.nth(2)).toContainText('Paar A');
  await expect(rows.nth(13)).toContainText('Paar B');
  await expect(rows.nth(16)).toContainText('Paar C');
  await expect(rows.nth(17)).toContainText('Paar D');
  await expect(rows.filter({ hasText: 'Synthetische Beispielfolge' }).getByRole('cell')).toHaveText(['0', '0', '0']);
});

test('selected Grundformen highlight actual surface forms and load only the statistics top ten', async ({ page }) => {
  const records: string[] = [];
  const fragments: string[] = [];
  page.on('request', (request) => {
    if (/\/episodes\/.+\.json$/.test(request.url())) records.push(decodeURIComponent(new URL(request.url()).pathname.split('/').at(-1)!));
    if (request.url().endsWith('.pf_fragment')) fragments.push(request.url());
  });
  await page.goto('./?podcast=podcast-ufo');
  const input = page.getByRole('combobox', { name: 'Wörter suchen' });
  await input.fill('münze');
  await page.getByRole('option', { name: 'münze', exact: true }).click();
  const card = page.getByRole('region', { name: 'Folgen mit den meisten Vorkommen' }).getByRole('article');
  await expect(card.locator('mark')).toHaveText(['Münzen']);
  await expect(card).toContainText('1 Vorkommen');
  await page.getByRole('button', { name: 'münze entfernen' }).click();
  records.length = 0; fragments.length = 0;
  await input.fill('laterne');
  await page.getByRole('option', { name: 'laterne', exact: true }).click();
  await expect(card).toHaveCount(10);
  await expect(card.locator('.passage').first()).toBeVisible();
  expect(records).toHaveLength(10);
  expect(fragments).toHaveLength(10);
});
