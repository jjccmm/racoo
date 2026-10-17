import { SearchPanel } from './SearchPanel';

export function App() {
  return <main>
    <p className="eyebrow">Podcast Words / V3</p>
    <h1>Eine erinnerte Stelle wiederfinden.</h1>
    <p className="intro">Erinnerte Stichwörter führen zur gesprochenen Passage.</p>
    <aside className="notice" aria-label="Entwicklungsstand">
      <strong>Ausschließlich synthetische Beispieldaten</strong>
      <p>Die Beispiele sind erfunden. Echte Podcastfolgen und Audiowiedergabe folgen im Pilot.</p>
    </aside>
    <SearchPanel />
  </main>;
}
