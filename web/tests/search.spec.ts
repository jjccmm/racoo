import { expect, test } from '@playwright/test';
import { choose, search, clearWords } from './helpers';

type RawResult = {
  id: string;
  words: number[];
  data(): Promise<{ locations: number[]; anchors: { id: string; location: number }[] }>;
};

test('finds a remembered word in the real built transcript index', async ({ page }) => {
  await page.goto('./?podcast=podcast-ufo');
  await choose(page, 'münze');
  const result = page.getByRole('article');
  await expect(result).toHaveCount(1);
  await expect(result).toContainText('Synthetische Beispielfolge — keine Podcastaufnahme');
  await expect(result).toContainText('16.10.2026');
  await expect(result).toContainText('Ein Eimer voller Münzen steht neben dem Tisch.');
  await expect(result).toContainText('0:10');
});

test('the visible publication, search mapping and statistics share one stable identity', async ({ page }) => {
  await page.goto('./?podcast=podcast-ufo');
  await expect(page.getByLabel('Veröffentlichungsstand')).toContainText('synthetic-podcast · 17 Folgen');
  const envelope = await page.evaluate(async () => {
    const publication = await (await fetch('publication.json')).json();
    const search = await (await fetch('search/manifest.json')).json();
    const mapping = await (await fetch(`search/${search.indexId}/episodes.json`)).json();
    const statistics = await (await fetch('stats/manifest.json')).json();
    const catalog = await (await fetch('stats/catalog.json')).json();
    return { publication, search, mapping, statistics, catalog };
  });
  expect(envelope.publication.state).toBe('synthetic-fixture');
  expect(envelope.publication.archiveComplete).toBe(false);
  expect(envelope.search.publicationId).toBe(envelope.publication.publicationId);
  expect(envelope.mapping.publicationId).toBe(envelope.publication.publicationId);
  expect(envelope.statistics.publicationId).toBe(envelope.publication.publicationId);
  expect(envelope.catalog.publicationId).toBe(envelope.publication.publicationId);
  expect(Object.values(envelope.mapping.episodes as Record<string, { episodeId: string }>).map(({ episodeId }) => episodeId).sort())
    .toEqual(envelope.publication.episodeIds);
});

test('a mismatched publication identity is an explicit startup error with a deliberate retry', async ({ page }) => {
  let requests = 0;
  await page.route('**/publication.json', (route) => {
    requests += 1;
    return route.fulfill({ json: { schemaVersion: 1, publicationId: 'a'.repeat(64), podcastId: 'synthetic-podcast', state: 'synthetic-fixture', archiveComplete: false, episodeCount: 17, episodeIds: [], searchIndexId: 'b'.repeat(64), statisticsId: 'c'.repeat(64), preparationId: null } });
  });
  await page.goto('./?podcast=podcast-ufo');
  await expect(page.getByRole('alert').first()).toContainText('Wortstatistik konnte nicht geladen werden');
  const initial = requests;
  await page.waitForTimeout(250); expect(requests).toBe(initial);
  await page.unroute('**/publication.json');
  await page.getByRole('button', { name: 'Wortstatistik erneut laden' }).click();
  await expect(page.getByRole('combobox')).toBeVisible();
});

test('the index maps every candidate to stable identity and date before fragment loads', async ({ page }) => {
  const fragments: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.pf_fragment')) fragments.push(request.url());
  });
  await page.goto('./?podcast=podcast-ufo');
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

test('a failed index request is an explicit error with a deliberate retry', async ({ page }) => {
  let requests = 0;
  await page.route('**/*.pf_index', (route) => {
    requests += 1;
    return route.fulfill({ status: 503, body: 'Index temporarily unavailable' });
  });
  await page.goto('./?podcast=podcast-ufo');
  await choose(page, 'münze');
  await expect(page.getByRole('alert')).toContainText('Die Originalpassagen konnten nicht geladen werden');
  const failures = requests;
  await expect(page.getByRole('article')).toContainText('1 Vorkommen');
  await page.unroute('**/*.pf_index');
  await page.getByRole('button', { name: 'Passagen erneut laden' }).click();
  await expect(page.getByRole('article')).toContainText('Ein Eimer voller Münzen');
  expect(failures).toBe(1);
});

test('German word forms and changing selections keep correct segment times', async ({ page }) => {
  await page.goto('./?podcast=podcast-ufo'); await choose(page, 'münze');
  await expect(page.getByRole('article')).toContainText('0:10');
  await expect(page.getByRole('article').locator('mark')).toHaveText(['Münzen']);
  await clearWords(page); await choose(page, 'kleingeld');
  await expect(page.getByRole('article')).toContainText('1:00');
  await expect(page.getByRole('article')).not.toContainText('0:10');
  await clearWords(page); await choose(page, 'münze');
  await expect(page.getByRole('article')).toContainText('0:10');
  await expect(page.getByRole('article')).not.toContainText('1:00');
});

test('title-only words and no matches stay empty without loading any details', async ({ page }) => {
  const details: string[] = [];
  page.on('request', (request) => { if (request.url().endsWith('.pf_fragment')) details.push(request.url()); });
  await page.goto('./?podcast=podcast-ufo'); expect(details).toEqual([]);
  expect((await search(page, 'Titelgeheimnis')).page!.total).toBe(0);
  expect((await search(page, 'unauffindbareswort')).page!.total).toBe(0);
  expect((await search(page, '   ')).page!.total).toBe(0);
  expect(details).toEqual([]); await expect(page.getByRole('alert')).toHaveCount(0);
});

test('the pinned native API preserves independent query positions and segment anchors', async ({ page }) => {
  await page.goto('./?podcast=podcast-ufo');
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

for (const [description, pattern] of [
  ['manifest', '**/search/manifest.json'],
  ['engine module', '**/search/*/pagefind.js'],
  ['metadata', '**/*.pf_meta'],
  ['fragment details', '**/*.pf_fragment'],
  ['original episode record', '**/episodes/synthetic-episode-001.json'],
] as const) {
  test(`failed ${description} stays an error until a deliberate retry`, async ({ page }) => {
    let requests = 0;
    await page.route(pattern, (route) => {
      requests += 1;
      return route.fulfill({ status: 503, body: 'Temporarily unavailable' });
    });
    await page.goto('./?podcast=podcast-ufo');
    await choose(page, 'münze');
    await expect(page.getByRole('alert')).toContainText('Die Originalpassagen konnten nicht geladen werden');
    await page.waitForTimeout(250); // Observe that scheduled work does not start a retry loop.
    expect(requests).toBe(1);
    await page.unroute(pattern);
    await page.getByRole('button', { name: 'Passagen erneut laden' }).click();
    await expect(page.getByRole('article')).toContainText('Ein Eimer voller Münzen');
  });
}

test('search loading is visible while the index manifest is pending', async ({ page }) => {
  let release: () => void = () => {};
  const pending = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/search/manifest.json', async (route) => {
    await pending;
    await route.continue();
  });
  await page.goto('./?podcast=podcast-ufo');
  await choose(page, 'münze');
  await expect(page.getByRole('status')).toContainText('Originalpassagen werden geladen');
  release();
  await expect(page.getByRole('article')).toContainText('Ein Eimer voller Münzen');
});
