import { expect, test } from '@playwright/test';
import { openExplorer, chartEpisodes } from './helpers';

test('one autocomplete builds absolute summed stacks and keeps chronological zero episodes', async ({ page }) => {
  await openExplorer(page);
  const input = page.getByRole('combobox', { name: 'Wörter suchen' });
  await expect(input).toBeVisible();
  await expect(page.locator('input')).toHaveCount(1);
  await input.fill('HUND');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: 'hund entfernen' })).toBeVisible();
  await input.fill('katze');
  await page.getByRole('option', { name: 'katze', exact: true }).click();
  const rows = chartEpisodes(page);
  await expect(rows.first()).toHaveAttribute('aria-label', 'Titelgeheimnis — zweite synthetische Folge; hund: 256; katze: 0; Summe: 256');
  await expect(page.getByText('Diagrammdaten anzeigen', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Folgen mit den meisten Vorkommen' }).getByRole('article').first()).toContainText('256 Vorkommen');
  await expect(page.getByRole('radio')).toHaveCount(0);
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await expect(rows).toHaveCount(17);
  await expect(rows.nth(0)).toHaveAttribute('aria-label', /Abdeckung vollständig/);
  await expect(rows.nth(1)).toHaveAttribute('aria-label', /Paar A/);
  await expect(rows.nth(12)).toHaveAttribute('aria-label', /Paar B/);
  await expect(rows.nth(15)).toHaveAttribute('aria-label', /Paar C/);
  await expect(rows.nth(16)).toHaveAttribute('aria-label', /Paar D/);
  await expect(page.getByRole('img', { name: /Synthetische Beispielfolge.*hund: 0; katze: 0; Summe: 0/ })).toHaveCount(1);
});

test('selected Grundformen highlight actual surface forms and load only the statistics top ten', async ({ page }) => {
  const records: string[] = [];
  const fragments: string[] = [];
  page.on('request', (request) => {
    if (/\/episodes\/.+\.json$/.test(request.url())) records.push(decodeURIComponent(new URL(request.url()).pathname.split('/').at(-1)!));
    if (request.url().endsWith('.pf_fragment')) fragments.push(request.url());
  });
  await openExplorer(page);
  records.length = 0; fragments.length = 0;
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
