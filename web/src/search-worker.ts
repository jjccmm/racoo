import type { Identity, SearchPage, SearchRequest, SearchResult, Segment } from './search';

type Fragment = {
  anchors: { id: string; location: number }[];
};
type Episode = {
  title: string; episode_id: string; published_at: string; webpage_url?: string;
  source: { reference_url: string };
  audio: { url: string; sha256: string; duration_seconds: number };
  segments: (Segment & { token_points?: { text: string; at_seconds: number }[] })[];
};
type RawResult = { id: string; words: number[]; data(): Promise<Fragment> };
type Pagefind = { init(): Promise<void>; search(term: string): Promise<{ results: RawResult[] }> };

// Pagefind 1.5.2 catches some index-download errors and otherwise returns an
// empty match list. Capture failures inside this isolated worker so a failed
// search cannot masquerade as a valid zero. No engine behavior is mocked.
const originalFetch = globalThis.fetch.bind(globalThis);
let fetchFailure: Error | undefined;
globalThis.fetch = async (...arguments_: Parameters<typeof fetch>) => {
  try {
    const response = await originalFetch(...arguments_);
    if (!response.ok) throw new Error(`Suchdatei nicht erreichbar (${response.status})`);
    return response;
  } catch (error) {
    fetchFailure = error instanceof Error ? error : new Error(String(error));
    throw error;
  }
};

async function search({ moduleUrl, episodes, terms, offset }: SearchRequest): Promise<SearchPage> {
  const module = await import(/* @vite-ignore */ moduleUrl);
  const pagefind: Pagefind = module.createInstance({ language: 'de', basePath: new URL('.', moduleUrl).href });
  await pagefind.init();
  type Candidate = {
    result: RawResult; identity: Identity; positionsByTerm: Record<string, number[]>; rankSum: number;
  };
  const union = new Map<string, Candidate>();
  for (const term of terms) {
    const { results } = await pagefind.search(term);
    if (fetchFailure) throw fetchFailure;
    results.forEach((result, rank) => {
      const identity = episodes[result.id];
      if (!identity) throw new Error('Folge fehlt im Suchstand');
      const candidate = union.get(result.id) ?? { result, identity, positionsByTerm: {}, rankSum: 0 };
      // Snapshot raw per-term positions before any detail object is loaded.
      candidate.positionsByTerm[term] = [...result.words];
      candidate.rankSum += rank;
      union.set(result.id, candidate);
    });
  }
  const candidates = [...union.values()].sort((a, b) =>
    Object.keys(b.positionsByTerm).length - Object.keys(a.positionsByTerm).length ||
    a.rankSum - b.rankSum ||
    Date.parse(b.identity.publishedAt) - Date.parse(a.identity.publishedAt) ||
    (a.identity.episodeId < b.identity.episodeId ? -1 : a.identity.episodeId > b.identity.episodeId ? 1 : 0),
  );
  // Coverage and all global tie-breaks are settled before the first fragment.
  const results: SearchResult[] = await Promise.all(candidates.slice(offset, offset + 10).map(async ({ result, identity, positionsByTerm, rankSum }) => {
    const [fragment, episode]: [Fragment, Episode] = await Promise.all([
      result.data(),
      fetch(new URL(`episodes/${encodeURIComponent(identity.episodeId)}.json`, moduleUrl)).then((response) => response.json()),
    ]);
    if (episode.episode_id !== identity.episodeId || episode.published_at !== identity.publishedAt) {
      throw new Error('Suchindex und Folgendetails stimmen nicht überein');
    }
    const segmentFor = (position: number) => {
      const anchor = fragment.anchors.filter((item) => item.location <= position).at(-1);
      return anchor && episode.segments.find((segment) => segment.id === anchor.id)
        ? { segmentId: anchor.id, localWord: position - anchor.location }
        : undefined;
    };
    const pointTime = (segment: Episode['segments'][number], localWord: number) => {
      const points = segment.token_points ?? [];
      const text = points.map((point) => point.text).join('');
      if (!points.length || text !== segment.text) return segment.start_seconds;
      const wordStarts = [...segment.text.matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map((match) => match.index!);
      const charStart = wordStarts[localWord];
      if (charStart === undefined) return segment.start_seconds;
      let charOffset = 0;
      for (const point of points) {
        const nextOffset = charOffset + point.text.length;
        if (nextOffset > charStart) return Math.max(segment.start_seconds, Math.min(segment.end_seconds, point.at_seconds));
        charOffset = nextOffset;
      }
      return segment.start_seconds;
    };
    const found = new Map<string, { segmentId: string; seconds: number; terms: Set<string> }>();
    for (const [term, positions] of Object.entries(positionsByTerm)) {
      for (const position of positions) {
        const location = segmentFor(position);
        if (!location) continue;
        const segment = episode.segments.find((item) => item.id === location.segmentId)!;
        const key = `${location.segmentId}:${position}`;
        const occurrence = found.get(key) ?? {
          segmentId: location.segmentId,
          seconds: pointTime(segment, location.localWord),
          terms: new Set<string>(),
        };
        occurrence.terms.add(term);
        found.set(key, occurrence);
      }
    }
    const occurrences = [...found.entries()].map(([id, occurrence]) => {
      const nearbyTerms = new Set<string>();
      for (const other of found.values()) {
        if (Math.abs(other.seconds - occurrence.seconds) <= 30) other.terms.forEach((term) => nearbyTerms.add(term));
      }
      return { id, seconds: occurrence.seconds, terms: [...occurrence.terms].sort(), nearbyTerms: [...nearbyTerms].sort() };
    });
    const passages = episode.segments.flatMap((segment) => {
      const matches = occurrences.filter((occurrence) => occurrence.id.startsWith(`${segment.id}:`));
      return matches.length ? [{ ...segment, occurrences: matches.sort((a, b) => b.nearbyTerms.length - a.nearbyTerms.length || a.seconds - b.seconds) }] : [];
    });
    return {
      ...identity,
      searchId: result.id,
      title: episode.title,
      matchedTerms: Object.keys(positionsByTerm),
      positionsByTerm,
      rankSum,
      passages: passages.sort((a, b) =>
        Math.max(...b.occurrences.map((occurrence) => occurrence.nearbyTerms.length)) -
        Math.max(...a.occurrences.map((occurrence) => occurrence.nearbyTerms.length)) ||
        a.start_seconds - b.start_seconds,
      ),
      audioUrl: episode.audio.url,
      audioSha256: episode.audio.sha256,
      durationSeconds: episode.audio.duration_seconds,
      webpageUrl: episode.webpage_url ?? episode.source.reference_url,
    };
  }));
  return { results, total: candidates.length, terms };
}

globalThis.onmessage = async (event: MessageEvent<SearchRequest>) => {
  try {
    globalThis.postMessage({ page: await search(event.data) });
  } catch (error) {
    globalThis.postMessage({ error: error instanceof Error ? error.message : String(error) });
  }
};
