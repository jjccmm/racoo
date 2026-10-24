import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import { loadEpisode, searchEpisodes, type Passage, type SearchPage, type SearchResult, type SearchSession } from './search';

type State =
  | { kind: 'empty' | 'loading' | 'none' | 'error' }
  | { kind: 'results'; page: SearchPage; more: 'idle' | 'loading' | 'error' };
type PlayerEpisode = Pick<SearchResult, 'episodeId' | 'title' | 'publishedAt' | 'audioUrl' | 'durationSeconds' | 'webpageUrl'>;
type EpisodeRecord = Awaited<ReturnType<typeof loadEpisode>>;

function time(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

export function SearchPanel() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ kind: 'empty' });
  const [player, setPlayer] = useState<PlayerEpisode | null>(null);
  const [targetTime, setTargetTime] = useState(0);
  const [playRequested, setPlayRequested] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [directState, setDirectState] = useState<'idle' | 'loading' | 'unknown' | 'error'>(() =>
    new URLSearchParams(window.location.search).has('episode') ? 'loading' : 'idle',
  );
  const active = useRef<AbortController | null>(null);
  const session = useRef<SearchSession | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const appliedTimeline = useRef('');
  useEffect(() => () => active.current?.abort(), []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const episodeId = url.searchParams.get('episode');
    if (!episodeId) return;
    const controller = new AbortController();
    active.current?.abort();
    active.current = controller;
    loadEpisode(episodeId, controller.signal).then((episode) => {
      if (controller.signal.aborted) return;
      if (!episode) { setDirectState('unknown'); return; }
      setPlayer(playerFrom(episode));
      setTargetTime(clamp(Number(url.searchParams.get('t') ?? 0), episode.audio.duration_seconds));
      setDirectState('idle');
    }).catch(() => { if (!controller.signal.aborted) setDirectState('error'); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const media = audio.current;
    if (!player || !media) return;
    const key = `${player.episodeId}:${targetTime}`;
    if (appliedTimeline.current === key) return;
    const syncTimeline = () => {
      media.currentTime = clamp(targetTime, Number.isFinite(media.duration) ? media.duration : player.durationSeconds);
      appliedTimeline.current = key;
      if (playRequested) {
        void media.play().catch(() => setMediaError(true));
        setPlayRequested(false);
      }
    };
    if (media.readyState >= HTMLMediaElement.HAVE_METADATA) syncTimeline();
    else {
      media.addEventListener('loadedmetadata', syncTimeline, { once: true });
      media.load();
    }
    return () => media.removeEventListener('loadedmetadata', syncTimeline);
  }, [player, targetTime, playRequested]);

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

  function choose(episode: PlayerEpisode, passage: Passage) {
    const url = new URL(window.location.href);
    url.searchParams.set('episode', episode.episodeId);
    url.searchParams.set('t', String(Math.round(passage.start_seconds)));
    window.history.replaceState(null, '', url);
    setMediaError(false);
    setTargetTime(passage.start_seconds);
    appliedTimeline.current = '';
    setPlayer(episode);
    setPlayRequested(true);
  }

  function nudge(seconds: number) {
    if (!audio.current || !player) return;
    const duration = Number.isFinite(audio.current.duration) ? audio.current.duration : player.durationSeconds;
    audio.current.currentTime = clamp(audio.current.currentTime + seconds, duration);
  }

  const directEpisode = directState === 'unknown' ? 'unknown' : directState === 'error' ? 'error' : null;
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
      {directState === 'loading' && 'Geteilte Folge wird geladen …'}
      {directEpisode === 'unknown' && 'Diese Episoden-ID ist im aktuellen Suchstand unbekannt.'}
    </p>
    {directEpisode === 'error' && <p role="alert">Die geteilte Folge konnte nicht geladen werden. Bitte die Suche erneut versuchen.</p>}
    {state.kind === 'error' && <p role="alert">Die Suche konnte nicht geladen werden. Mit „Suchen“ bewusst erneut versuchen.</p>}
    {state.kind === 'results' && <section aria-label="Suchergebnisse">
      {state.page.results.map((result) => <Result key={result.episodeId} result={result} totalTerms={state.page.terms.length} onChoose={choose} />)}
      {state.more === 'error' && <p role="alert">Weitere Folgen konnten nicht geladen werden. Die bisherigen Ergebnisse bleiben sichtbar.</p>}
      {state.page.results.length < state.page.total && <button type="button" onClick={more} disabled={state.more === 'loading'}>
        {state.more === 'loading' ? 'Weitere Folgen werden geladen …' : 'Weitere Folgen laden'}
      </button>}
    </section>}
    {player && <section className="player" aria-label="Gemeinsamer Audioplayer">
      <h2>Wiedergabe: {player.title}</h2>
      <p>{time(targetTime)} · Sprung zum Segmentanfang. Werbung kann die Zeit in der Online-Audiodatei verschieben.</p>
      <audio ref={audio} src={player.audioUrl} controls preload="metadata" onError={() => setMediaError(true)} />
      <div className="player-controls">
        <button type="button" onClick={() => nudge(-10)}>10 Sekunden zurück</button>
        <button type="button" onClick={() => nudge(10)}>10 Sekunden vor</button>
        <a href={shareHref(player.episodeId, targetTime)}>Fundstelle teilen</a>
      </div>
      {mediaError && <p role="alert">Audio nicht verfügbar. <a href={player.webpageUrl} target="_blank" rel="noreferrer">Zur Episodenseite</a></p>}
    </section>}
  </>;
}

function playerFrom(episode: NonNullable<EpisodeRecord>): PlayerEpisode {
  return {
    episodeId: episode.episode_id, title: episode.title, publishedAt: episode.published_at,
    audioUrl: episode.audio.url, durationSeconds: episode.audio.duration_seconds,
    webpageUrl: episode.webpage_url ?? episode.source.reference_url,
  };
}

function clamp(seconds: number, duration: number) {
  return Number.isFinite(seconds) ? Math.max(0, Math.min(duration, seconds)) : 0;
}

function shareHref(episodeId: string, seconds: number) {
  const url = new URL(window.location.href);
  url.searchParams.set('episode', episodeId);
  url.searchParams.set('t', String(Math.round(seconds)));
  return `${url.pathname}${url.search}`;
}

function Result({ result, totalTerms, onChoose }: { result: SearchResult; totalTerms: number; onChoose(episode: PlayerEpisode, passage: Passage): void }) {
  return <article className="example">
    <h2>{result.title}</h2>
    <p><time dateTime={result.publishedAt}>{new Date(result.publishedAt).toLocaleDateString('de-DE', { timeZone: 'UTC' })}</time> · {result.matchedTerms.length}/{totalTerms} Stichwörter{result.matchedTerms.length < totalTerms ? ' · Teilabdeckung' : ''}</p>
    <p>Gefunden: {result.matchedTerms.join(', ')}</p>
    {result.passages.map((passage) => <div className="passage" key={passage.id}>
      <PassageText passage={passage} />
      <div className="occurrences" aria-label={`Fundstellen in ${passage.id}`}>
        <button type="button" onClick={() => onChoose(result, passage)} aria-describedby={`jump-hint-${result.episodeId}-${passage.id}`}>
          Anhören ab {time(passage.start_seconds)} · {passage.terms.join(', ')}
        </button>
        <span className="muted" id={`jump-hint-${result.episodeId}-${passage.id}`}>Sprung zum Segmentanfang; Werbung kann die Zeit in der Online-Audiodatei verschieben.</span>
      </div>
    </div>)}
  </article>;
}

function PassageText({ passage }: { passage: Passage }) {
  const long = passage.text.length > 600;
  const lower = passage.text.toLocaleLowerCase('de-DE');
  const matches = passage.terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0);
  const start = long ? Math.max(0, (matches.length ? Math.min(...matches) : 0) - 140) : 0;
  const end = long ? Math.min(passage.text.length, start + 440) : passage.text.length;
  const excerpt = `${start ? '… ' : ''}${passage.text.slice(start, end)}${end < passage.text.length ? ' …' : ''}`;
  return <>
    <p><span className="timestamp" aria-label="Episodenzeit">{time(passage.start_seconds)}</span>{excerpt}</p>
    {long && <details><summary>Vollständiges Segment anzeigen</summary><p>{passage.text}</p></details>}
  </>;
}
