import { useState } from 'react';

type Episode = {
  episodeId: string;
  title: string;
  publishedAt: string;
  totalWords: number;
  distinctWords: number;
  newWords: number;
};
type Summary = { episodeCount: number; totalWords: number; distinctWords: number; newWords: number };
type Catalog = { summary: Summary; episodes: Episode[] };

function count(value: number) {
  return value.toLocaleString('de-DE');
}

function validCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

export function VocabularySummary() {
  const [catalog, setCatalog] = useState<Catalog>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function open() {
    setLoading(true);
    setError(false);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}stats/catalog.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value = await response.json();
      const summary = value.summary as Summary | undefined;
      const episodes = value.episodes as Episode[] | undefined;
      if (value.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(value.publicationId)
          || !summary || !episodes || !Array.isArray(episodes)
          || !validCount(summary.episodeCount) || !validCount(summary.totalWords)
          || !validCount(summary.distinctWords) || !validCount(summary.newWords)
          || summary.episodeCount !== episodes.length
          || episodes.some((episode) => !episode || typeof episode.episodeId !== 'string'
            || typeof episode.title !== 'string' || !Number.isFinite(Date.parse(episode.publishedAt))
            || !validCount(episode.totalWords) || !validCount(episode.distinctWords)
            || !validCount(episode.newWords))) {
        throw new Error('Invalid vocabulary summary');
      }
      setCatalog({ summary, episodes });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return <section aria-labelledby="vocabulary-summary-heading" className="example">
    <h2 id="vocabulary-summary-heading">Gesamtwörter und Wortschatz</h2>
    <p>Gesamtwörter zählen alle alphabetischen Wortvorkommen einschließlich Stoppwörtern. Verschiedene Wörter sind unterschiedliche kleingeschriebene Grundformen. Neue Wörter sind Grundformen, die in der chronologischen Reihenfolge aus Veröffentlichungsdatum und dauerhafter Folgenidentität erstmals vorkommen.</p>
    {!catalog && <button onClick={open} disabled={loading}>
      {error ? 'Wortentwicklung erneut öffnen' : 'Wortentwicklung öffnen'}
    </button>}
    {loading && <p aria-live="polite">Wortentwicklung wird geladen …</p>}
    {error && <p role="alert">Die Wortentwicklung konnte nicht geladen werden. Bitte bewusst erneut öffnen.</p>}
    {catalog && <>
      <dl className="vocabulary-totals">
        <div><dt>Gesamtwörter im Pilot</dt><dd>{count(catalog.summary.totalWords)}</dd></div>
        <div><dt>Verschiedene Wörter im Pilot</dt><dd>{count(catalog.summary.distinctWords)}</dd></div>
        <div><dt>Neue Wörter im Pilot</dt><dd>{count(catalog.summary.newWords)}</dd></div>
      </dl>
      {catalog.episodes.length === 0
        ? <p>Keine Folgen im Pilot; alle Zählungen sind null.</p>
        : <div className="counts-scroll">
          <table aria-label="Chronologische Wortentwicklung je Folge">
            <thead><tr><th>Folge</th><th>Gesamtwörter</th><th>Verschiedene Wörter</th><th>Neue Wörter</th></tr></thead>
            <tbody>{catalog.episodes.map((episode) => <tr key={episode.episodeId}>
              <th scope="row">{episode.title}<br /><time dateTime={episode.publishedAt}>{new Date(episode.publishedAt).toLocaleDateString('de-DE', { timeZone: 'UTC' })}</time></th>
              <td>{count(episode.totalWords)}</td><td>{count(episode.distinctWords)}</td><td>{count(episode.newWords)}</td>
            </tr>)}</tbody>
          </table>
        </div>}
    </>}
  </section>;
}
