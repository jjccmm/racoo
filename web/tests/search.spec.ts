import { expect, test } from '@playwright/test';

type RawResult = {
  id: string;
  words: number[];
  data(): Promise<{ locations: number[]; anchors: { id: string; location: number }[] }>;
};

test('finds a remembered word in the real built transcript index', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Stichwort' }).fill('Münzen');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  const result = page.getByRole('article');
  await expect(result).toHaveCount(1);
  await expect(result).toContainText('Synthetische Beispielfolge — keine Podcastaufnahme');
  await expect(result).toContainText('16.10.2026');
  await expect(result).toContainText('Ein Eimer voller Münzen steht neben dem Tisch.');
  await expect(result).toContainText('0:10');
});

test('the visible publication, search mapping and statistics share one stable identity', async ({ page }) => {
  await page.goto('./');
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

test('a mismatched publication identity is an explicit search error with no automatic retry', async ({ page }) => {
  let requests = 0;
  await page.route('**/publication.json', (route) => {
    requests += 1;
    return route.fulfill({ json: { schemaVersion: 1, publicationId: 'a'.repeat(64), podcastId: 'synthetic-podcast', state: 'synthetic-fixture', archiveComplete: false, episodeCount: 17, episodeIds: [], searchIndexId: 'b'.repeat(64), statisticsId: 'c'.repeat(64), preparationId: null } });
  });
  await page.goto('./');
  await expect(page.getByRole('alert')).toContainText('Veröffentlichungsstand konnte nicht geladen werden');
  const initialRequests = requests;
  await page.getByRole('textbox', { name: 'Stichwort' }).fill('Münzen');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('alert').last()).toContainText('Die Suche konnte nicht geladen werden');
  await page.waitForTimeout(250);
  expect(requests).toBe(initialRequests + 1);
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

test('a failed index request is an explicit error with a deliberate retry', async ({ page }) => {
  let requests = 0;
  await page.route('**/*.pf_index', (route) => {
    requests += 1;
    return route.fulfill({ status: 503, body: 'Index temporarily unavailable' });
  });
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Stichwort' }).fill('Münzen');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Die Suche konnte nicht geladen werden');
  const failures = requests;
  await expect(page.getByRole('status')).not.toContainText('Keine passende Folge');
  await page.unroute('**/*.pf_index');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('article')).toContainText('Ein Eimer voller Münzen');
  expect(failures).toBe(1);
});

test('German word forms and subsequent queries keep the correct segment times', async ({ page }) => {
  await page.goto('./');
  const input = page.getByRole('textbox', { name: 'Stichwort' });
  const submit = page.getByRole('button', { name: 'Suchen', exact: true });
  await input.fill('Münze');
  await submit.click();
  await expect(page.getByRole('article')).toContainText('0:10');
  await expect(page.getByRole('article')).toContainText('Ein Eimer voller Münzen steht neben dem Tisch.');
  await input.fill('Kleingeld');
  await submit.click();
  await expect(page.getByRole('article')).toContainText('1:00');
  await expect(page.getByRole('article')).toContainText('Nach einer Pause sprechen wir über Kleingeld.');
  await expect(page.getByRole('article')).not.toContainText('0:10');
  await input.fill('Münzen');
  await submit.click();
  await expect(page.getByRole('article')).toContainText('0:10');
  await expect(page.getByRole('article')).not.toContainText('1:00');
});

test('title-only words, no match and empty input remain distinct from an error', async ({ page }) => {
  const files: string[] = [];
  page.on('request', (request) => files.push(request.url()));
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('Ein Stichwort eingeben');
  expect(files.filter((url) => url.includes('/search/'))).toEqual([]);
  const input = page.getByRole('textbox', { name: 'Stichwort' });
  const submit = page.getByRole('button', { name: 'Suchen', exact: true });
  await input.fill('Titelgeheimnis');
  await submit.click();
  await expect(page.getByRole('status')).toContainText('Keine passende Folge gefunden');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(files.filter((url) => url.endsWith('.pf_fragment'))).toEqual([]);
  await input.fill('   ');
  await submit.click();
  await expect(page.getByRole('status')).toContainText('Ein Stichwort eingeben');
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
    await page.goto('./');
    await page.getByRole('textbox', { name: 'Stichwort' }).fill('Münzen');
    await page.getByRole('button', { name: 'Suchen', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Die Suche konnte nicht geladen werden');
    await page.waitForTimeout(250); // Observe that scheduled work does not start a retry loop.
    expect(requests).toBe(1);
    await page.unroute(pattern);
    await page.getByRole('button', { name: 'Suchen', exact: true }).click();
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
  await page.goto('./');
  await page.getByRole('textbox', { name: 'Stichwort' }).fill('Münzen');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Suche läuft …');
  release();
  await expect(page.getByRole('article')).toContainText('Ein Eimer voller Münzen');
});
