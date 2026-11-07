import { expect, test } from '@playwright/test';

test('native rank lists match the independently recorded worked example', async ({ page }) => {
  await page.goto('./?podcast=podcast-ufo');
  const lists = await page.evaluate(async () => {
    const manifest = await (await fetch('search/manifest.json')).json();
    const directory = `search/${manifest.indexId}/`;
    const mapping = await (await fetch(`${directory}episodes.json`)).json();
    const engine = await import(new URL(`${directory}pagefind.js`, location.href).href);
    const report: Record<string, string[]> = {};
    for (const term of ['laterne', 'katzen', 'fenster']) {
      const { results }: { results: { id: string }[] } = await engine.search(term);
      report[term] = results.map((result) => mapping.episodes[result.id].episodeId);
    }
    return report;
  });
  expect(lists).toEqual({
    laterne: ['coverage-pair-a', 'coverage-pair-c', 'coverage-single-01', 'coverage-single-03', 'coverage-single-05', 'coverage-single-07', 'coverage-single-09', 'coverage-pair-b', 'coverage-pair-d', 'coverage-complete'],
    katzen: ['coverage-pair-b', 'coverage-pair-d', 'coverage-single-02', 'coverage-single-04', 'coverage-single-06', 'coverage-single-08', 'coverage-single-10', 'coverage-pair-a', 'coverage-pair-c', 'coverage-complete'],
    fenster: ['coverage-complete'],
  });
});
