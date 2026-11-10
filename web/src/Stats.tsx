import { lazy, Suspense, useContext, useEffect, useState } from 'react';
import { PlaybackContext } from './playback';
import { loadSearchData, type SearchData } from './catalog';

const Frequency = lazy(() => import('./Frequency').then(module => ({ default: module.Frequency })));
export function Stats({ dataBase }: { dataBase: string }) {
  const onChoose = useContext(PlaybackContext);
  const [data, setData] = useState<SearchData>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadSearchData(dataBase, controller.signal).then(setData).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt, dataBase]);
  return <>
    {!data && !error && <p role="status">Suche wird vorbereitet …</p>}
    {error && <div><p role="alert">Die Suchdaten konnten nicht geladen werden. Fehlende Daten sind kein Nullwert.</p><button onClick={() => { setError(false); setAttempt(value => value + 1); }}>Suchdaten erneut laden</button></div>}
    {data && <>
      <Suspense fallback={<p role="status">Suche wird vorbereitet …</p>}><Frequency dataBase={dataBase} data={data} onChoose={onChoose} /></Suspense>
      <p className="dataset-note">Datenbestand · {data.episodes.length} verarbeitete Folgen</p>
      <details className="metadata"><summary>Verarbeitete Folgen und Laufzeiten</summary>
        <p className="muted">Gemessene Zeiten je Folge. Die gemeinsame Modelleinrichtung ist separat im Verarbeitungsprotokoll erfasst.</p>
        <div className="counts-scroll"><table aria-label="Verarbeitete Folgen und Laufzeiten">
          <thead><tr><th>Folge</th><th>Audiodauer</th><th>Download</th><th>Transkription</th><th>Gesamt</th></tr></thead>
          <tbody>{[...data.episodes].sort((a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt) || a.episodeId.localeCompare(b.episodeId)).map(episode => <tr key={episode.episodeId}>
            <th scope="row">{episode.title}</th><td>{duration(episode.durationSeconds)}</td><td>{seconds(episode.timings?.downloadSeconds)}</td><td>{seconds(episode.timings?.transcriptionSeconds)}</td><td>{seconds(episode.timings?.totalSeconds)}</td>
          </tr>)}</tbody>
        </table></div>
      </details>
    </>}
  </>;
}
function seconds(value: number | undefined) { return value === undefined ? 'Nicht erfasst' : `${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} s`; }
function duration(value: number | undefined) {
  if (value === undefined) return 'Nicht erfasst';
  const whole = Math.floor(value);
  return `${Math.floor(whole / 3600)}:${String(Math.floor(whole / 60) % 60).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}
