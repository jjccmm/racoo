import { SearchPanel } from './SearchPanel';
import { Stats } from './Stats';
import { VocabularySummary } from './VocabularySummary';
import { PublicationState } from './PublicationState';

export function App() {
  return <main>
    <p className="eyebrow">Podcast Words / V3</p>
    <h1>Eine erinnerte Stelle wiederfinden.</h1>
    <p className="intro">Erinnerte Stichwörter führen zur gesprochenen Passage.</p>
    <PublicationState />
    <SearchPanel />
    <Stats />
    <VocabularySummary />
  </main>;
}
