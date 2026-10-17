import { expect, test, type Page } from '@playwright/test';

async function search(page: Page, query: string) {
  await page.getByRole('textbox', { name: /Stichwort/ }).fill(query);
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('status')).not.toHaveText('Suche läuft …');
}

const orderedTitles = [
  'Abdeckung vollständig', 'Paar B', 'Paar A', 'Paar C', 'Paar D',
  'Einzelne Laterne 1', 'Einzelne Katze 2', 'Einzelne Laterne 3', 'Einzelne Katze 4', 'Einzelne Laterne 5',
  'Einzelne Katze 6', 'Einzelne Laterne 7', 'Einzelne Katze 8', 'Einzelne Laterne 9', 'Einzelne Katze 10',
];

test('distinct remembered terms produce complete and partial coverage with lazy details', async ({ page }) => {
  const fragments: string[] = [];
  const records: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.pf_fragment')) fragments.push(request.url());
    if (/\/episodes\/.+\.json$/.test(request.url())) records.push(request.url());
  });
  await page.goto('./');
  expect(fragments).toEqual([]);
  expect(records).toEqual([]);
  await page.getByRole('textbox', { name: /Stichwort/ }).fill('Laterne Katzen Fenster');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('10 von 15 passenden Folgen');
  const results = page.getByRole('article');
  await expect(results).toHaveCount(10);
  await expect(results.first()).toContainText('Abdeckung vollständig');
  await expect(results.first()).toContainText('3/3 Stichwörter');
  await expect(results.nth(1)).toContainText('2/3 Stichwörter');
  await expect(results.nth(5)).toContainText('1/3 Stichwörter');
  expect(fragments).toHaveLength(10);
  expect(records).toHaveLength(10);
  await page.getByRole('button', { name: 'Weitere Folgen laden' }).click();
  await expect(results).toHaveCount(15);
  await expect(page.getByRole('status')).toContainText('15 von 15 passenden Folgen');
  await expect(page.getByRole('button', { name: 'Weitere Folgen laden' })).toHaveCount(0);
  expect(fragments).toHaveLength(15);
  expect(records).toHaveLength(15);
});

test('coverage, native rank sum, publication instant and identity decide the complete order', async ({ page }) => {
  await page.goto('./');
  await search(page, 'Laterne Katzen Fenster');
  await expect(page.getByRole('article').getByRole('heading')).toHaveText(orderedTitles.slice(0, 10));
  await page.getByRole('button', { name: 'Weitere Folgen laden' }).click();
  await expect(page.getByRole('article').getByRole('heading')).toHaveText(orderedTitles);
});

test('case, repetitions, whitespace and input order preserve distinct-term coverage', async ({ page }) => {
  await page.goto('./');
  for (const query of ['KATZEN   Laterne fenster Laterne KATZEN', '  FENSTER katzen LATERNE  ']) {
    await search(page, query);
    await expect(page.getByRole('article').getByRole('heading')).toHaveText(orderedTitles.slice(0, 10));
    await expect(page.getByRole('article').first()).toContainText('3/3 Stichwörter');
    await expect(page.getByRole('article').nth(1)).toContainText('2/3 Stichwörter · Teilabdeckung');
    await expect(page.getByRole('article').nth(1)).toContainText('Gefunden: katzen, laterne');
  }
});

test('German inflections, umlauts and sharp S stay eligible without exact spelling', async ({ page }) => {
  await page.goto('./');
  await search(page, 'Fuß Gruss');
  const result = page.getByRole('article');
  await expect(result).toHaveCount(1);
  await expect(result).toContainText('2/2 Stichwörter');
  await expect(result).toContainText('Füße und Grüße.');
  await search(page, 'FÜSSE Grüße FÜSSE');
  await expect(result).toHaveCount(1);
  await expect(result).toContainText('2/2 Stichwörter');
  await search(page, 'Katze Fenster');
  await expect(result.first()).toContainText('Abdeckung vollständig');
  await expect(result.first()).toContainText('2/2 Stichwörter');
  await expect(result.nth(1)).toContainText('1/2 Stichwörter · Teilabdeckung');
});

test('a failed additional page preserves earlier results and retries only on request', async ({ page }) => {
  let failures = 0;
  await page.route('**/episodes/coverage-single-06.json', (route) => {
    failures += 1;
    return route.fulfill({ status: 503, body: 'Unavailable episode detail' });
  });
  await page.goto('./');
  await search(page, 'Laterne Katzen Fenster');
  await expect(page.getByRole('article').getByRole('heading')).toHaveText(orderedTitles.slice(0, 10));
  await page.getByRole('button', { name: 'Weitere Folgen laden' }).click();
  await expect(page.getByRole('alert')).toContainText('Die bisherigen Ergebnisse bleiben sichtbar');
  await expect(page.getByRole('article').getByRole('heading')).toHaveText(orderedTitles.slice(0, 10));
  await page.waitForTimeout(250);
  expect(failures).toBe(1);
  await page.unroute('**/episodes/coverage-single-06.json');
  await page.getByRole('button', { name: 'Weitere Folgen laden' }).click();
  await expect(page.getByRole('article').getByRole('heading')).toHaveText(orderedTitles);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('newer results remain authoritative when an older query is pending', async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let held = false;
  await page.route('**/episodes/coverage-complete.json', async (route) => {
    held = true;
    await pending;
    await route.continue().catch(() => {}); // Superseding a query may already abort this request.
  });
  await page.goto('./');
  await page.getByRole('textbox', { name: /Stichwort/ }).fill('Fenster');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect.poll(() => held).toBe(true);
  await expect(page.getByRole('status')).toHaveText('Suche läuft …');
  await search(page, 'Münzen');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('Synthetische Beispielfolge');
  release();
  await page.waitForTimeout(250);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toContainText('Synthetische Beispielfolge');
});

test('an older additional-page request cannot append to a newer query', async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let held = false;
  await page.route('**/episodes/coverage-single-06.json', async (route) => {
    held = true;
    await pending;
    await route.continue().catch(() => {});
  });
  await page.goto('./');
  await search(page, 'Laterne Katzen Fenster');
  await page.getByRole('button', { name: 'Weitere Folgen laden' }).click();
  await expect.poll(() => held).toBe(true);
  await expect(page.getByRole('button', { name: 'Weitere Folgen werden geladen …' })).toBeDisabled();
  await search(page, 'Münzen');
  await expect(page.getByRole('article')).toContainText('Synthetische Beispielfolge');
  release();
  await page.waitForTimeout(250);
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Weitere Folgen laden' })).toHaveCount(0);
});
