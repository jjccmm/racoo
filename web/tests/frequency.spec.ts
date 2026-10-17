import { expect, test } from '@playwright/test';

async function openStatistics(page: import('@playwright/test').Page) {
  await page.goto('./');
  await page.getByRole('button', { name: 'Wortstatistik öffnen' }).click();
  await expect(page.getByRole('textbox', { name: 'Grundform suchen' })).toBeVisible();
}

async function choose(page: import('@playwright/test').Page, lemma: string) {
  await page.getByRole('textbox', { name: 'Grundform suchen' }).fill(lemma);
  await page.getByRole('button', { name: lemma, exact: true }).click();
}

test('a visitor compares multiple Grundformen, normalized rates and absolute occurrences', async ({ page }) => {
  await openStatistics(page);
  await choose(page, 'hund');
  await choose(page, 'katze');

  const chart = page.getByRole('region', { name: 'Grundformvergleich' });
  await expect(chart).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Häufigkeit je 1.000 Gesamtwörter' })).toBeChecked();
  const dog = page.getByRole('table', { name: 'Top 10: hund' });
  await expect(dog.getByRole('row')).toHaveCount(11);
  const titleSecrets = dog.getByRole('row').filter({ hasText: 'Titelgeheimnis' });
  await expect(titleSecrets).toContainText('256');
  await expect(titleSecrets).toContainText('269');
  await expect(titleSecrets).toContainText('951,7');
  await expect(dog.getByRole('row').filter({ hasText: 'Synthetische Beispielfolge' })).toContainText('0');
  const cat = page.getByRole('table', { name: 'Top 10: katze' });
  await expect(cat.getByRole('row').filter({ hasText: 'Paar D' })).toContainText('600');

  await page.getByRole('radio', { name: 'Absolute Vorkommen' }).check();
  await expect(page.getByRole('radio', { name: 'Absolute Vorkommen' })).toBeChecked();
  await expect(dog.getByRole('row').filter({ hasText: 'Titelgeheimnis' })).toContainText('256');
  await expect(cat.getByRole('row').filter({ hasText: 'Paar D' })).toContainText('3');
});

test('stopword suggestions can be toggled without changing counts or the normalization denominator', async ({ page }) => {
  await openStatistics(page);
  await choose(page, 'hund');
  const total = page.getByText('Gesamtwörter einschließlich Stoppwörtern: 349');
  await expect(total).toBeVisible();
  await expect(page.getByRole('table', { name: 'Top 10: hund' })
    .getByRole('row').filter({ hasText: 'Titelgeheimnis' })).toContainText('951,7');

  await page.getByRole('textbox', { name: 'Grundform suchen' }).fill('ein');
  await expect(page.getByRole('list', { name: 'Grundformvorschläge' })
    .getByRole('button', { name: 'ein', exact: true })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Stoppwörter in Vorschlägen einschließen' }).check();
  await expect(page.getByRole('list', { name: 'Grundformvorschläge' })
    .getByRole('button', { name: 'ein', exact: true })).toHaveCount(1);
  await choose(page, 'ein');
  await expect(total).toBeVisible();
  await expect(page.getByRole('table', { name: 'Top 10: hund' })
    .getByRole('row').filter({ hasText: 'Titelgeheimnis' })).toContainText('269');
  await expect(page.getByRole('table', { name: 'Top 10: hund' })
    .getByRole('row').filter({ hasText: 'Titelgeheimnis' })).toContainText('951,7');
  const stopwordEpisode = page.getByRole('table', { name: 'Top 10: ein' })
    .getByRole('row').filter({ hasText: 'Synthetische Beispielfolge' });
  await expect(stopwordEpisode).toContainText('2');
  await expect(stopwordEpisode).toContainText('15');
  await expect(stopwordEpisode).toContainText('133,3');
  await expect(page.locator('input[name="frequency-mode"][value="normalized"]')).toBeChecked();
});

test('a zero-word episode has no normalized rate and a missing count remains zero', async ({ page }) => {
  await page.route('**/stats/catalog.json', async (route) => {
    const response = await route.fetch();
    const catalog = await response.json();
    const empty = catalog.episodes.find((episode: { episodeId: string }) => episode.episodeId === 'synthetic-episode-001');
    empty.totalWords = 0;
    return route.fulfill({ response, json: catalog });
  });
  await openStatistics(page);
  await choose(page, 'hund');
  const dog = page.getByRole('table', { name: 'Top 10: hund' });
  const empty = dog.getByRole('row').filter({ hasText: 'Synthetische Beispielfolge' });
  await expect(empty).toContainText('0');
  await expect(empty).toContainText('Nicht verfügbar');
});

test('a failed count shard remains an error rather than zero-valued results', async ({ page }) => {
  await page.route('**/stats/counts/*.json', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));
  await openStatistics(page);
  await choose(page, 'hund');
  await expect(page.getByRole('alert')).toContainText('Fehlende Daten sind kein Nullwert');
  await expect(page.getByRole('table', { name: 'Top 10: hund' })).toHaveCount(0);
  await page.unroute('**/stats/counts/*.json');
  await page.getByRole('button', { name: 'Zählungen erneut laden' }).click();
  await expect(page.getByRole('table', { name: 'Top 10: hund' })).toBeVisible();
});
