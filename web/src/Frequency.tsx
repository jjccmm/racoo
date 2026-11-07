import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { searchEpisodes, type Passage, type SearchResult } from './search';
import { formatPlaybackTime, type PlayerEpisode } from './playback';
import { countPairs } from './statistics';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Word = { lemma: string; stopword: boolean; totalCount: number; shard: string };
type Episode = { episodeId: string; title: string; publishedAt: string; totalWords: number; distinctWords: number };
type Selected = Word & { color: string; token: number; state: 'loading' | 'ready' | 'error'; values: Map<string, number> };
const COLORS = ['#215d4d', '#b64e29', '#345f9c', '#85508b', '#8c6810'];
const normalize = (value: string) => value.normalize('NFC').toLocaleLowerCase('de-DE').trim();
const identityOrder = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const count = (value: number) => value.toLocaleString('de-DE');
const wordStyle = (color: string) => ({ '--word-color': color } as CSSProperties);

export function Frequency({ publicationId, words, episodes, onChoose }: { onChoose(episode: PlayerEpisode, passage: Passage): void; publicationId: string; words: Word[]; episodes: Episode[] }) {
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState(false);
  const [active, setActive] = useState(-1);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [details, setDetails] = useState<{ key: string; results?: SearchResult[]; error?: boolean }>({ key: '' });
  const [retry, setRetry] = useState(0);
  const [mode, setMode] = useState<'top' | 'all'>('top');
  const field = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const requests = useRef(new Map<number, AbortController>());
  const sequence = useRef(0);
  const term = normalize(query);
  const suggestions = words.filter((word) => !selected.some((item) => item.lemma === word.lemma) && normalize(word.lemma).includes(term))
    .sort((a, b) => {
      const priority = (lemma: string) => lemma === term ? 0 : lemma.startsWith(term) ? 1 : 2;
      return priority(normalize(a.lemma)) - priority(normalize(b.lemma)) || b.totalCount - a.totalCount || identityOrder(a.lemma, b.lemma);
    }).slice(0, 10);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!field.current?.contains(event.target as Node)) setOpened(false); };
    document.addEventListener('pointerdown', dismiss);
    const pending = requests.current;
    return () => { document.removeEventListener('pointerdown', dismiss); pending.forEach((controller) => controller.abort()); };
  }, []);

  async function load(word: Selected) {
    const controller = new AbortController();
    requests.current.set(word.token, controller);
    setSelected((current) => current.map((item) => item.token === word.token ? { ...item, state: 'loading' } : item));
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}stats/${word.shard}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const shard = await response.json();
      if (shard.schemaVersion !== 2 || shard.publicationId !== publicationId || !shard.counts || typeof shard.counts !== 'object' || Array.isArray(shard.counts)) throw new Error('Invalid counts');
      const values = new Map<string, number>(countPairs(shard.counts[word.lemma], episodes.length).map(([index, value]) => [episodes[index].episodeId, value]));
      if (!controller.signal.aborted) setSelected((current) => current.map((item) => item.token === word.token ? { ...item, values, state: 'ready' } : item));
    } catch {
      if (!controller.signal.aborted) setSelected((current) => current.map((item) => item.token === word.token ? { ...item, state: 'error' } : item));
    } finally { requests.current.delete(word.token); }
  }
  function choose(word: Word) {
    if (selected.length >= 5 || selected.some((item) => item.lemma === word.lemma)) return;
    const item: Selected = { ...word, token: ++sequence.current, color: COLORS.find((color) => !selected.some((entry) => entry.color === color))!, values: new Map(), state: 'loading' };
    setSelected((current) => [...current, item]);
    setQuery(''); setOpened(false); setActive(-1);
    input.current?.focus();
    void load(item);
  }
  function remove(word: Selected) {
    requests.current.get(word.token)?.abort();
    setSelected((current) => current.filter((item) => item.token !== word.token));
  }
  const ready = selected.length > 0 && selected.every((word) => word.state === 'ready');
  const chronological = episodes.map((episode) => ({ ...episode,
    total: selected.reduce((sum, word) => sum + (word.values.get(episode.episodeId) ?? 0), 0),
    ...Object.fromEntries(selected.map((word) => [`series${word.token}`, word.values.get(episode.episodeId) ?? 0])),
  })).sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || identityOrder(a.episodeId, b.episodeId));
  const ranked = chronological.filter((episode) => episode.total > 0).sort((a, b) => b.total - a.total || Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || identityOrder(a.episodeId, b.episodeId)).slice(0, 10);
  const plotted = mode === 'top' ? ranked : chronological;
  const passageKey = ready && ranked.length ? JSON.stringify({ tokens: selected.map((word) => word.token), terms: selected.map((word) => word.lemma), ids: ranked.map((episode) => episode.episodeId) }) : '';
  useEffect(() => {
    if (!passageKey) return;
    const controller = new AbortController();
    const request = JSON.parse(passageKey) as { terms: string[]; ids: string[] };
    searchEpisodes(request.terms.join(' '), controller.signal, { targetEpisodeIds: request.ids }).then((session) => {
      if (!controller.signal.aborted) setDetails({ key: passageKey, results: session.initial.results });
    }).catch(() => { if (!controller.signal.aborted) setDetails({ key: passageKey, error: true }); });
    return () => controller.abort();
  }, [passageKey, retry]);
  const passagesLoading = !!passageKey && (details.key !== passageKey || (!details.results && !details.error));

  return <section className="frequency" aria-label="Wörter und Folgen erkunden">
    <div className="word-field" ref={field} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpened(false); }}>
      <label htmlFor="lemma">Wörter suchen</label>
      <input ref={input} id="lemma" role="combobox" aria-autocomplete="list" aria-expanded={opened && selected.length < 5} aria-controls="word-options"
        aria-activedescendant={opened && active >= 0 && suggestions[active] ? `word-option-${active}` : undefined}
        value={query} placeholder="Zum Beispiel Eimer, Münze oder Kleingeld" autoComplete="off"
        onFocus={() => { setOpened(true); setActive(-1); }}
        onChange={(event) => { setQuery(event.target.value); setOpened(true); setActive(-1); }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') { setOpened(false); setActive(-1); }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); setOpened(true);
            setActive((current) => suggestions.length ? (current < 0 ? (event.key === 'ArrowDown' ? 0 : suggestions.length - 1) : (current + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length) : -1);
          }
          if (event.key === 'Enter' && opened && suggestions.length && selected.length < 5) { event.preventDefault(); choose(suggestions[active < 0 ? 0 : active]); }
        }} />
      {opened && selected.length < 5 && <ul id="word-options" role="listbox" aria-label="Grundformvorschläge" className="autocomplete">
        {suggestions.map((word, index) => <li id={`word-option-${index}`} role="option" aria-label={word.lemma} aria-selected={active === index} key={word.lemma}
          onPointerDown={(event) => event.preventDefault()} onClick={() => choose(word)}><span>{word.lemma}</span><small>{count(word.totalCount)} im Bestand</small></li>)}
        {!suggestions.length && <li className="no-option">Keine passende Grundform.</li>}
      </ul>}
    </div>
    <ul className="selected-words" aria-label="Ausgewählte Grundformen">{selected.map((word) => <li key={word.token}><button className="word-chip" style={wordStyle(word.color)} aria-label={`${word.lemma} entfernen`} onClick={() => remove(word)}>{word.lemma}<span aria-hidden="true"> ×</span></button></li>)}</ul>
    <p className="muted selection-note">{selected.length === 5 ? 'Fünf Wörter ausgewählt. Entferne ein Wort, um ein anderes zu wählen. ' : ''}Automatische Stoppwörter und Wörter aus einer manuell gepflegten Zusatzliste sind von der Auswahl ausgeschlossen. Gesamtwörter, verschiedene und neue Wörter enthalten weiterhin alle alphabetischen Wörter.</p>
    {selected.some((word) => word.state === 'loading') && <p role="status">Wortzählungen werden geladen …</p>}
    {selected.filter((word) => word.state === 'error').map((word) => <div key={word.token}><p role="alert">Die Zählungen für {word.lemma} konnten nicht geladen werden. Fehlende Daten sind kein Nullwert.</p><button onClick={() => void load(word)}>Zählungen erneut laden</button></div>)}
    <section className="chart-panel" aria-label="Grundformvergleich">
      <div className="chart-heading"><div><p className="eyebrow">Wörter im Verlauf</p><h2>Welche Folge erzählt davon?</h2><p className="muted">Absolute Vorkommen je Folge</p></div>
        <div className="view-toggle" aria-label="Folgen im Diagramm"><button aria-pressed={mode === 'top'} onClick={() => setMode('top')}>Top 10</button><button aria-pressed={mode === 'all'} onClick={() => setMode('all')}>Alle</button></div>
      </div>
      {ready && plotted.length > 3 && <p className="chart-scroll-note muted">Im Diagramm seitlich scrollen, um weitere Folgen zu sehen.</p>}
      {!selected.length ? <div className="chart-empty"><strong>Ein Wort ist der Anfang.</strong><p>Wähle oben ein Wort. Hier siehst du die Folgen mit den meisten Vorkommen.</p><div className="empty-bars" aria-hidden="true">{[35, 65, 48, 90, 70, 45, 28].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div>
        : !ready ? <div className="chart-empty"><p>Das Diagramm wartet auf vollständige Zählungen.</p></div>
          : <><ul className="chart-legend" aria-label="Wörter im Diagramm">{selected.map((word) => <li key={word.token} style={wordStyle(word.color)}><i />{word.lemma}</li>)}</ul>
            {!ranked.length && <p role="status">Keine Vorkommen für die ausgewählten Wörter.</p>}
            <div className="frequency-chart-scroll"><div className="frequency-chart" style={{ width: `max(100%, ${Math.max(580, plotted.length * 95)}px)` }}>
              <ResponsiveContainer width="100%" height={370}><BarChart data={plotted} margin={{ top: 20, right: 22, bottom: 55, left: 0 }} accessibilityLayer>
                <CartesianGrid vertical={false} stroke="#dbe5df" /><XAxis dataKey="title" interval={0} angle={-25} textAnchor="end" height={85} tick={{ fontSize: 12 }} tickFormatter={(title: string) => title.length > 22 ? `${title.slice(0, 20)}…` : title} />
                <YAxis allowDecimals={false} width={45} /><Tooltip labelStyle={{ fontWeight: 700 }} formatter={(value, name) => [value, name]} contentStyle={{ borderRadius: 10 }} labelFormatter={(label, payload) => `${label} · Summe ${payload[0]?.payload.total ?? 0}`} />
                {selected.map((word) => <Bar key={word.token} dataKey={`series${word.token}`} name={word.lemma} stackId="words" fill={word.color} isAnimationActive={false} maxBarSize={72} />)}
              </BarChart></ResponsiveContainer>
            </div></div>
            <details className="chart-data"><summary>Diagrammdaten anzeigen</summary><div className="counts-scroll"><table aria-label="Vorkommen nach Folge"><thead><tr><th>Folge</th>{selected.map((word) => <th key={word.token}>{word.lemma}</th>)}<th>Summe</th></tr></thead><tbody>{plotted.map((episode) => <tr key={episode.episodeId}><th scope="row">{episode.title}</th>{selected.map((word) => <td key={word.token}>{count(word.values.get(episode.episodeId) ?? 0)}</td>)}<td>{count(episode.total)}</td></tr>)}</tbody></table></div></details>
          </>}
    </section>
    {ready && ranked.length > 0 && <section aria-label="Folgen mit den meisten Vorkommen" className="episode-results">
      <h2>Die passenden Folgen</h2>
      <p className="muted">Nach der Summe der ausgewählten Wörter · höchstens zehn Folgen</p>
      {ranked.map((episode, index) => <EpisodeCard
        key={episode.episodeId} episode={episode} index={index} words={selected}
        result={details.key === passageKey ? details.results?.find((item) => item.episodeId === episode.episodeId) : undefined}
        loading={passagesLoading} error={details.key === passageKey && !!details.error} onChoose={onChoose}
      />)}
    </section>}
    {ready && ranked.length > 0 && <p className="muted">Die Zahlen zählen Grundformen. Markierungen zeigen gefundene Wortformen und können davon abweichen; auch verwandte Formen und Wortanfänge können passen.</p>}
    {passagesLoading && <p role="status">Originalpassagen werden geladen …</p>}
    {details.key === passageKey && details.error && <div><p role="alert">Die Originalpassagen konnten nicht geladen werden. Die exakten Zählungen bleiben erhalten.</p><button onClick={() => { setDetails({ key: passageKey }); setRetry((value) => value + 1); }}>Passagen erneut laden</button></div>}
  </section>;
}

function EpisodeCard({ episode, index, words, result, loading, error, onChoose }: {
  episode: Episode & { total: number }; index: number; words: Selected[];
  result?: SearchResult; loading: boolean; error: boolean;
  onChoose(episode: PlayerEpisode, passage: Passage): void;
}) {
  return <article className="episode-card">
    <div className="episode-heading">
      <span className="rank">{String(index + 1).padStart(2, '0')}</span>
      <div><h3>{episode.title}</h3>
        <time dateTime={episode.publishedAt}>{new Date(episode.publishedAt).toLocaleDateString('de-DE', { timeZone: 'UTC' })}</time>
      </div>
      <strong>{count(episode.total)} Vorkommen</strong>
    </div>
    <ul className="episode-counts">{words.map((word) => <li key={word.token} style={wordStyle(word.color)}>
      {word.lemma} <strong>{count(word.values.get(episode.episodeId) ?? 0)}</strong>
    </li>)}</ul>
    {loading && <p className="muted">Originalpassagen werden geladen …</p>}
    {error && <p className="muted">Originalpassagen derzeit nicht verfügbar.</p>}
    {!loading && !error && (result?.passages.length ? <>
      <a className="episode-link" href={result.webpageUrl} target="_blank" rel="noreferrer">Zur Episodenseite ↗</a>
      {result.passages.map((passage) => <div className="passage" key={passage.id}>
        <PassageText passage={passage} words={words} />
        <div className="occurrences" aria-label={`Fundstellen in ${passage.id}`}>
          <button onClick={() => onChoose(result, passage)} aria-describedby={`jump-hint-${episode.episodeId}-${passage.id}`}>
            Anhören ab {formatPlaybackTime(passage.start_seconds)} · {passage.terms.join(', ')}
          </button>
          <span className="muted" id={`jump-hint-${episode.episodeId}-${passage.id}`}>
            Sprung zum Segmentanfang; Werbung kann die Zeit in der Online-Audiodatei verschieben.
          </span>
        </div>
      </div>)}
    </> : <p className="muted">Die Grundform wurde gezählt; die Textsuche findet dazu keine passende Originalpassage.</p>)}
  </article>;
}

function PassageText({ passage, words }: { passage: Passage; words: Selected[] }) {
  const long = passage.text.length > 600;
  const first = passage.highlights[0]?.start ?? 0;
  const start = long ? Math.max(0, first - 140) : 0;
  const intendedEnd = long ? Math.min(passage.text.length, start + 440) : passage.text.length;
  const end = passage.highlights.find((range) => range.start < intendedEnd && range.end > intendedEnd)?.end ?? intendedEnd;
  function text(from: number, to: number) {
    const pieces = [];
    let cursor = from;
    for (const range of passage.highlights) {
      if (range.start < from || range.end > to) continue;
      pieces.push(passage.text.slice(cursor, range.start));
      const colors = range.terms.map((term) => words.find((word) => word.lemma === term)?.color).filter((color): color is string => !!color);
      const background = colors.length > 1 ? `linear-gradient(180deg, ${colors.map((color, index) => `${color}33 ${index * 100 / colors.length}%, ${color}33 ${(index + 1) * 100 / colors.length}%`).join(', ')})` : undefined;
      pieces.push(<mark key={range.start} title={range.terms.join(', ')} style={{ ...wordStyle(colors[0]), background }}>{passage.text.slice(range.start, range.end)}</mark>);
      cursor = range.end;
    }
    pieces.push(passage.text.slice(cursor, to));
    return pieces;
  }
  return <><p><span className="timestamp" aria-label="Episodenzeit">{formatPlaybackTime(passage.start_seconds)}</span>{start > 0 && '… '}{text(start, end)}{end < passage.text.length && ' …'}</p>{long && <details><summary>Vollständiges Segment anzeigen</summary><p>{text(0, passage.text.length)}</p></details>}</>;
}
