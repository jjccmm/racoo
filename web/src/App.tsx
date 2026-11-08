import { Player } from './Player';
import { Stats } from './Stats';
import { PublicationState } from './PublicationState';
import { LandingIntro } from './LandingIntro';

const home = import.meta.env.BASE_URL;
const podcastHref = `${home}?podcast=podcast-ufo`;
const cover = `${home}images/podcast-ufo.jpg`;
const logo = `${home}images/racoo-logo.png`;

export function App() {
  const params = new URLSearchParams(window.location.search);
  const explorer = params.get('podcast') === 'podcast-ufo' || params.has('episode');

  return <main className={explorer ? 'workspace' : 'landing'}>
    <header className="site-header">
      <a className="site-brand" href={home} aria-label="Racoo – Startseite"><img src={logo} width="2172" height="724" alt="Racoo" /></a>
      {explorer && <a className="back-link" href={home}><span aria-hidden="true">←</span> Alle Podcasts</a>}
    </header>
    {explorer ? <>
      <header className="podcast-header">
        <img src={cover} width="48" height="48" alt="" />
        <div><h1>DAS PODCAST UFO</h1><p>Florentin Will &amp; Stefan Titze</p></div>
      </header>
      <Player><Stats /></Player>
      <footer className="workspace-footer">
        <details className="publication-details"><summary>Über die Daten</summary>
          <PublicationState />
          <p className="pilot-note">Maschinelle Transkripte können Fehler enthalten. Sprungzeiten gelten für die verarbeitete Audiofassung; Werbung kann sie verschieben.</p>
        </details>
      </footer>
    </> : <>
      <LandingIntro />
      <section className="podcast-directory" aria-labelledby="podcasts-heading">
        <div className="section-heading"><h2 id="podcasts-heading">Podcasts</h2><span>01</span></div>
        <a className="podcast-card" href={podcastHref}>
          <img src={cover} width="112" height="112" alt="Cover von DAS PODCAST UFO" />
          <div className="podcast-card-copy"><h3>DAS PODCAST UFO</h3><p>Florentin Will &amp; Stefan Titze</p><span>Folgen durchsuchen</span></div>
          <span className="card-arrow" aria-hidden="true">→</span>
        </a>
      </section>
      <footer className="landing-footer">Ein unabhängiges Hobbyprojekt. Finde Folgen anhand ihrer maschinell erstellten Transkripte.</footer>
    </>}
  </main>;
}
