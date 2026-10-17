import { useState, type ChangeEvent } from 'react';
import {
  CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

type Word = { lemma: string; stopword: boolean; totalCount: number; shard: string };
type Episode = { episodeId: string; title: string; publishedAt: string; totalWords: number; distinctWords: number };
type Mode = 'normalized' | 'absolute';
type Values = Map<string, number>;
type SelectedWord = Word & { values: Values };
type RankedEpisode = Episode & { occurrences: number; value: number | null };

const MAX_SELECTED = 5;
const MAX_SUGGESTIONS = 10;
const COLORS = ['#215d4d', '#bd5e34', '#375f94', '#8b538b', '#a77a18'];

async function readShard(path: string, publicationId: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}stats/${path}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const shard = await response.json();
  if (shard.schemaVersion !== 1 || shard.publicationId !== publicationId
      || !/^[a-f0-9]{64}$/.test(shard.publicationId)
      || !shard.counts || typeof shard.counts !== 'object' || Array.isArray(shard.counts)) {
    throw new Error('Invalid count publication');
  }
  return shard as { counts: Record<string, unknown> };
}

function countsFor(shardCounts: Record<string, unknown>, word: Word, episodes: Episode[]) {
  const pairs = shardCounts[word.lemma];
  if (!Array.isArray(pairs)) throw new Error('Invalid lemma counts');
  const values = new Map<string, number>();
  const knownEpisodes = new Set(episodes.map((episode) => episode.episodeId));
  for (const pair of pairs) {
    if (!Array.isArray(pair) || typeof pair[0] !== 'string' || !knownEpisodes.has(pair[0])
        || !Number.isSafeInteger(pair[1]) || (pair[1] as number) <= 0 || values.has(pair[0])) {
      throw new Error('Invalid lemma counts');
    }
    values.set(pair[0], pair[1] as number);
  }
  return values;
}

function rate(count: number, totalWords: number) {
  return totalWords === 0 ? null : count * 1000 / totalWords;
}

function formatRate(value: number | null) {
  return value === null ? 'Nicht verfügbar' : value.toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

function formatNumber(value: number) {
  return value.toLocaleString('de-DE');
}

function rankedEpisodes(word: SelectedWord, episodes: Episode[], mode: Mode): RankedEpisode[] {
  return episodes.map((episode) => {
    const occurrences = word.values.get(episode.episodeId) ?? 0;
    return {
      ...episode,
      occurrences,
      value: mode === 'absolute' ? occurrences : rate(occurrences, episode.totalWords),
    };
  }).sort((a, b) => {
    const left = a.value ?? 0;
    const right = b.value ?? 0;
    return right - left || Date.parse(b.publishedAt) - Date.parse(a.publishedAt)
      || a.episodeId.localeCompare(b.episodeId);
  }).slice(0, 10);
}

type Props = { publicationId: string; words: Word[]; episodes: Episode[] };

export function Frequency({ publicationId, words, episodes }: Props) {
  const [query, setQuery] = useState('');
  const [includeStopwords, setIncludeStopwords] = useState(false);
  const [mode, setMode] = useState<Mode>('normalized');
  const [selected, setSelected] = useState<SelectedWord[]>([]);
  const [loading, setLoading] = useState(false);
  const [failedLemma, setFailedLemma] = useState<string>();

  const suggestions = words.filter((word) => (includeStopwords || !word.stopword)
    && word.lemma.includes(query.trim().toLocaleLowerCase('de')))
    .slice(0, MAX_SUGGESTIONS);

  async function toggle(word: Word) {
    const existing = selected.find((item) => item.lemma === word.lemma);
    if (existing) {
      setSelected((current) => current.filter((item) => item.lemma !== word.lemma));
      if (failedLemma === word.lemma) setFailedLemma(undefined);
      return;
    }
    if (loading || selected.length >= MAX_SELECTED) return;

    setLoading(true);
    setFailedLemma(undefined);
    try {
      const shard = await readShard(word.shard, publicationId);
      const values = countsFor(shard.counts, word, episodes);
      setSelected((current) => [...current, { ...word, values }]);
    } catch {
      setFailedLemma(word.lemma);
    } finally {
      setLoading(false);
    }
  }

  async function retry(word: Word) {
    setLoading(true);
    setFailedLemma(undefined);
    try {
      const shard = await readShard(word.shard, publicationId);
      const values = countsFor(shard.counts, word, episodes);
      setSelected((current) => [...current, { ...word, values }]);
    } catch {
      setFailedLemma(word.lemma);
    } finally {
      setLoading(false);
    }
  }

  function changeMode(event: ChangeEvent<HTMLInputElement>) {
    setMode(event.target.value as Mode);
  }

  const plotData = episodes.map((episode) => {
    const row: Record<string, string | number | null> = { episode: episode.title };
    selected.forEach((word, index) => {
      const occurrences = word.values.get(episode.episodeId) ?? 0;
      row[`series${index}`] = mode === 'absolute' ? occurrences : rate(occurrences, episode.totalWords);
    });
    return row;
  });
  const metricLabel = mode === 'absolute' ? 'Vorkommen (absolut)' : 'Häufigkeit je 1.000 Gesamtwörter';

  return <div className="frequency">
    <label htmlFor="lemma">Grundform suchen</label>
    <input id="lemma" value={query} onChange={(event) => setQuery(event.target.value)} />
    <label className="stopword-control">
      <input type="checkbox" checked={includeStopwords} onChange={(event) => setIncludeStopwords(event.target.checked)} />
      Stoppwörter in Vorschlägen einschließen
    </label>
    <p className="muted">Höchstens zehn Vorschläge; bis zu fünf Grundformen vergleichen. Die Auswahl ändert weder Gesamtwörter noch den Nenner der normierten Häufigkeit.</p>
    <ul aria-label="Grundformvorschläge" className="word-suggestions">
      {suggestions.map((word) => {
        const isSelected = selected.some((item) => item.lemma === word.lemma);
        return <li key={word.lemma}><button
          aria-pressed={isSelected}
          disabled={loading || (!isSelected && selected.length >= MAX_SELECTED)}
          onClick={() => void toggle(word)}
        >{word.lemma}</button></li>;
      })}
    </ul>
    {!suggestions.length && <p>Keine passende Grundform.</p>}
    {selected.length > 0 && <ul aria-label="Ausgewählte Grundformen" className="word-suggestions">
      {selected.map((word) => <li key={word.lemma}>
        <span>{word.lemma}</span>
        <button aria-label={`${word.lemma} entfernen`} onClick={() => void toggle(word)}>Entfernen</button>
      </li>)}
    </ul>}
    {loading && <p aria-live="polite">Wortzählungen werden geladen …</p>}
    {failedLemma && <>
      <p role="alert">Die Zählungen für {failedLemma} konnten nicht geladen werden. Fehlende Daten sind kein Nullwert.</p>
      <button onClick={() => {
        const word = words.find((item) => item.lemma === failedLemma);
        if (word) void retry(word);
      }}>Zählungen erneut laden</button>
    </>}
    {selected.length > 0 && <fieldset className="frequency-mode">
      <legend>Anzeigewert</legend>
      <label><input type="radio" name="frequency-mode" value="normalized" checked={mode === 'normalized'} onChange={changeMode} /> Häufigkeit je 1.000 Gesamtwörter</label>
      <label><input type="radio" name="frequency-mode" value="absolute" checked={mode === 'absolute'} onChange={changeMode} /> Absolute Vorkommen</label>
    </fieldset>}
    {selected.length > 0 && !failedLemma && <section aria-label="Grundformvergleich" className="frequency-results">
      <h3>Grundformvergleich</h3>
      <p>{metricLabel}. Fehlende bekannte Grundform/Folge-Paare zählen als null; bei null Gesamtwörtern ist die normierte Häufigkeit nicht verfügbar.</p>
      <figure>
        <figcaption>{metricLabel} nach Folge</figcaption>
        <div className="frequency-chart-scroll"><div className="frequency-chart">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={plotData} accessibilityLayer>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="episode" hide />
              <YAxis width="auto" />
              <Tooltip />
              <Legend />
              {selected.map((word, index) => <Line
                key={word.lemma}
                type="monotone"
                dataKey={`series${index}`}
                name={word.lemma}
                stroke={COLORS[index]}
                connectNulls={false}
                dot={false}
              />)}
            </LineChart>
          </ResponsiveContainer>
        </div></div>
      </figure>
      {selected.map((word) => <div className="counts-scroll" key={word.lemma}>
        <h4>Top 10: {word.lemma}</h4>
        <table aria-label={`Top 10: ${word.lemma}`}>
          <thead><tr><th>Folge</th><th>Vorkommen</th><th>Gesamtwörter</th><th>{metricLabel}</th></tr></thead>
          <tbody>{rankedEpisodes(word, episodes, mode).map((episode) => <tr key={episode.episodeId}>
            <th scope="row">{episode.title}</th>
            <td>{formatNumber(episode.occurrences)}</td>
            <td>{formatNumber(episode.totalWords)}</td>
            <td>{mode === 'absolute' ? formatNumber(episode.occurrences) : formatRate(episode.value)}</td>
          </tr>)}</tbody>
        </table>
      </div>)}
    </section>}
  </div>;
}
