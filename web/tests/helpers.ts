import { expect, type Page } from '@playwright/test';
import type { SearchPage, SearchSession } from '../src/search';

type Probe = Window & { searchSession?: SearchSession; searchAbort?: AbortController; searchPromise?: Promise<SearchSession> };

/** Public built module/session contract, independent of the explorer's lemma-only UI. */
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
export async function choose(page: Page, lemma: string) {
  await page.getByRole('combobox', { name: 'Wörter suchen' }).fill(lemma);
  await page.getByRole('option', { name: lemma, exact: true }).click();
  await expect(page.getByRole('button', { name: `${lemma} entfernen` })).toBeVisible();
}
export async function clearWords(page: Page) {
  const chips = page.getByRole('list', { name: 'Ausgewählte Grundformen' }).getByRole('button');
  while (await chips.count()) await chips.first().click();
}
