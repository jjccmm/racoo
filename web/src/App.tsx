import { useRef, useState, type SubmitEvent } from 'react';
import { searchEpisode, type SearchResult } from './search';

type SearchState =
  | { kind: 'empty' | 'loading' | 'none' | 'error' }
  | { kind: 'results'; results: SearchResult[] };

function time(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export function App() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ kind: 'empty' });
  const generation = useRef(0);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const current = ++generation.current;
    const term = query.trim();
    if (!term) { setState({ kind: 'empty' }); return; }
    setState({ kind: 'loading' });
    try {
      const results = await searchEpisode(term);
      if (current === generation.current) setState(results.length ? { kind: 'results', results } : { kind: 'none' });
    } catch {
      if (current === generation.current) setState({ kind: 'error' });
    }
  }

  return (
    <main>
      <p className="eyebrow">Podcast Words / V3</p>
      <h1>Eine erinnerte Stelle wiederfinden.</h1>
      <p className="intro">Ein Stichwort führt zur gesprochenen Passage.</p>
      <aside className="notice" aria-label="Entwicklungsstand">
        <strong>Suchnachweis · ausschließlich synthetische Beispieldaten</strong>
        <p>Die Suche arbeitet mit einem echten deutschen Pagefind-Index. Echte Folgen und Wiedergabe folgen im Pilot.</p>
      </aside>
      <form onSubmit={submit} role="search">
        <label htmlFor="query">Stichwort</label>
        <div className="search-controls">
          <input id="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zum Beispiel Münzen" />
          <button type="submit">Suchen</button>
        </div>
        <p className="muted">Deutsche Wortformen werden berücksichtigt. Suchtreffer sind keine exakten Grundformzählungen.</p>
      </form>
      <p role="status" aria-live="polite">
        {state.kind === 'empty' && 'Ein Stichwort eingeben, um eine Passage zu finden.'}
        {state.kind === 'loading' && 'Suche läuft …'}
        {state.kind === 'none' && 'Keine passende Folge gefunden.'}
        {state.kind === 'results' && `${state.results.length} passende Folge${state.results.length === 1 ? '' : 'n'}.`}
      </p>
      {state.kind === 'error' && <p role="alert">Die Suche konnte nicht geladen werden. Mit „Suchen“ bewusst erneut versuchen.</p>}
      {state.kind === 'results' && <section aria-label="Suchergebnisse">
        {state.results.map((result) => <article key={result.episodeId} className="example">
          <h2>{result.title}</h2>
          <p><time dateTime={result.publishedAt}>{new Date(result.publishedAt).toLocaleDateString('de-DE', { timeZone: 'UTC' })}</time> · Stichwort: {result.term}</p>
          {result.passages.map((passage) => <p key={passage.id}>
            <span className="timestamp" aria-label="Episodenzeit">{time(passage.start_seconds)}</span>{passage.text}
          </p>)}
        </article>)}
      </section>}
    </main>
  );
}
