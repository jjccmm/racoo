import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type XAxisTickContentProps } from 'recharts';
import { countEpisodes, searchEpisodes, type SearchOverview, type SearchResult, type Passage } from './search';
import type { SearchData, EpisodeMetadata } from './catalog';
import { parseQuery } from './query';
import { SearchIcon } from './SearchIcon';
import { WORD_COLORS, wordStyle } from './word-colors';
import { formatPlaybackTime, type PlayerEpisode } from './playback';
import { HighlightedText, type ColoredTerm } from './HighlightedText';
import { TranscriptReader } from './TranscriptReader';

const count = (value: number) => value.toLocaleString('de-DE');
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
type Submission = { id: number; terms: string[]; ignored: string[]; error?: string };
function prepare(query: string, excluded: string[], id: number): Submission {
  try { return { ...parseQuery(query, excluded), id }; }
  catch (error) { return { id, terms: [], ignored: [], error: (error as Error).message }; }
}
export function Frequency({ dataBase, data, onChoose }: { dataBase: string; data: SearchData; onChoose(episode: PlayerEpisode, passage: Passage): void }) {
  const [query, setQuery] = useState(() => new URLSearchParams(location.search).get('q') ?? '');
  const [submission, setSubmission] = useState(() => prepare(query, data.excluded, 0));
  const [overview, setOverview] = useState<{ id: number; value?: SearchOverview; error?: string }>({ id: -1 });
  const [mode, setMode] = useState<'top' | 'all'>('top');
  const [opened, setOpened] = useState<string>();
  const words = useMemo(() => submission.terms.map((term, index) => ({ term, color: WORD_COLORS[index] })), [submission]);
  useEffect(() => {
    if (!submission.terms.length) return;
    const controller = new AbortController();
    countEpisodes(submission.terms, controller.signal, dataBase, data.publicationId).then(value => {
      if (!controller.signal.aborted) setOverview({ id: submission.id, value });
    }).catch(error => { if (!controller.signal.aborted) setOverview({ id: submission.id, error: (error as Error).message }); });
    return () => controller.abort();
  }, [submission, dataBase, data.publicationId]);
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
    const next = prepare(query, data.excluded, submission.id + 1);
    setSubmission(next); setOpened(undefined);
    const url = new URL(location.href);
    if (query.trim()) url.searchParams.set('q', query.trim()); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
  }
  return <section className="frequency" aria-label="Wörter und Folgen erkunden">
    <form role="search" className="query-form" onSubmit={event => { event.preventDefault(); submit(); }}>
      <div className="search-input"><SearchIcon /><label className="visually-hidden" htmlFor="podcast-query">Wörter suchen</label>
        <input type="search" id="podcast-query" value={query} autoComplete="off" maxLength={250} placeholder="Eimer Münzen Kleingeld" aria-describedby="search-help" onChange={event => setQuery(event.target.value)} />
      </div><button className="search-submit" type="submit">Suchen</button>
    </form>
    <p className="muted selection-note" id="search-help">Bis zu fünf Stichwörter. Wortformen und Wortanfänge können passen. Stoppwörter und manuell ausgeschlossene Wörter werden ignoriert.</p>
    {submission.ignored.length > 0 && <p className="muted" role="status">Ignoriert: {submission.ignored.join(', ')}</p>}
    {submission.error && <p role="alert">{submission.error}</p>}
    {!!words.length && !ready && !failed && <p role="status">Suchwort-Treffer werden ermittelt …</p>}
    {failed && <div><p role="alert">Die Suche konnte nicht ausgeführt werden. Fehlende Daten sind kein Nullwert. {overview.error}</p><button onClick={() => setSubmission(current => ({ ...current, id: current.id + 1 }))}>Suche erneut laden</button>{overview.error?.includes('Datenstand') && <button onClick={() => location.reload()}>Seite neu laden</button>}</div>}
    <section className="chart-panel" aria-label="Suchwortvergleich">
      <div className="chart-heading"><div><h2>Suchwort-Treffer je Folge</h2><p className="muted">Absolute Anzahl der passenden Textpositionen je Suchwort</p></div>
        <div className="view-toggle" aria-label="Folgen im Diagramm"><button aria-pressed={mode === 'top'} onClick={() => setMode('top')}>Top 10</button><button aria-pressed={mode === 'all'} onClick={() => setMode('all')}>Alle</button></div>
      </div>
      {!words.length ? <div className="chart-empty"><p>{submission.ignored.length ? 'Ergänze ein aussagekräftiges Stichwort.' : 'An welche Wörter erinnerst du dich?'}</p></div>
        : !ready ? <div className="chart-empty"><p>{failed ? 'Die Suche ist noch nicht vollständig.' : 'Das Diagramm wartet auf die Suchergebnisse.'}</p></div>
          : <>
            <ul className="chart-legend" aria-label="Wörter im Diagramm">{words.map(word => <li key={word.term} style={wordStyle(word.color)}><i />{word.term}</li>)}</ul>
            {!ranked.length && <p role="status">Keine Treffer für diese Stichwörter.</p>}
            {plotted.length > 3 && <p className="chart-scroll-note muted">Im Diagramm seitlich scrollen, um weitere Folgen zu sehen.</p>}
            <div className="frequency-chart-scroll"><div className="frequency-chart" style={{ width: `max(100%, ${Math.max(580, plotted.length * 95)}px)` }}>
              <ResponsiveContainer width="100%" height={370}><BarChart data={plotted} margin={{ top: 20, right: 16, bottom: 40, left: 0 }} barCategoryGap="28%" accessibilityLayer>
                <CartesianGrid vertical={false} stroke="#e7ece9" strokeDasharray="3 4" /><XAxis dataKey="episodeId" interval={0} height={85} axisLine={false} tickLine={false} tick={({ x, y, payload }: XAxisTickContentProps) => {
                  const episode = plotted.find(item => item.episodeId === payload.value)!;
                  const label = `${episode.title}; ${words.map(word => `${word.term}: ${count(counts.get(episode.episodeId)?.counts[word.term] ?? 0)}`).join('; ')}; Summe: ${count(episode.total)}`;
                  return <g transform={`translate(${x},${y})`} role="img" aria-label={label}><title>{label}</title><text y={12} transform="rotate(-25)" textAnchor="end" fill="#62626b" fontSize={11}>{episode.title.length > 22 ? `${episode.title.slice(0, 20)}…` : episode.title}</text></g>;
                }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} width={38} tick={{ fontSize: 11, fill: '#62626b' }} />
                <Tooltip cursor={{ fill: '#f4f6f5' }} contentStyle={{ borderRadius: 8, border: '1px solid #dce4df', fontSize: 13 }} labelFormatter={(label, payload) => `${payload[0]?.payload.title ?? label} · Summe ${payload[0]?.payload.total ?? 0}`} />
                {words.map((word, index) => <Bar key={word.term} dataKey={`series${index}`} name={word.term} stackId="words" fill={word.color} stroke="#fff" strokeWidth={1} isAnimationActive={false} maxBarSize={52} />)}
              </BarChart></ResponsiveContainer>
            </div></div>
          </>}
    </section>
    {ready && ranked.length > 0 && <section aria-label="Folgen mit den meisten Treffern" className="episode-results">
      <div className="results-heading"><h2>Passende Folgen</h2><span>Nach Suchwort-Treffern · Top 10</span></div>
      {ranked.map((episode, index) => <EpisodeCard key={`${episode.episodeId}:${submission.id}`} episode={episode} index={index} words={words}
        counts={counts.get(episode.episodeId)?.counts ?? {}} dataBase={dataBase} publicationId={data.publicationId}
        opened={opened === episode.episodeId} onToggle={() => setOpened(current => current === episode.episodeId ? undefined : episode.episodeId)} onChoose={onChoose} />)}
      <p className="muted">Jedes Suchwort wird einzeln gezählt. Dieselbe Textstelle kann zu mehreren Suchwörtern passen; die Fundstellennavigation fasst solche Überschneidungen zusammen.</p>
    </section>}
  </section>;
}
function Excerpt({ passage, words }: { passage: Passage; words: ColoredTerm[] }) {
  let from = Math.max(0, (passage.highlights[0]?.start ?? 0) - 85);
  while (from > 0 && !/\s/u.test(passage.text[from - 1])) from--;
  let to = Math.min(passage.text.length, from + 280);
  while (to < passage.text.length && !/\s/u.test(passage.text[to])) to++;
  return <p>{from > 0 && '… '}<HighlightedText text={passage.text} highlights={passage.highlights} words={words} from={from} to={to} />{to < passage.text.length && ' …'}</p>;
}

type RankedEpisode = EpisodeMetadata & { total: number; coverage: number; uniqueCount: number };
/** Counts are global; original passages load when their card approaches the viewport. */
function EpisodeCard({ episode, index, words, counts, dataBase, publicationId, opened, onToggle, onChoose }: {
  episode: RankedEpisode; index: number; words: ColoredTerm[]; counts: Record<string, number>; dataBase: string; publicationId: string;
  opened: boolean; onToggle(): void; onChoose(episode: PlayerEpisode, passage: Passage): void;
}) {
  const element = useRef<HTMLElement>(null), button = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(index === 0);
  const [result, setResult] = useState<SearchResult>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const shouldLoad = visible || opened, query = words.map(word => word.term).join(' ');
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
  return <article className="episode-card" ref={element}>
    <div className="episode-heading"><span className="rank">{String(index + 1).padStart(2, '0')}</span><div><h3>{episode.title}</h3><time dateTime={episode.publishedAt}>{new Date(episode.publishedAt).toLocaleDateString('de-DE', { timeZone: 'UTC' })}</time></div><strong>{count(episode.total)} Suchwort-Treffer</strong></div>
    <ul className="episode-counts">{words.map(word => <li key={word.term} style={wordStyle(word.color)}>{word.term} <strong>{count(counts[word.term] ?? 0)}</strong></li>)}<li className="coverage">{episode.coverage}/{words.length} Suchwörter</li></ul>
    {result ? <>
      <div className="passages">{result.passages.slice(0, 2).map(passage => <div className="passage" key={passage.id}>
        <div className="occurrences" aria-label={`Fundstellen in ${passage.id}`}><button onClick={() => onChoose(result, passage)} aria-label={`Anhören ab ${formatPlaybackTime(passage.start_seconds)} · ${passage.terms.join(', ')}`} aria-describedby={`jump-hint-${episode.episodeId}`}>▶ {formatPlaybackTime(passage.start_seconds)}</button></div>
        <Excerpt passage={passage} words={words} />
      </div>)}</div>
      <div className="episode-actions"><button ref={button} aria-expanded={opened} onClick={onToggle}>{opened ? 'Transkript schließen' : 'Transkript öffnen'} · {episode.uniqueCount} {episode.uniqueCount === 1 ? 'Fundstelle' : 'Fundstellen'}</button><a href={result.webpageUrl} target="_blank" rel="noreferrer">Episodenseite ↗</a></div>
      {opened && <TranscriptReader result={result} words={words} onChoose={onChoose} onClose={() => { onToggle(); requestAnimationFrame(() => button.current?.focus()); }} />}
    </> : error ? <div><p role="alert">Die Originalpassagen konnten nicht geladen werden. Die Suchwort-Zählungen bleiben erhalten.</p><button onClick={() => { setError(false); setAttempt(value => value + 1); }}>Passagen erneut laden</button></div>
      : <p className="muted">{shouldLoad ? 'Originalpassagen werden geladen …' : 'Originalpassagen erscheinen beim Öffnen dieser Folge.'}</p>}
    <p className="episode-footer" id={`jump-hint-${episode.episodeId}`}>Sprung zum Segmentanfang; Werbung kann die Zeit in der Online-Audiodatei verschieben.</p>
  </article>;
}
