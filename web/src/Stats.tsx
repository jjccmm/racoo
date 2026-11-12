import { lazy, Suspense, useContext, useEffect, useState } from 'react';
import { PlaybackContext } from './playback';
import { loadSearchData, type SearchData } from './catalog';

const Frequency = lazy(() => import('./Frequency').then(module => ({ default: module.Frequency })));
export function Stats({ dataBase, defaultQuery = '' }: { dataBase: string; defaultQuery?: string }) {
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
    {data && <Suspense fallback={<p role="status">Suche wird vorbereitet …</p>}><Frequency dataBase={dataBase} data={data} onChoose={onChoose} defaultQuery={defaultQuery} /></Suspense>}
  </>;
}
