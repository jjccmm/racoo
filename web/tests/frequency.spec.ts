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

test('excluded words are explained and unavailable while all-word metrics and rates stay complete', async ({ page }) => {
  await openStatistics(page);
  await choose(page, 'hund');
  const total = page.getByText('Gesamtwörter einschließlich Stoppwörtern: 349');
  await expect(total).toBeVisible();
  await expect(page.getByRole('table', { name: 'Top 10: hund' })
    .getByRole('row').filter({ hasText: 'Titelgeheimnis' })).toContainText('951,7');

  await page.getByRole('textbox', { name: 'Grundform suchen' }).fill('ein');
  await expect(page.getByRole('list', { name: 'Grundformvorschläge' })
    .getByRole('button', { name: 'ein', exact: true })).toHaveCount(0);
  await expect(page.getByRole('checkbox', { name: 'Stoppwörter in Vorschlägen einschließen' })).toHaveCount(0);
  await expect(page.locator('.frequency')).toContainText('Automatische Stoppwörter und Wörter aus einer manuell gepflegten Zusatzliste');
  await expect(page.locator('.frequency')).toContainText('Gesamtwörter, verschiedene und neue Wörter sowie der Nenner der normierten Häufigkeit enthalten weiterhin alle alphabetischen Wörter');
  await expect(total).toBeVisible();
  await expect(page.getByRole('table', { name: 'Top 10: hund' })
    .getByRole('row').filter({ hasText: 'Titelgeheimnis' })).toContainText('269');
  await expect(page.getByRole('table', { name: 'Top 10: hund' })
    .getByRole('row').filter({ hasText: 'Titelgeheimnis' })).toContainText('951,7');
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

const invalidPairs: { name: string; pairs: unknown }[] = [
  { name: 'legacy episode ID', pairs: [['synthetic-episode-002', 256]] },
  { name: 'negative index', pairs: [[-1, 256]] },
  { name: 'fractional index', pairs: [[0.5, 256]] },
  { name: 'out-of-range index', pairs: [[17, 256]] },
  { name: 'unsafe index', pairs: [[9007199254740992, 256]] },
  { name: 'duplicate index', pairs: [[0, 1], [0, 256]] },
  { name: 'oversized pair', pairs: [[0, 256, 1]] },
  { name: 'nonpositive count', pairs: [[0, 0]] },
  { name: 'fractional count', pairs: [[0, 1.5]] },
  { name: 'unsafe count', pairs: [[0, 9007199254740992]] },
];

for (const { name, pairs } of invalidPairs) {
  test(`a ${name} in count pairs is an error, never a zero`, async ({ page }) => {
    await page.route('**/stats/counts/*.json', async (route) => {
      const response = await route.fetch();
      const shard = await response.json();
      shard.counts.hund = pairs;
      return route.fulfill({ response, json: shard });
    });
    await openStatistics(page);
    await choose(page, 'hund');
    await expect(page.getByRole('alert')).toContainText('Fehlende Daten sind kein Nullwert');
    await expect(page.getByRole('table', { name: 'Top 10: hund' })).toHaveCount(0);
  });
}

for (const defect of ['old schema', 'mixed publication']) {
  test(`a count shard with ${defect} is rejected`, async ({ page }) => {
    await page.route('**/stats/counts/*.json', async (route) => {
      const response = await route.fetch();
      const shard = await response.json();
      if (defect === 'old schema') shard.schemaVersion = 1;
      else shard.publicationId = 'f'.repeat(64);
      return route.fulfill({ response, json: shard });
    });
    await openStatistics(page);
    await choose(page, 'hund');
    await expect(page.getByRole('alert')).toContainText('Fehlende Daten sind kein Nullwert');
  });
}
