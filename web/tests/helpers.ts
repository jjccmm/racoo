import { expect, type Page } from '@playwright/test';
import type { SearchPage, SearchSession } from '../src/search';

type Probe = Window & { searchSession?: SearchSession; searchAbort?: AbortController; searchPromise?: Promise<SearchSession> };

/** Public built module/session contract, independent of the explorer UI. */
export async function beginSearch(page: Page, query: string, targets?: string[]) {
  await page.evaluate(async ({ query, targets }) => {
    const browser = window as Probe;
    browser.searchAbort?.abort();
    const controller = new AbortController();
    browser.searchAbort = controller;
    const manifest = await (await fetch('.vite/manifest.json')).json();
    const api = await import(new URL(manifest['src/search.ts'].file, location.href).href);
    browser.searchPromise = api.searchEpisodes(query, controller.signal, { targetEpisodeIds: targets });
    // Keep a rejection handled while a test deliberately holds a network response.
    browser.searchPromise!.catch(() => {});
  }, { query, targets });
}
export async function finishSearch(page: Page): Promise<{ page?: SearchPage; error?: string }> {
  return page.evaluate(async () => {
    const browser = window as Probe;
    try {
      const session = await browser.searchPromise!;
      browser.searchSession = session;
      return { page: session.initial };
    } catch (error) { return { error: String(error) }; }
  });
}
export async function search(page: Page, query: string, targets?: string[]) {
  await beginSearch(page, query, targets);
  return finishSearch(page);
}
export async function more(page: Page): Promise<{ page?: SearchPage; error?: string }> {
  return page.evaluate(async () => {
    try { return { page: await (window as Probe).searchSession!.loadMore() }; }
    catch (error) { return { error: String(error) }; }
  });
}
export async function choose(page: Page, word: string) {
  const input = page.getByRole('searchbox', { name: 'Wörter suchen' });
  const before = await input.inputValue();
  await input.fill([before, word].filter(Boolean).join(' '));
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
}
export async function clearWords(page: Page) {
  await page.getByRole('searchbox', { name: 'Wörter suchen' }).fill('');
  await page.getByRole('button', { name: 'Suchen', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(0);
}
export async function openExplorer(page: Page, url = './?podcast=podcast-ufo&q=') {
  await page.goto(url);
  await expect(page.getByRole('searchbox', { name: 'Wörter suchen' })).toBeVisible();
}
export function chartEpisodes(page: Page) {
  return page.getByRole('region', { name: 'Suchwortvergleich' }).getByRole('img');
}
