import type { TopDetails } from './search';
import type { ColoredTerm } from './HighlightedText';
import { wordStyle } from './word-colors';
import { SegmentedControl } from './SegmentedControl';
export type SearchMode = 'standard' | 'exact';
export function SearchOptions({ mode, onChange, words, details, error, retry }: { mode: SearchMode; onChange(mode: SearchMode): void; words: ColoredTerm[]; details?: TopDetails; error?: string; retry(): void }) {
  return <section className="search-options" id="search-options" aria-label="Suchoptionen">
    <div className="search-options-heading">
      <SegmentedControl<SearchMode> label="Suchmodus" value={mode} onChange={onChange} options={[{ value: 'exact', label: 'Exakt' }, { value: 'standard', label: 'Standard' }]} />
      <details className="search-mode-help"><summary aria-label="Suchmodi erklärt">?</summary><div>
        <p><strong>Standard:</strong> Findet auch Wortformen und Wortanfänge, etwa „Wörter“ zu „Wort“ oder „Tischtennis“ zu „Tisch“.</p>
        <p><strong>Exakt:</strong> Prüft nur die zehn Folgen mit den meisten Treffern der Standardsuche. Darin zählen nur vollständige Wörter; Groß- und Kleinschreibung spielen keine Rolle. Weitere Folgen werden nicht geprüft.</p>
      </div></details>
    </div>
    {!!words.length && <><p className="variant-caption">Gefundene Wörter in den Top 10</p>
      {error ? <div role="alert"><p>Die Wortübersicht konnte nicht geladen werden.</p><button onClick={retry}>Wortübersicht erneut laden</button></div>
        : !details ? <p role="status">Wortübersicht wird geladen …</p>
          : <div className="word-variant-grid">{words.map(word => <section className="word-variants" key={word.term} style={wordStyle(word.color)} aria-label={`Gefundene Wörter: ${word.label}`}>
            <h3><i />{word.label}</h3><ul tabIndex={0} aria-label={`Häufigkeiten: ${word.label}`}>
              {details.variants[word.term]?.length ? details.variants[word.term].map(form => <li key={form.word}><span>{form.word}</span><span>{form.count.toLocaleString('de-DE')}</span></li>) : <li>Keine Treffer</li>}
            </ul></section>)}</div>}
    </>}
  </section>;
}
