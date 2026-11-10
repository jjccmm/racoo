import { expect, test } from '@playwright/test';
import { choose, openExplorer, search } from './helpers';

type RawResult = { id: string; words: number[]; data(): Promise<{ locations: number[]; anchors: { id: string; location: number }[] }> };

test('free-text finds the real built transcript and coarse jump', async ({ page }) => {
  await openExplorer(page); await choose(page, 'münze');
  const card = page.getByRole('article');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText('Ein Eimer voller Münzen steht neben dem Tisch.');
  await expect(card).toContainText('0:10'); await expect(card).toContainText('1 Suchwort-Treffer');
});

test('publication, metadata, query rules and search map share one stable identity', async ({ page }) => {
  await openExplorer(page);
  const envelope = await page.evaluate(async () => {
    const publication = await (await fetch('publication.json')).json();
    const search = await (await fetch('search/manifest.json')).json();
    const mapping = await (await fetch(`search/${search.indexId}/episodes.json`)).json();
    const rules = await (await fetch('search-rules.json')).json();
    const catalog = await (await fetch('catalog.json')).json();
    return { publication, search, mapping, rules, catalog };
  });
  expect(envelope.publication.schemaVersion).toBe(2);
  for (const file of [envelope.search, envelope.mapping, envelope.rules, envelope.catalog]) expect(file.publicationId).toBe(envelope.publication.publicationId);
  expect(envelope.catalog.catalogId).toBe(envelope.publication.catalogId);
  expect(envelope.rules.searchRulesId).toBe(envelope.publication.searchRulesId);
  expect(envelope.catalog.episodes.map((episode: { episodeId: string }) => episode.episodeId).sort()).toEqual(envelope.publication.episodeIds);
});

test('a mismatched publication is an explicit startup error and can be retried', async ({ page }) => {
  await page.route('**/publication.json', route => route.fulfill({ json: { schemaVersion: 1 } }));
  await page.goto('./?podcast=podcast-ufo');
  await expect(page.getByRole('alert').first()).toContainText('Suchdaten konnten nicht geladen werden');
  await page.unroute('**/publication.json'); await page.getByRole('button', { name: 'Suchdaten erneut laden' }).click();
  await expect(page.getByRole('searchbox')).toBeVisible();
});

test('all raw per-term counts precede any detail load and survive more than ten candidates', async ({ page }) => {
  const details: string[] = [];
  page.on('request', request => { if (request.url().endsWith('.pf_fragment') || /\/episodes\/.+\.json$/.test(request.url())) details.push(request.url()); });
  await page.goto('./');
  const found = await page.evaluate(async () => {
    const manifest = await (await fetch('.vite/manifest.json')).json();
    const api = await import(new URL(manifest['src/search.ts'].file, location.href).href);
    return api.countEpisodes(['laterne', 'katzen', 'fenster'], new AbortController().signal, './');
  });
  expect(found.total).toBe(15); expect(found.episodes).toHaveLength(15); expect(details).toEqual([]);
  expect(found.episodes.every((episode: { counts: Record<string, number> }) => Object.values(episode.counts).every(Number.isSafeInteger))).toBe(true);
});

test('the index maps every candidate to stable identity and date before fragment loads', async ({ page }) => {
  const fragments: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.pf_fragment')) fragments.push(request.url());
  });
  await page.goto('./');
  const identities = await page.evaluate(async () => {
    const manifest = await (await fetch('search/manifest.json')).json();
    const directory = `search/${manifest.indexId}/`;
    const mapping = await (await fetch(`${directory}episodes.json`)).json();
    const module = await import(new URL(`${directory}pagefind.js`, location.href).href);
    const { results }: { results: RawResult[] } = await module.search('Eimer');
    return results.map((result) => mapping.episodes[result.id]).sort((a, b) => a.episodeId.localeCompare(b.episodeId));
  });
  expect(identities).toEqual([
    { episodeId: 'synthetic-episode-001', publishedAt: '2026-10-16T12:00:00Z' },
    { episodeId: 'synthetic-episode-002', publishedAt: '2026-10-15T12:00:00Z' },
  ]);
  expect(fragments).toEqual([]);
});

test('title-only words and no matches stay empty without loading any details', async ({ page }) => {
  const details: string[] = [];
  page.on('request', (request) => { if (request.url().endsWith('.pf_fragment')) details.push(request.url()); });
  await page.goto('./'); expect(details).toEqual([]);
  expect((await search(page, 'Titelgeheimnis')).page!.total).toBe(0);
  expect((await search(page, 'unauffindbareswort')).page!.total).toBe(0);
  expect((await search(page, '   ')).page!.total).toBe(0);
  expect(details).toEqual([]); await expect(page.getByRole('alert')).toHaveCount(0);
});

test('the pinned native API preserves independent query positions and segment anchors', async ({ page }) => {
  await page.goto('./');
  const evidence = await page.evaluate(async () => {
    const manifest = await (await fetch('search/manifest.json')).json();
    const moduleUrl = new URL(`search/${manifest.indexId}/pagefind.js`, location.href).href;
    const module = await import(moduleUrl);
    const first: { results: RawResult[] } = await module.search('Münzen');
    const firstPositions = [...first.results[0].words];
    const firstDetails = await first.results[0].data();
    const firstLocations = [...firstDetails.locations];
    const second: { results: RawResult[] } = await module.search('Kleingeld');
    const secondDetails = await second.results[0].data();
    return {
      firstPositions,
      firstLocations,
      secondPositions: second.results[0].words,
      firstLocationsAfterSecondQuery: firstDetails.locations,
      sharedDetails: firstDetails === secondDetails,
      anchors: firstDetails.anchors.map(({ id, location }) => ({ id, location })),
    };
  });
  expect(evidence).toEqual({
    firstPositions: [3],
    firstLocations: [3],
    secondPositions: [14],
    firstLocationsAfterSecondQuery: [3],
    sharedDetails: false,
    anchors: [{ id: 'segment-001', location: 0 }, { id: 'segment-002', location: 8 }],
  });
});


for (const [description, pattern, countError] of [
  ['manifest', '**/search/manifest.json', true],
  ['engine module', '**/search/*/pagefind.js', true],
  ['metadata', '**/*.pf_meta', true],
  ['index', '**/*.pf_index', true],
  ['fragment', '**/*.pf_fragment', false],
  ['transcript', '**/episodes/synthetic-episode-001.json', false],
] as const) {
  test(`failed ${description} stays an explicit error until deliberate retry`, async ({ page }) => {
    await openExplorer(page); let requests = 0;
    await page.route(pattern, route => { requests++; return route.fulfill({ status: 503, body: 'Unavailable' }); });
    await choose(page, 'münze');
    await expect(page.getByRole('alert')).toContainText(countError ? 'Suche konnte nicht ausgeführt' : 'Originalpassagen konnten nicht geladen');
    const before = requests; await page.waitForTimeout(150); expect(requests).toBe(before); expect(before).toBe(1);
    if (!countError) await expect(page.getByRole('article')).toContainText('1 Suchwort-Treffer');
    await page.unroute(pattern);
    await page.getByRole('button', { name: countError ? 'Suche erneut laden' : 'Passagen erneut laden' }).click();
    await expect(page.getByRole('article')).toContainText('Ein Eimer voller Münzen');
  });
}

test('repeated successful searches reuse index bindings and original episode records', async ({ page }) => {
  await openExplorer(page); await choose(page, 'münze');
  await expect(page.getByRole('article').locator('.passage')).toBeVisible();
  const requests: string[] = []; page.on('request', request => requests.push(request.url()));
  await page.getByRole('searchbox').fill('kleingeld'); await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Nach einer Pause');
  expect(requests.some(url => /publication\.json|search\/manifest\.json|episodes\/.+\.json/.test(url))).toBe(false);
});

test('a changed publication cannot be combined with an already displayed catalog', async ({ page }) => {
  await openExplorer(page);
  await page.route('**/publication.json', async route => {
    const response = await route.fetch(); const value = await response.json(); value.publicationId = 'f'.repeat(64);
    await route.fulfill({ response, json: value });
  });
  await choose(page, 'münze');
  await expect(page.getByRole('alert')).toContainText('Datenstand hat sich geändert');
  await expect(page.getByRole('button', { name: 'Seite neu laden' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
});
