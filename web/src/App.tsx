import { useEffect, useState } from 'react';
import { Player } from './Player';
import { Stats } from './Stats';
import { LandingIntro, DEMO_QUERY } from './LandingIntro';
import { loadPodcasts, type Podcast } from './podcasts';
import { PodcastProgress } from './PodcastProgress';
import { ThemeToggle } from './ThemeToggle';
import { Faq } from './Faq';
import { BackToTop } from './BackToTop';

const home = import.meta.env.BASE_URL;
const logo = `${home}images/racoo-logo.png`;

export function App() {
  const [landingQuery, setLandingQuery] = useState(DEMO_QUERY);
  const [podcasts, setPodcasts] = useState<Podcast[]>();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadPodcasts(controller.signal).then(setPodcasts).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);
  const params = new URLSearchParams(window.location.search);
  const requested = params.get('podcast');
  const episode = params.get('episode');
  const explorer = !!requested || !!episode;
  const podcast = requested ? podcasts?.find(item => item.id === requested)
    : episode ? podcasts?.find(item => item.episodeIds.includes(episode)) ?? podcasts?.[0] : undefined;
  const dataBase = `${home}${podcast?.dataPath ?? ''}`;

  return <main className={explorer ? 'workspace' : 'landing'}>
    <header className="site-header">
      <a className="site-brand" href={home} aria-label="Racoo – Startseite"><img src={logo} width="2172" height="724" alt="Racoo" /></a>
      {explorer && <div className="header-actions"><a className="back-link" href={home} aria-label="Alle Podcasts" title="Alle Podcasts"><span aria-hidden="true">←</span><span className="back-label">Alle Podcasts</span></a><ThemeToggle /></div>}
    </header>
    {!explorer && <LandingIntro onQuery={setLandingQuery} />}
    {!podcasts && !error && <p role="status">Podcasts werden geladen …</p>}
    {error && <div role="alert"><p>Die Podcastübersicht konnte nicht geladen werden.</p><button onClick={() => { setError(false); setAttempt(value => value + 1); }}>Podcastübersicht erneut laden</button></div>}
    {explorer && podcasts && !podcast && <p role="alert">Dieser Podcast ist nicht vorhanden. Über „Alle Podcasts“ kommst du zur Übersicht.</p>}
    {explorer && podcast && <>
      <header className="podcast-header">
        <img src={`${home}${podcast.cover}`} width="64" height="64" alt="" />
        <div><h1>{podcast.name}</h1><p>{podcast.speakers.join(' & ')}{podcast.websiteUrl && <><span className="speaker-separator"> · </span><a href={podcast.websiteUrl} target="_blank" rel="noreferrer">Webseite ↗</a></>}</p><PodcastProgress podcast={podcast} /></div>
      </header>
      {podcast.episodeCount > 0 ? <>
        <Player key={podcast.id} dataBase={dataBase} podcastId={podcast.id}><Stats dataBase={dataBase} defaultQuery={podcast.id === 'podcast-ufo' && !episode ? 'Eimer Münze' : ''} /></Player>
        <footer className="workspace-footer"><p className="transcript-credit">Inhalte: {podcast.websiteUrl ? <a href={podcast.websiteUrl} target="_blank" rel="noreferrer">{podcast.name}</a> : podcast.name} · Maschinelle Transkripte können Fehler enthalten.</p></footer>
      </> : <p className="notice">Für diesen Podcast sind noch keine Folgen durchsuchbar. Die Verarbeitung läuft lokal; neue Daten erscheinen nach der nächsten Veröffentlichung.</p>}
    </>}
    {!explorer && podcasts && <>
      <section className="podcast-directory" aria-labelledby="podcasts-heading">
        <div className="section-heading"><h2 id="podcasts-heading">Podcasts</h2><span>{String(podcasts.length).padStart(2, '0')}</span></div>
        {podcasts.map(item => <a className="podcast-card" href={`${home}?podcast=${encodeURIComponent(item.id)}${landingQuery.trim() && landingQuery !== DEMO_QUERY ? `&q=${encodeURIComponent(landingQuery)}` : ''}`} key={item.id}>
          <img src={`${home}${item.cover}`} width="112" height="112" alt={`Cover von ${item.name}`} />
          <div className="podcast-card-copy"><h3>{item.name}</h3><p>{item.speakers.join(' & ')}</p><PodcastProgress podcast={item} /></div>
          <span className="card-arrow" aria-hidden="true">→</span>
        </a>)}
      </section>
      <Faq />
    </>}
    <BackToTop />
  </main>;
}
