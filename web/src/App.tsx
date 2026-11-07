import { Player } from './Player';
import { Stats } from './Stats';
import { PublicationState } from './PublicationState';

export function App() {
  return <main>
    <header><p className="eyebrow">Podcast Words / DAS PODCAST UFO</p>
      <h1>Wörter führen zu Geschichten.</h1>
      <p className="intro">Wähle bis zu fünf Wörter. Entdecke, in welchen Folgen sie vorkommen — und höre direkt hinein.</p>
    </header>
    <Player><Stats /></Player>
    <PublicationState />
    <aside className="pilot-note" aria-label="Entwicklungsstand">Kontrollierter Pilot · Maschinelle Transkripte können Fehler enthalten. Sprungzeiten gelten für die verarbeitete Audiofassung; Werbung kann sie verschieben.</aside>
  </main>;
}
