import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { searchEpisodes, type SearchPage, type SearchSession } from './search';

type State =
  | { kind: 'empty' | 'loading' | 'none' | 'error' }
  | { kind: 'results'; page: SearchPage; more: 'idle' | 'loading' | 'error' };

function time(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ kind: 'empty' });
  const active = useRef<AbortController | null>(null);
  const session = useRef<SearchSession | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    session.current = null;
    if (!query.trim()) { setState({ kind: 'empty' }); return; }
    setState({ kind: 'loading' });
    try {
      const found = await searchEpisodes(query, controller.signal);
      if (controller.signal.aborted) return;
      session.current = found;
      setState(found.initial.total ? { kind: 'results', page: found.initial, more: 'idle' } : { kind: 'none' });
    } catch {
      if (!controller.signal.aborted) setState({ kind: 'error' });
    }
  }

  async function more() {
    if (state.kind !== 'results' || state.more === 'loading' || !session.current) return;
    const current = session.current;
    setState({ ...state, more: 'loading' });
    try {
      const next = await current.loadMore();
      if (session.current !== current) return;
      setState({ kind: 'results', page: { ...next, results: [...state.page.results, ...next.results] }, more: 'idle' });
    } catch {
      if (session.current === current) setState({ ...state, more: 'error' });
    }
  }

  return <>
    <form onSubmit={submit} role="search">
      <label htmlFor="query">Stichwort oder mehrere Stichwörter</label>
      <div className="search-controls">
        <input id="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zum Beispiel Eimer Münzen Kleingeld" />
        <button type="submit">Suchen</button>
      </div>
      <p className="muted">Deutsche Wortformen werden berücksichtigt. Suchtreffer sind keine exakten Grundformzählungen.</p>
    </form>
    <p role="status" aria-live="polite">
      {state.kind === 'empty' && 'Ein Stichwort eingeben, um eine Passage zu finden.'}
      {state.kind === 'loading' && 'Suche läuft …'}
      {state.kind === 'none' && 'Keine passende Folge gefunden.'}
      {state.kind === 'results' && `${state.page.results.length} von ${state.page.total} passenden Folgen geladen.`}
    </p>
    {state.kind === 'error' && <p role="alert">Die Suche konnte nicht geladen werden. Mit „Suchen“ bewusst erneut versuchen.</p>}
    {state.kind === 'results' && <section aria-label="Suchergebnisse">
      {state.page.results.map((result) => <article key={result.episodeId} className="example">
        <h2>{result.title}</h2>
        <p><time dateTime={result.publishedAt}>{new Date(result.publishedAt).toLocaleDateString('de-DE', { timeZone: 'UTC' })}</time> · {result.matchedTerms.length}/{state.page.terms.length} Stichwörter{result.matchedTerms.length < state.page.terms.length ? ' · Teilabdeckung' : ''}</p>
        <p>Gefunden: {result.matchedTerms.join(', ')}</p>
        {result.passages.map((passage) => <p key={passage.id}>
          <span className="timestamp" aria-label="Episodenzeit">{time(passage.start_seconds)}</span>{passage.text}
        </p>)}
      </article>)}
      {state.more === 'error' && <p role="alert">Weitere Folgen konnten nicht geladen werden. Die bisherigen Ergebnisse bleiben sichtbar.</p>}
      {state.page.results.length < state.page.total && <button type="button" onClick={more} disabled={state.more === 'loading'}>
        {state.more === 'loading' ? 'Weitere Folgen werden geladen …' : 'Weitere Folgen laden'}
      </button>}
    </section>}
  </>;
}
