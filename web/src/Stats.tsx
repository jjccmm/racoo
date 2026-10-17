import { useRef, useState } from 'react';
import { loadPublication } from './publication';

type Word = { lemma: string; stopword: boolean; totalCount: number; shard: string };
type Episode = { episodeId: string; title: string; publishedAt: string; totalWords: number; distinctWords: number };
type Data = { publicationId: string; words: Word[]; episodes: Episode[] };
type Counts = { lemma: string; values: Map<string, number> };

async function read(file: string, publicationId?: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}stats/${file}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const value = await response.json();
  if (value.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(value.publicationId)
      || (publicationId && value.publicationId !== publicationId)) throw new Error('Invalid statistics publication');
  return value;
}

export function Stats() {
  const [data, setData] = useState<Data>();
  const [query, setQuery] = useState('');
  const [includeStopwords, setIncludeStopwords] = useState(false);
  const [counts, setCounts] = useState<Counts>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const generation = useRef(0);

  async function open() {
    const current = ++generation.current;
    setLoading(true); setError(false);
    try {
      const publication = await loadPublication();
      const manifest = await read('manifest.json');
      if (manifest.publicationId !== publication.publicationId || manifest.statisticsId !== publication.statisticsId
          || manifest.podcastId !== publication.podcastId) throw new Error('Mismatched publication');
      const [vocabulary, catalog] = await Promise.all([
        read('vocabulary.json', manifest.publicationId), read('catalog.json', manifest.publicationId),
      ]);
      if (current === generation.current) setData({
        publicationId: manifest.publicationId, words: vocabulary.words, episodes: catalog.episodes,
      });
    } catch {
      if (current === generation.current) setError(true);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }

  async function select(word: Word) {
    if (!data) return;
    const current = ++generation.current;
    setLoading(true); setError(false); setCounts(undefined);
    try {
      const shard = await read(word.shard, data.publicationId);
      const values = shard.counts[word.lemma];
      if (!Array.isArray(values) || values.some((entry: unknown) => !Array.isArray(entry)
          || typeof entry[0] !== 'string' || !Number.isSafeInteger(entry[1]) || entry[1] <= 0)) {
        throw new Error('Invalid lemma counts');
      }
      if (current === generation.current) setCounts({ lemma: word.lemma, values: new Map(values) });
    } catch {
      if (current === generation.current) setError(true);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }

  const suggestions = data?.words.filter((word) => (includeStopwords || !word.stopword)
    && word.lemma.includes(query.trim().toLocaleLowerCase('de'))).slice(0, 10) ?? [];

  return <section aria-labelledby="statistics-heading" className="example">
    <h2 id="statistics-heading">Wortstatistik</h2>
    <p>Exakte Zählungen kleingeschriebener Grundformen. Alle alphabetischen Wörter einschließlich Stoppwörtern zählen zu den Gesamtwörtern.</p>
    {!data && <button onClick={open} disabled={loading}>Wortstatistik öffnen</button>}
    {data && <>
      <p>Gesamtwörter einschließlich Stoppwörtern: {data.episodes.reduce((sum, episode) => sum + episode.totalWords, 0)}</p>
      <label htmlFor="lemma">Grundform</label>
      <input id="lemma" value={query} onChange={(event) => setQuery(event.target.value)} />
      <label className="stopword-control"><input type="checkbox" checked={includeStopwords} onChange={(event) => setIncludeStopwords(event.target.checked)} /> Stoppwörter in Vorschlägen einschließen</label>
      <p className="muted">Höchstens zehn Vorschläge. Die Auswahl verändert die Gesamtzählung nicht.</p>
      <ul aria-label="Grundformvorschläge" className="word-suggestions">
        {suggestions.map((word) => <li key={word.lemma}><button onClick={() => select(word)}>{word.lemma}</button></li>)}
      </ul>
      {!suggestions.length && <p>Keine passende Grundform.</p>}
    </>}
    {loading && <p aria-live="polite">Wortstatistik wird geladen …</p>}
    {error && <p role="alert">Die Wortstatistik konnte nicht geladen werden. Fehlende Daten sind kein Nullwert. Bitte bewusst erneut öffnen oder die Grundform auswählen.</p>}
    {data && counts && <div className="counts-scroll">
      <h3>Grundform: {counts.lemma}</h3>
      <table aria-label="Exakte Grundformzählung">
        <thead><tr><th>Folge</th><th>Vorkommen (absolut)</th><th>Gesamtwörter</th></tr></thead>
        <tbody>{data.episodes.map((episode) => <tr key={episode.episodeId}>
          <th scope="row">{episode.title}</th><td>{counts.values.get(episode.episodeId) ?? 0}</td><td>{episode.totalWords}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </section>;
}
