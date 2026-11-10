/** Optional real Podcast UFO acceptance; run after a normal build, never in CI. */
const { chromium, expect } = require('../web/node_modules/@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.argv[2] || 'http://127.0.0.1:4174/';
const output = process.argv[3];
const root = path.resolve(__dirname, '..');

async function submit(page, query) {
  await page.getByRole('searchbox', { name: 'Wörter suchen' }).fill(query);
  const start = performance.now();
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('article').first().locator('.transcript-reader').first()).toBeVisible({ timeout: 30000 });
  return Math.round(performance.now() - start);
}
async function api(page, query, target) {
  return page.evaluate(async ({ query, target }) => {
    const manifest = await (await fetch('.vite/manifest.json')).json();
    const engine = await import(new URL(manifest['src/search.ts'].file, location.href).href);
    if (target) return (await engine.searchEpisodes(query, new AbortController().signal, { dataBase: './podcasts/podcast-ufo/', targetEpisodeIds: [target] })).initial.results[0];
    return engine.countEpisodes(query.split(' '), new AbortController().signal, './podcasts/podcast-ufo/');
  }, { query, target });
}
async function main() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(new URL('?podcast=podcast-ufo', base).href);
    const historic = JSON.parse(await fs.readFile(path.join(root, 'docs/pilot/evidence/browser-root.json'), 'utf8'));
    const cases = historic.queries.filter(item => item.expectedCoverage === 3).map(item => ({ query: item.query, id: item.expectedEpisodeId, segment: item.sourceSegmentId }));
    cases.push(...[
      ['chrome', 'ep-1cb9cafaf35776bee1f11db5dd2a5376'],
      ['gebärdensprache', 'ep-a5383bfb9a5e2a2eda93d51616a0c004'],
      ['epic', 'ep-30d06bfb875bc1a4ee69900710485a11'],
      ['kratzeis', 'ep-6b752f2bcd2309d5e5812f8d76088e7d'],
      ['münzfach', 'ep-160703518cd26df69fda431ae0604fab'],
    ].map(([query, id]) => ({ query, id })));
    const searches = [];
    for (const item of cases) {
      const elapsedMs = await submit(page, item.query);
      const overview = await api(page, item.query);
      const ranked = overview.episodes.map(episode => ({ ...episode, total: Object.values(episode.counts).reduce((a, b) => a + b, 0) }))
        .sort((a, b) => b.total - a.total || Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.episodeId.localeCompare(b.episodeId));
      const expectedRank = ranked.findIndex(episode => episode.episodeId === item.id) + 1;
      const original = await api(page, item.query, item.id);
      expect(original).toBeTruthy();
      if (item.segment) expect(original.passages.some(passage => passage.id === item.segment)).toBe(true);
      expect(original.passages.every(passage => passage.highlights.every(hit => hit.end > hit.start && hit.end <= passage.text.length))).toBe(true);
      searches.push({ query: item.query, expectedEpisodeId: item.id, expectedRank, total: ranked[expectedRank - 1]?.total, elapsedMs });
    }
    await page.getByRole('button', { name: 'Alle', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Suchwortvergleich' }).getByRole('img')).toHaveCount(106);
    await expect(page.locator('.recharts-xAxis text')).toHaveCount(0);
    expect(await page.locator('.frequency-chart-scroll').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
    const phone = await mobile.newPage(); phone.on('pageerror', error => errors.push(error.message));
    const cdp = await mobile.newCDPSession(phone);
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 62500 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const transfers = [], pending = new Set();
    mobile.on('requestfinished', request => {
      const task = request.sizes().then(sizes => transfers.push({ url: request.url(), bytes: sizes.responseBodySize })).catch(() => {});
      pending.add(task); task.finally(() => pending.delete(task));
    });
    const settle = async () => { while (pending.size) await Promise.allSettled([...pending]); };
    const bytes = () => transfers.reduce((sum, transfer) => sum + transfer.bytes, 0);
    await phone.goto(new URL('?podcast=podcast-ufo', base).href);
    await expect(phone.getByRole('searchbox')).toBeVisible({ timeout: 20000 }); await settle();
    const beforeSearchBytes = bytes();
    const coldMs = await submit(phone, 'massagesessel hotline massage'); await settle(); const throughFirstResultBytes = bytes();
    const warmMs = await submit(phone, 'massagesessel hotline massage'); await settle();
    const afterWarmBytes = bytes();
    const indexBodyBytes = transfers.filter(transfer => transfer.url.includes('.pf_')).reduce((sum, transfer) => sum + transfer.bytes, 0);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await submit(phone, 'urlaub kratzeis eis');
    const card = phone.getByRole('article').filter({ has: phone.getByRole('heading', { name: 'UFO070 Kratzeis', exact: true }) });
    await card.scrollIntoViewIfNeeded();
    const reader = card.getByRole('region', { name: /Transkript:/ }); await reader.scrollIntoViewIfNeeded();
    const map = reader.getByRole('scrollbar'), text = reader.getByRole('region', { name: 'Vollständiger Transkripttext' });
    await expect(reader.locator('.reader-segment')).toHaveCount(11);
    await expect(reader.locator('mark')).toHaveCount(18);
    await expect(map).toHaveAttribute('aria-orientation', 'vertical');
    await map.focus(); await map.press('End'); await expect.poll(() => map.getAttribute('aria-valuenow')).toBe('100');
    await map.press('Home'); await expect.poll(() => map.getAttribute('aria-valuenow')).toBe('0');
    const box = await map.boundingBox(); await phone.touchscreen.tap(box.x + box.width / 2, box.y + box.height * .7);
    await expect.poll(() => text.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    expect(await map.locator('canvas').evaluate(canvas => Math.abs(canvas.width - canvas.clientWidth * devicePixelRatio) <= 1)).toBe(true);
    const mobileOverflow = await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(mobileOverflow).toBe(false); await expect(phone.locator('audio')).toHaveCount(0);
    const report = { date: '2026-11-10', base, episodeCount: 106, searches, topFiveMatches: searches.filter(item => item.expectedRank > 0 && item.expectedRank <= 5).length,
      mobile: { viewport: '390x844', deviceScaleFactor: 2, hasTouch: true, cpuSlowdown: 4, rttMs: 150, downloadBytesPerSecond: 200000, uploadBytesPerSecond: 62500,
        cache: 'fresh context, HTTP cache disabled; second query reuses application caches', timing: 'Suchen click until first original passage is rendered', coldMs, warmMs,
        beforeSearchBytes, throughFirstResultBytes, warmAdditionalBytes: afterWarmBytes - throughFirstResultBytes, observedIndexBodyBytes: indexBodyBytes,
        byteScope: 'BrowserContext request.sizes responseBodySize, including observed dedicated-worker requests; headers excluded',
        note: 'CDP page-target CPU/network emulation on a local Windows desktop; no physical mobile-device or internet guarantee',
        verticalMinimap: true, touchTapScrolled: true, keyboardEndpoints: true, highDpiCanvas: true, mobileOverflow, audioStartedByMinimap: false }, errors };
    if (output) await fs.writeFile(path.resolve(output), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
    expect(report.topFiveMatches).toBeGreaterThanOrEqual(9); expect(errors).toEqual([]); expect(indexBodyBytes).toBeGreaterThan(0);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
