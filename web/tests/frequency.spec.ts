import { expect, test } from '@playwright/test';
import { choose } from './helpers';
async function openStatistics(page: import('@playwright/test').Page) { await page.goto('./?podcast=podcast-ufo'); await expect(page.getByRole('combobox', { name: 'Wörter suchen' })).toBeVisible(); }

test('excluded words are unavailable while complete word metrics remain accessible', async ({ page }) => {
  await openStatistics(page);
  await page.getByRole('combobox').fill('ein');
  await expect(page.getByRole('option', { name: 'ein', exact: true })).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.locator('.selection-note')).toContainText('Stoppwörter und manuell ausgeschlossene Wörter');
  await page.getByText('Verarbeitete Folgen und Laufzeiten', { exact: true }).click();
  await expect(page.getByText('Gesamtwörter einschließlich Stoppwörtern: 349')).toBeVisible();
});

test('a zero-word episode remains a chronological absolute zero', async ({ page }) => {
  await page.route('**/stats/catalog.json', async (route) => {
    const response = await route.fetch(); const catalog = await response.json();
    catalog.episodes.find((episode: { episodeId: string }) => episode.episodeId === 'synthetic-episode-001').totalWords = 0;
    await route.fulfill({ response, json: catalog });
  });
  await openStatistics(page); await choose(page, 'hund');
  await page.getByRole('button', { name: 'Alle', exact: true }).click();
  await page.getByText('Diagrammdaten anzeigen', { exact: true }).click();
  const row = page.getByRole('table', { name: 'Vorkommen nach Folge' }).getByRole('row').filter({ hasText: 'Synthetische Beispielfolge' });
  await expect(row.getByRole('cell')).toHaveText(['0', '0']);
  await expect(page.getByRole('radio')).toHaveCount(0);
});

test('a failed count shard remains an error rather than zero-valued results', async ({ page }) => {
  await page.route('**/stats/counts/*.json', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));
  await openStatistics(page);
  await choose(page, 'hund');
  await expect(page.getByRole('alert')).toContainText('Fehlende Daten sind kein Nullwert');
  await expect(page.getByRole('region', { name: 'Folgen mit den meisten Vorkommen' })).toHaveCount(0);
  await page.unroute('**/stats/counts/*.json');
  await page.getByRole('button', { name: 'Zählungen erneut laden' }).click();
  await expect(page.getByRole('region', { name: 'Folgen mit den meisten Vorkommen' })).toBeVisible();
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
    await expect(page.getByRole('region', { name: 'Folgen mit den meisten Vorkommen' })).toHaveCount(0);
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
