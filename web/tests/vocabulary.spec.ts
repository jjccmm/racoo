import { expect, test } from '@playwright/test';

test('a visitor sees pilot and per-episode vocabulary totals in stable chronological order', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Wortentwicklung öffnen' }).click();
  const summary = page.getByRole('region', { name: 'Gesamtwörter und Wortschatz' });
  await expect(summary.getByText('Gesamtwörter im Pilot')).toBeVisible();
  await expect(summary.locator('dd')).toHaveText(['349', '42', '42']);

  const table = page.getByRole('table', { name: 'Chronologische Wortentwicklung je Folge' });
  await expect(table.getByRole('row')).toHaveCount(18);
  const rows = table.getByRole('row');
  await expect(rows.nth(1)).toContainText('Abdeckung vollständig');
  await expect(rows.nth(1)).toContainText('24');
  await expect(rows.nth(2)).toContainText('Paar A');
  await expect(rows.nth(3)).toContainText('Einzelne Laterne 1');
  await expect(summary.getByText('Neue Wörter im Pilot')).toBeVisible();
  await expect(summary.getByText('unterschiedliche kleingeschriebene Grundformen')).toBeVisible();
});

test('a zero-word episode remains visible with zero counts', async ({ page }) => {
  await page.route('**/stats/catalog.json', (route) => route.fulfill({
    json: {
      schemaVersion: 1,
      publicationId: 'a'.repeat(64),
      summary: { episodeCount: 1, totalWords: 0, distinctWords: 0, newWords: 0 },
      episodes: [{
        episodeId: 'zero-word', title: 'Nur Satzzeichen', publishedAt: '2024-01-01T12:00:00Z',
        totalWords: 0, distinctWords: 0, newWords: 0,
      }],
    },
  }));
  await page.goto('./');
  await page.getByRole('button', { name: 'Wortentwicklung öffnen' }).click();
  const summary = page.getByRole('region', { name: 'Gesamtwörter und Wortschatz' });
  await expect(summary.locator('dd')).toHaveText(['0', '0', '0']);
  const row = summary.getByRole('row', { name: /Nur Satzzeichen/ });
  await expect(row).toContainText('0');
});
