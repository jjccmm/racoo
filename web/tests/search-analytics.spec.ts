import { expect, test } from '@playwright/test';
import { openExplorer } from './helpers';

test('explicit searches record one query and each unique normalized word with podcast and mode', async ({ page }) => {
  const events: { name: string; data: Record<string, string> }[] = [];
  await page.route('**/__umami-test', async route => {
    events.push(route.request().postDataJSON());
    await route.fulfill({ status: 200, body: '{}' });
  });
  await page.route('https://cloud.umami.is/script.js', route => route.fulfill({
    contentType: 'application/javascript',
    body: `window.umami = { track: (name, data) => fetch('/__umami-test', { method: 'POST', body: JSON.stringify({ name, data }) }) };`,
  }));
  await page.goto('./?podcast=podcast-ufo');
  await expect(page.getByRole('article')).toHaveCount(2);
  expect(events).toEqual([]); // The automatic Eimer/Münze search is not an explicit submission.
  const field = page.getByRole('searchbox', { name: 'Wörter suchen' });
  await field.fill('  Eimer EIMER Münze  ');
  expect(events).toEqual([]);
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect.poll(() => events.length).toBe(3);
  expect(events.filter(event => event.name === 'search')).toEqual([
    { name: 'search', data: { query: 'Eimer EIMER Münze', podcast: 'podcast-ufo', mode: 'standard' } },
  ]);
  expect(events.filter(event => event.name === 'search-word').map(event => event.data).sort((a, b) => a.word.localeCompare(b.word))).toEqual([
    { word: 'eimer', podcast: 'podcast-ufo', mode: 'standard' },
    { word: 'münze', podcast: 'podcast-ufo', mode: 'standard' },
  ]);
  await page.getByRole('button', { name: 'Suchoptionen', exact: true }).click();
  await page.getByRole('button', { name: 'Exakt', exact: true }).click();
  await expect(page.locator('.exact-notice')).toBeVisible();
  expect(events).toHaveLength(3);
  await field.press('Enter');
  await expect.poll(() => events.length).toBe(6);
  expect(events.filter(event => event.name === 'search')[1].data.mode).toBe('exact');
  expect(events.filter(event => event.name === 'search-word' && event.data.mode === 'exact').map(event => event.data.word).sort()).toEqual(['eimer', 'münze']);
  await field.fill('eins zwei drei vier fünf sechs sieben acht neun zehn elf');
  await field.press('Enter');
  await expect(page.getByRole('alert')).toContainText('höchstens zehn');
  await field.fill(''); await field.press('Enter');
  await expect(page.getByRole('article')).toHaveCount(0);
  expect(events).toHaveLength(6);
  await page.reload(); // URL-driven initial searches never produce custom search events either.
  await expect(field).toHaveValue('');
  expect(events).toHaveLength(6);
  await page.goto('./?podcast=podcast-ufo&q=Münze');
  await expect(page.getByRole('article')).toHaveCount(1);
  expect(events).toHaveLength(6);
});

for (const failure of ['missing', 'throw', 'reject'] as const) {
  test(`search still works when the tracker is ${failure}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://cloud.umami.is/script.js', route => failure === 'missing' ? route.abort() : route.fulfill({
      contentType: 'application/javascript',
      body: `window.umami = { track() { ${failure === 'throw' ? 'throw new Error("tracker failed")' : 'return Promise.reject(new Error("tracker failed"))'}; } };`,
    }));
    await openExplorer(page);
    const field = page.getByRole('searchbox', { name: 'Wörter suchen' });
    await field.fill('Münze'); await field.press('Enter');
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article').locator('mark')).not.toHaveCount(0);
    expect(errors).toEqual([]);
    expect(new URL(page.url()).searchParams.get('q')).toBe('Münze');
  });
}
