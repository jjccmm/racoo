import { lazy, Suspense, useRef, useState } from 'react';
import { loadPublication } from './publication';

const Frequency = lazy(() => import('./Frequency').then((module) => ({ default: module.Frequency })));

type Word = { lemma: string; stopword: boolean; totalCount: number; shard: string };
type Episode = { episodeId: string; title: string; publishedAt: string; totalWords: number; distinctWords: number };
type Data = { publicationId: string; words: Word[]; episodes: Episode[] };

async function read(file: string, publicationId?: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}stats/${file}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const value = await response.json();
  if (value.schemaVersion !== 1 || !/^[a-f0-9]{64}$/.test(value.publicationId)
      || (publicationId && value.publicationId !== publicationId)) throw new Error('Invalid statistics publication');
  return value;
}

export function Stats() {
  const generation = useRef(0);
  const [data, setData] = useState<Data>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function open() {
    const current = ++generation.current;
    setLoading(true);
    setError(false);
    try {
      const publication = await loadPublication();
      const manifest = await read('manifest.json');
      if (manifest.publicationId !== publication.publicationId || manifest.statisticsId !== publication.statisticsId
          || manifest.podcastId !== publication.podcastId) throw new Error('Mismatched publication');
      const [vocabulary, catalog] = await Promise.all([
        read('vocabulary.json', manifest.publicationId), read('catalog.json', manifest.publicationId),
      ]);
      if (current === generation.current) setData({ publicationId: manifest.publicationId, words: vocabulary.words, episodes: catalog.episodes });
    } catch {
      if (current === generation.current) setError(true);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }

  return <section aria-labelledby="statistics-heading" className="example">
    <h2 id="statistics-heading">Wortstatistik</h2>
    <p>Exakte Zählungen kleingeschriebener Grundformen. Alle alphabetischen Wörter einschließlich Stoppwörtern zählen zu den Gesamtwörtern.</p>
    {!data && <button onClick={open} disabled={loading}>
      {error ? 'Wortstatistik erneut öffnen' : 'Wortstatistik öffnen'}
    </button>}
    {loading && <p aria-live="polite">Wortstatistik wird geladen …</p>}
    {error && <p role="alert">Die Wortstatistik konnte nicht geladen werden. Bitte bewusst erneut öffnen.</p>}
    {data && <>
      <p>Gesamtwörter einschließlich Stoppwörtern: {data.episodes.reduce((sum, episode) => sum + episode.totalWords, 0)}</p>
      <Suspense fallback={<p aria-live="polite">Vergleich wird vorbereitet …</p>}>
        <Frequency publicationId={data.publicationId} words={data.words} episodes={data.episodes} />
      </Suspense>
    </>}
  </section>;
}
