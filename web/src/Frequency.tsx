import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type XAxisTickContentProps } from 'recharts';
import { countEpisodes, searchEpisodes, type SearchOverview, type SearchResult } from './search';
import type { SearchData, EpisodeMetadata } from './catalog';
import { parseQuery } from './query';
import { SearchIcon } from './SearchIcon';
import { WORD_COLORS, wordStyle } from './word-colors';
import { formatPlaybackTime, type StartPlayback } from './playback';
import { type ColoredTerm } from './HighlightedText';
import { TranscriptReader } from './TranscriptReader';

const count = (value: number) => value.toLocaleString('de-DE');
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
type Submission = { id: number; terms: string[]; error?: string };
function prepare(query: string, id: number): Submission {
  try { return { ...parseQuery(query), id }; }
  catch (error) { return { id, terms: [], error: (error as Error).message }; }
}
export function Frequency({ dataBase, data, onChoose }: { dataBase: string; data: SearchData; onChoose: StartPlayback }) {
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('q') ?? '');
  const [submission, setSubmission] = useState(() => prepare(query, 0));
  const [overview, setOverview] = useState<{ id: number; value?: SearchOverview; error?: string }>({ id: -1 });
  const [mode, setMode] = useState<'top' | 'all'>('top');
  const [chartWidth, setChartWidth] = useState(0);
  const words = useMemo(() => submission.terms.map((term, index) => ({ term, color: WORD_COLORS[index] })), [submission]);
  useEffect(() => {
    if (!submission.terms.length) return;
    const controller = new AbortController();
    countEpisodes(submission.terms, controller.signal, dataBase, data.publicationId).then(value => {
      if (!controller.signal.aborted) setOverview({ id: submission.id, value });
    }).catch(error => { if (!controller.signal.aborted) setOverview({ id: submission.id, error: (error as Error).message }); });
    return () => controller.abort();
  }, [submission, dataBase, data.publicationId]);
  const inputError = prepare(query, submission.id).error;
  const ready = !!overview.value && overview.id === submission.id && !!words.length;
  const failed = overview.id === submission.id && overview.error;
  const counts = new Map(ready ? overview.value!.episodes.map(episode => [episode.episodeId, episode]) : []);
  const chronological = data.episodes.map(episode => {
    const found = counts.get(episode.episodeId);
    const values = words.map(word => found?.counts[word.term] ?? 0);
    return { ...episode, total: values.reduce((a, b) => a + b, 0), coverage: values.filter(Boolean).length,
      uniqueCount: found?.uniqueCount ?? 0, ...Object.fromEntries(values.map((value, index) => [`series${index}`, value])) };
  }).sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || order(a.episodeId, b.episodeId));
  const ranked = chronological.filter(episode => episode.total > 0).sort((a, b) => b.total - a.total || Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || order(a.episodeId, b.episodeId)).slice(0, 10);
  const plotted = mode === 'top' ? ranked : chronological;
  function submit() {
    const next = prepare(query, submission.id + 1);
    setSubmission(next);
    const url = new URL(location.href);
    if (query.trim()) url.searchParams.set('q', query.trim()); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  }
  return <section className="frequency" aria-label="Wörter und Folgen erkunden">
    <form role="search" className="query-form" onSubmit={event => { event.preventDefault(); submit(); }}>
      <div className="search-input"><SearchIcon /><label className="visually-hidden" htmlFor="podcast-query">Wörter suchen</label>
        <input type="search" id="podcast-query" value={query} autoComplete="off" maxLength={250} placeholder="Eimer Münzen Kleingeld" aria-describedby={inputError ? "search-help" : undefined} aria-invalid={!!inputError} onChange={event => setQuery(event.target.value)} />
      </div><button className="search-submit" type="submit">Suchen</button>
    </form>
    {inputError && <p className="selection-note" id="search-help" role="alert">{inputError}</p>}
    {!!words.length && !ready && !failed && <p role="status">Suchwort-Treffer werden ermittelt …</p>}
    {failed && <div><p role="alert">Die Suche konnte nicht ausgeführt werden. Fehlende Daten sind kein Nullwert. {overview.error}</p><button onClick={() => setSubmission(current => ({ ...current, id: current.id + 1 }))}>Suche erneut laden</button>{overview.error?.includes('Datenstand') && <button onClick={() => location.reload()}>Seite neu laden</button>}</div>}
    <section className="chart-panel" aria-label="Suchwortvergleich">
      <div className="chart-heading"><div><h2>Suchwort-Treffer je Folge</h2></div>
        <div className="view-toggle" role="group" aria-label="Folgen im Diagramm" data-mode={mode}><span className="view-toggle-glider" aria-hidden="true" /><button aria-pressed={mode === 'top'} onClick={() => setMode('top')}>Top 10</button><button aria-pressed={mode === 'all'} onClick={() => setMode('all')}>Alle</button></div>
      </div>
      {!words.length ? <div className="chart-empty"><p>An welche Wörter erinnerst du dich?</p></div>
        : !ready ? <div className="chart-empty"><p>{failed ? 'Die Suche ist noch nicht vollständig.' : 'Das Diagramm wartet auf die Suchergebnisse.'}</p></div>
          : <>
            <ul className="chart-legend" aria-label="Wörter im Diagramm">{words.map(word => <li key={word.term} style={wordStyle(word.color)}><i />{word.term}</li>)}</ul>
            {!ranked.length && <p role="status">Keine Treffer für diese Stichwörter.</p>}
            <div className="frequency-chart-scroll"><div className="frequency-chart">
              <ResponsiveContainer width="100%" height={370} onResize={width => setChartWidth(width)}><BarChart data={plotted} margin={{ top: 20, right: 16, bottom: 18, left: 0 }} barCategoryGap={mode === 'all' ? '10%' : '18%'} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" /><XAxis dataKey="episodeId" interval={0} height={70} axisLine={{ stroke: 'var(--line)' }} tickLine={false} tick={({ x, y, payload }: XAxisTickContentProps) => {
                  const episode = plotted.find(item => item.episodeId === payload.value)!;
                  const label = `${episode.title}; ${words.map(word => `${word.term}: ${count(counts.get(episode.episodeId)?.counts[word.term] ?? 0)}`).join('; ')}; Summe: ${count(episode.total)}`;
                  const tickIndex = plotted.indexOf(episode);
                  const stride = Math.max(1, Math.ceil(plotted.length / Math.max(1, Math.floor((chartWidth - 54) / 115))));
                  const showTitle = tickIndex % stride === Math.floor(stride / 2);
                  return <g transform={`translate(${x},${y})`} role="img" aria-label={label}><title>{label}</title>{showTitle && <text className="episode-axis-label" y={12} transform="rotate(-25)" textAnchor="end" fill="var(--muted)" fontSize={11}>{episode.title.length > 18 ? `${episode.title.slice(0, 16)}…` : episode.title}</text>}</g>;
                }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} width={38} tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                <Tooltip cursor={{ fill: 'var(--soft)' }} contentStyle={{ backgroundColor: 'var(--surface)', color: 'var(--ink)', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13 }} itemStyle={{ color: 'var(--ink)' }} labelFormatter={(label, payload) => `${payload[0]?.payload.title ?? label} · Summe ${payload[0]?.payload.total ?? 0}`} />
                {words.map((word, index) => <Bar key={word.term} dataKey={`series${index}`} name={word.term} stackId="words" fill={`color-mix(in srgb, ${word.color} var(--word-strength), white)`} stroke="none" isAnimationActive={false} maxBarSize={52} />)}
              </BarChart></ResponsiveContainer>
            </div></div>
          </>}
    </section>
    {ready && ranked.length > 0 && <section aria-label="Folgen mit den meisten Treffern" className="episode-results">
      <div className="results-heading"><h2>Top 10 Folgen</h2></div>
      {ranked.map((episode, index) => <EpisodeCard key={`${episode.episodeId}:${submission.id}`} episode={episode} index={index} words={words}
        counts={counts.get(episode.episodeId)?.counts ?? {}} dataBase={dataBase} publicationId={data.publicationId}
        onChoose={onChoose} />)}
      <p className="muted">Jedes Suchwort wird einzeln gezählt. Dieselbe Textstelle kann zu mehreren Suchwörtern passen; die Fundstellennavigation fasst solche Überschneidungen zusammen.</p>
    </section>}
  </section>;
}
type RankedEpisode = EpisodeMetadata & { total: number; coverage: number; uniqueCount: number };
/** Counts are global; original passages load when their card approaches the viewport. */
function EpisodeCard({ episode, index, words, counts, dataBase, publicationId, onChoose }: {
  episode: RankedEpisode; index: number; words: ColoredTerm[]; counts: Record<string, number>; dataBase: string; publicationId: string;
  onChoose: StartPlayback;
}) {
  const element = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(index === 0);
  const [result, setResult] = useState<SearchResult>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const shouldLoad = visible, query = words.map(word => word.term).join(' ');
  useEffect(() => {
    if (visible || !element.current) return;
    const observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) setVisible(true); }, { rootMargin: '180px' });
    observer.observe(element.current); return () => observer.disconnect();
  }, [visible]);
  useEffect(() => {
    if (!shouldLoad) return;
    const controller = new AbortController();
    searchEpisodes(query, controller.signal, { dataBase, publicationId, targetEpisodeIds: [episode.episodeId] }).then(session => {
      const found = session.initial.results[0];
      if (!found) throw new Error('Die gezählten Suchpositionen fehlen im Textstand');
      if (!controller.signal.aborted) setResult(found);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [shouldLoad, query, episode.episodeId, dataBase, publicationId, attempt]);
  return <article className="episode-card transcript-card" ref={element} aria-labelledby={`episode-heading-${episode.episodeId}`}>
    <header className="transcript-card-header">
      <div className="transcript-card-heading"><span className="rank">{String(index + 1).padStart(2, '0')}</span>
        <div><h3 id={`episode-heading-${episode.episodeId}`}>{episode.title}</h3>
          <p className="episode-meta"><time dateTime={episode.publishedAt}>{new Date(episode.publishedAt).toLocaleDateString('de-DE', { timeZone: 'UTC' })}</time>
            {episode.durationSeconds !== undefined && <span> · {formatPlaybackTime(episode.durationSeconds)}</span>}
            {result && <a href={result.webpageUrl} target="_blank" rel="noreferrer">Episodenseite ↗</a>}
          </p>
        </div>
        <button className="episode-start" disabled={!result} aria-label="Folge von Anfang abspielen" onClick={() => { if (result) onChoose(result, 0); }} title="Folge von Anfang abspielen"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></button>
      </div>
      <div className="episode-summary"><strong>{count(episode.total)} Suchwort-Treffer</strong><span>{episode.coverage}/{words.length} Suchwörter</span></div>
      {!result && <ul className="reader-legend" aria-label="Suchwörter im Transkript">{words.map(word => <li key={word.term} style={wordStyle(word.color)}><i />{word.term}<span>{count(counts[word.term] ?? 0)}</span></li>)}</ul>}
    </header>
    {result ? <TranscriptReader result={result} words={words} counts={counts} onChoose={onChoose} />
      : error ? <div className="reader-placeholder"><p role="alert">Die Originalpassagen konnten nicht geladen werden. Die Suchwort-Zählungen bleiben erhalten.</p><button onClick={() => { setError(false); setAttempt(value => value + 1); }}>Passagen erneut laden</button></div>
      : <div className="reader-placeholder"><p className="muted">{shouldLoad ? 'Transkript wird geladen …' : 'Transkript'}</p></div>}
  </article>;
}
