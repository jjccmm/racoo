import { useEffect, useState } from 'react';
import { loadPublication, type Publication } from './publication';

export function PublicationState() {
  const [publication, setPublication] = useState<Publication>();
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    loadPublication(controller.signal).then(setPublication).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, []);
  return <aside className="notice" aria-label="Veröffentlichungsstand">
    <strong>Datensatz: {publication?.state === 'selected-pilot' ? 'ausgewählter Pilot' : 'synthetische Beispieldaten'}</strong>
    {publication && <p>{publication.podcastId} · {publication.episodeCount} Folgen · Veröffentlichung {publication.publicationId.slice(0, 12)}</p>}
    {error && <p role="alert">Der Veröffentlichungsstand konnte nicht geladen werden. Bitte später erneut laden.</p>}
  </aside>;
}
