import { SearchPanel } from './SearchPanel';
import { Stats } from './Stats';

export function App() {
  return <main>
    <p className="eyebrow">Podcast Words / V3</p>
    <h1>Eine erinnerte Stelle wiederfinden.</h1>
    <p className="intro">Erinnerte Stichwörter führen zur gesprochenen Passage.</p>
    <aside className="notice" aria-label="Entwicklungsstand">
      <strong>Kontrollierter Pilot-Prüfstand · synthetische Beispieldaten</strong>
      <p>Maschinelle Transkripte können Fehler enthalten. Sprungzeiten gelten für die verarbeitete Audiofassung und können bei abweichenden Fassungen, etwa durch Werbeeinblendungen, verschoben sein.</p>
    </aside>
    <SearchPanel />
    <Stats />
  </main>;
}
