type EventData = Record<string, string>;
declare global {
  interface Window {
    umami?: { track(name: string, data: EventData): void | Promise<unknown> };
  }
}

function track(name: string, data: EventData) {
  try {
    void Promise.resolve(window.umami?.track(name, data)).catch(() => {});
  } catch { /* Analytics must never interrupt search, even when a tracker fails. */ }
}

/** Called only for valid, nonempty form submissions, never automatic searches. */
export function trackSearch(query: string, terms: string[], podcast: string, mode: 'standard' | 'exact') {
  const context = { podcast, mode };
  track('search', { ...context, query });
  for (const word of terms) track('search-word', { ...context, word });
}
