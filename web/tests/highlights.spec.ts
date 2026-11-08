import { expect, test, type Page } from '@playwright/test';
import * as pagefind from 'pagefind';
import { gunzipSync } from 'node:zlib';
import { choose, search, openExplorer } from './helpers';

/** A real controlled Pagefind index at the publication's HTTP boundary. */
async function controlledText(page: Page, extraPassages = false) {
  const binding = await page.evaluate(async () => {
    const manifest = await (await fetch('search/manifest.json')).json();
    const publication = await (await fetch('publication.json')).json();
    const mapping = await (await fetch(`search/${manifest.indexId}/episodes.json`)).json();
    const identity = Object.values(mapping.episodes as Record<string, { episodeId: string; publishedAt: string }>).find((episode) => episode.episodeId === 'synthetic-episode-001')!;
    const episode = await (await fetch(`search/${manifest.indexId}/episodes/${identity.episodeId}.json`)).json();
    return { manifest, publication, identity, episode };
  });
  const segments = [
    { id: 'unicode', text: '🙂  „Münzen“\tEuro-Münze\u00a0Wort/Teil.\nCafe\u0301 Straße <img src=x onerror=alert(1)>', start_seconds: 10, end_seconds: 30 },
    { id: 'final', text: 'Münze', start_seconds: 60, end_seconds: 70 },
  ];
  if (extraPassages) segments.push(
    { id: 'third', text: `Münze ${'Ein weiterer Gedanke. '.repeat(30)}`, start_seconds: 71, end_seconds: 79 },
    { id: 'fourth', text: 'Noch eine Münze im Text.', start_seconds: 80, end_seconds: 89 },
  );
  const created = await pagefind.createIndex();
  if (!created.index || created.errors.length) throw new Error(created.errors.join('\n'));
  try {
    const escaped = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const added = await created.index.addHTMLFile({ url: `/?episode=${binding.identity.episodeId}`, content: `<html lang="de"><body><main data-pagefind-body>${segments.map((segment) => `<p id="${segment.id}">${escaped(segment.text)}</p>`).join('')}</main></body></html>` });
    if (added.errors.length) throw new Error(added.errors.join('\n'));
    const generated = await created.index.getFiles();
    if (generated.errors.length) throw new Error(generated.errors.join('\n'));
    const files = new Map(generated.files.map((file) => [file.path, Buffer.from(file.content)]));
    const fragment = generated.files.find((file) => /^fragment\/.+\.pf_fragment$/.test(file.path))!;
    const searchId = fragment.path.replace(/^fragment\//, '').replace(/\.pf_fragment$/, '');
    // Same pinned-format boundary as the production build's identity adapter.
    expect(JSON.parse(gunzipSync(fragment.content).subarray(12).toString()).url).toContain(binding.identity.episodeId);
    files.set('episodes.json', Buffer.from(JSON.stringify({ indexId: binding.manifest.indexId, publicationId: binding.publication.publicationId, episodes: { [searchId]: binding.identity } })));
    files.set(`episodes/${binding.identity.episodeId}.json`, Buffer.from(JSON.stringify({ ...binding.episode, segments })));
    await page.route(`**/search/${binding.manifest.indexId}/**`, async (route) => {
      const key = new URL(route.request().url()).pathname.split(`/search/${binding.manifest.indexId}/`)[1];
      const file = files.get(key);
      if (!file) return route.fulfill({ status: 404, body: key });
      const contentType = key.endsWith('.js') ? 'text/javascript' : key.endsWith('.wasm') ? 'application/wasm' : key.endsWith('.json') ? 'application/json' : 'application/octet-stream';
      return route.fulfill({ body: file, contentType });
    });
  } finally { await pagefind.close(); }
  return segments;
}

test('native positions mark whole original Unicode and compound tokens, merging shared term ranges', async ({ page }) => {
  await page.goto('./'); const segments = await controlledText(page);
  const found = (await search(page, 'Münze Euro Wort Teil Straße', ['synthetic-episode-001'])).page!;
  expect(found.results).toHaveLength(1);
  const passages = found.results[0].passages;
  expect(passages.map((passage) => passage.id)).toEqual(['unicode', 'final']);
  expect(passages[0].highlights.map((range) => passages[0].text.slice(range.start, range.end))).toEqual(['Münzen', 'Euro-Münze', 'Wort/Teil', 'Straße']);
  expect(passages[0].highlights.find((range) => passages[0].text.slice(range.start, range.end) === 'Wort/Teil')!.terms).toEqual(['teil', 'wort']);
  expect(passages[0].text).toBe(segments[0].text);
  expect(passages[1].highlights.map((range) => passages[1].text.slice(range.start, range.end))).toEqual(['Münze']);
});

test('original text renders safely as text with the selected word color', async ({ page }) => {
  await openExplorer(page); await controlledText(page); await choose(page, 'münze');
  const card = page.getByRole('article');
  await expect(card.locator('mark')).toHaveText(['Münzen', 'Euro-Münze', 'Münze']);
  await expect(card).toContainText('<img src=x onerror=alert(1)>'); await expect(card.locator('img')).toHaveCount(0);
  const chipColor = await page.getByRole('button', { name: 'münze entfernen' }).evaluate((element) => getComputedStyle(element).getPropertyValue('--word-color'));
  expect(await card.locator('mark').first().evaluate((element) => getComputedStyle(element).getPropertyValue('--word-color'))).toBe(chipColor);
});

test('a source/index mismatch keeps exact counts and offers a passage retry without invented highlights', async ({ page }) => {
  await page.route('**/episodes/synthetic-episode-001.json', async (route) => {
    const response = await route.fetch(); const data = await response.json(); data.segments[0].text = 'Anderer Text mit falschen Positionen.'; await route.fulfill({ response, json: data });
  });
  await openExplorer(page); await choose(page, 'münze');
  await expect(page.getByRole('alert')).toContainText('Originalpassagen konnten nicht geladen werden');
  await expect(page.getByRole('article')).toContainText('1 Vorkommen'); await expect(page.locator('mark')).toHaveCount(0);
  await page.unroute('**/episodes/synthetic-episode-001.json'); await page.getByRole('button', { name: 'Passagen erneut laden' }).click();
  await expect(page.locator('mark')).toHaveText(['Münzen']);
});

test('compact passages keep the first excerpts visible and disclose remaining original context', async ({ page }) => {
  await openExplorer(page);
  const segments = await controlledText(page, true);
  await choose(page, 'münze');
  const card = page.getByRole('article');
  await expect(card.locator('.passage:visible')).toHaveCount(2);
  await expect(card.locator('.passage').nth(0).getByRole('button', { name: /Anhören ab 0:10/ })).toBeVisible();
  await card.getByText('Weitere 2 Fundstellen', { exact: true }).click();
  await expect(card.locator('.passage:visible')).toHaveCount(4);
  const third = card.locator('.passage').nth(2);
  await expect(third.locator(':scope > p')).toContainText('Münze');
  expect((await third.locator(':scope > p').textContent())!.length).toBeLessThan(320);
  await third.getByText('Vollständiges Segment anzeigen', { exact: true }).click();
  await expect(third.locator('details p')).toHaveText(segments[2].text);
  await expect(third.getByRole('button')).toHaveAccessibleDescription(/Segmentanfang; Werbung/);
  await card.getByText('Weitere 2 Fundstellen', { exact: true }).click();
  await expect(card.locator('.passage:visible')).toHaveCount(2);
  await expect(card).toContainText('1 Vorkommen');
});
