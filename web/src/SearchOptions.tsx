import { useRef } from 'react';
import type { TopDetails } from './search';
import type { ColoredTerm } from './HighlightedText';
import { wordStyle } from './word-colors';
import { SegmentedControl } from './SegmentedControl';
export type SearchMode = 'standard' | 'exact';
export function SearchOptions({ mode, onChange, words, details, error, retry }: { mode: SearchMode; onChange(mode: SearchMode): void; words: ColoredTerm[]; details?: TopDetails; error?: string; retry(): void }) {
  const help = useRef<HTMLDialogElement>(null);
  return <section className="search-options" id="search-options" aria-label="Suchoptionen">
    <div className="search-options-heading">
      <SegmentedControl<SearchMode> label="Suchmodus" value={mode} onChange={onChange} options={[{ value: 'exact', label: 'Exakt' }, { value: 'standard', label: 'Standard' }]} />
      <div className="search-mode-help">
        <button type="button" className="search-help-button" aria-label="Suchmodi erklärt" aria-haspopup="dialog" onClick={() => help.current?.showModal()}>
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-2.9 2-2.9 4" /><path d="M12 17h.01" /></svg>
        </button>
        <dialog className="search-help-popup" ref={help} aria-label="Die Suchmodi" onClick={event => {
          const box = event.currentTarget.getBoundingClientRect();
          if (event.target === event.currentTarget && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) help.current?.close();
        }}>
          <header><h2>Die Suchmodi</h2><button type="button" className="help-close" aria-label="Erklärung schließen" onClick={() => help.current?.close()}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button></header>
          <p><strong>Standard</strong><br />Findet auch Wortformen und Wortanfänge, etwa „kommt“ und „Kommentar“ zu „kommen“.</p>
          <p><strong>Exakt</strong><br />Prüft nur die zehn Folgen mit den meisten Treffern der Standardsuche auf exakte Übereinstimmungen. Groß- und Kleinschreibung spielen keine Rolle. Weitere Folgen werden nicht geprüft.</p>
        </dialog>
      </div>
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
