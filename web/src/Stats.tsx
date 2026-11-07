import { lazy, Suspense, useContext, useEffect, useState } from 'react';
import { PlaybackContext } from './playback';
import { loadPublication } from './publication';
import { VocabularySummary } from './VocabularySummary';

const Frequency = lazy(() => import('./Frequency').then((module) => ({ default: module.Frequency })));

type Word = { lemma: string; stopword: boolean; totalCount: number; shard: string };
type Episode = {
  episodeId: string; title: string; publishedAt: string; totalWords: number; distinctWords: number;
  durationSeconds?: number;
  timings?: { downloadSeconds: number; transcriptionSeconds: number; totalSeconds: number };
};
type Data = { publicationId: string; words: Word[]; episodes: Episode[] };

async function read(file: string, publicationId?: string) {
  const response = await fetch(`${import.meta.env.BASE_URL}stats/${file}`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const value = await response.json();
  if (value.schemaVersion !== 2 || !/^[a-f0-9]{64}$/.test(value.publicationId)
      || (publicationId && value.publicationId !== publicationId)) throw new Error('Invalid statistics publication');
  return value;
}

async function readData(): Promise<Data> {
  const publication = await loadPublication();
  const manifest = await read('manifest.json');
  if (manifest.publicationId !== publication.publicationId || manifest.statisticsId !== publication.statisticsId
      || manifest.podcastId !== publication.podcastId) throw new Error('Mismatched publication');
  const [vocabulary, catalog] = await Promise.all([
    read('vocabulary.json', manifest.publicationId), read('catalog.json', manifest.publicationId),
  ]);
  return { publicationId: manifest.publicationId, words: vocabulary.words, episodes: catalog.episodes };
}

export function Stats() {
  const onChoose = useContext(PlaybackContext);
  const [data, setData] = useState<Data>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let current = true;
    readData().then((value) => { if (current) setData(value); })
      .catch(() => { if (current) setError(true); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [attempt]);

  return <>
    {loading && <p role="status">Wortauswahl wird geladen …</p>}
    {error && <><p role="alert">Die Wortstatistik konnte nicht geladen werden. Fehlende Daten sind kein Nullwert.</p><button onClick={() => { setLoading(true); setError(false); setAttempt((value) => value + 1); }}>Wortstatistik erneut laden</button></>}
    {data && <>
      <p className="dataset-note">Pilot · {data.episodes.length} Folgen</p>
      <Suspense fallback={<p role="status">Wortauswahl wird vorbereitet …</p>}><Frequency publicationId={data.publicationId} words={data.words} episodes={data.episodes} onChoose={onChoose} /></Suspense>
      <details className="metadata"><summary>Verarbeitete Folgen und Laufzeiten</summary>
        <p>Gesamtwörter einschließlich Stoppwörtern: {data.episodes.reduce((sum, episode) => sum + episode.totalWords, 0)}</p>
        <p className="muted">Gemessene Zeiten je Folge. Die gemeinsame Modelleinrichtung ist separat im Verarbeitungsprotokoll erfasst.</p>
        <div className="counts-scroll"><table aria-label="Verarbeitete Folgen und Laufzeiten">
          <thead><tr><th>Folge</th><th>Audiodauer</th><th>Download</th><th>Transkription</th><th>Gesamt</th></tr></thead>
          <tbody>{data.episodes.map((episode) => <tr key={episode.episodeId}>
            <th scope="row">{episode.title}</th><td>{duration(episode.durationSeconds)}</td>
            <td>{seconds(episode.timings?.downloadSeconds)}</td><td>{seconds(episode.timings?.transcriptionSeconds)}</td><td>{seconds(episode.timings?.totalSeconds)}</td>
          </tr>)}</tbody>
        </table></div>
      </details>
    </>}
    <details className="metadata"><summary>Gesamtwörter und Wortschatz</summary><VocabularySummary /></details>
  </>;
}
function seconds(value: number | undefined) { return measured(value) ? `${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} s` : 'Nicht erfasst'; }
function duration(value: number | undefined) {
  if (!measured(value)) return 'Nicht erfasst';
  const whole = Math.floor(value);
  return `${Math.floor(whole / 3600)}:${String(Math.floor(whole / 60) % 60).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
function measured(value: number | undefined): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0; }
