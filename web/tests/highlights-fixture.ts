import { expect, type Page } from '@playwright/test';
import * as pagefind from 'pagefind';
import { gunzipSync } from 'node:zlib';

/** A real controlled Pagefind index at the publication's HTTP boundary. */
export async function controlledText(page: Page, extraPassages = false) {
  const binding = await page.evaluate(async () => {
    const manifest = await (await fetch('search/manifest.json')).json();
    const publication = await (await fetch('publication.json')).json();
    const mapping = await (await fetch(`search/${manifest.indexId}/episodes.json`)).json();
    const identity = Object.values(mapping.episodes as Record<string, { episodeId: string; publishedAt: string }>).find((episode) => episode.episodeId === 'synthetic-episode-001')!;
    const episode = await (await fetch(`search/${manifest.indexId}/episodes/${identity.episodeId}.json`)).json();
    return { manifest, publication, identity, episode };
  });
  const segments = [
    { id: 'unicode', text: '🙂  „Münzen“\tEuro-Münze\u00a0Wort/Teil.\nCafe\u0301 Straße <img src=x onerror=alert(1)> total total', start_seconds: 10, end_seconds: 30 },
    { id: 'final', text: 'Münze', start_seconds: 60, end_seconds: 70 },
  ];
  if (extraPassages) segments.push(
    { id: 'third', text: `Münze ${'Ein weiterer Gedanke. '.repeat(30)}`, start_seconds: 71, end_seconds: 79 },
    { id: 'fourth', text: 'Noch eine Münze im Text. Spätfund.', start_seconds: 80, end_seconds: 89 },
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
