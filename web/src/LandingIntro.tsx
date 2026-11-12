import { useState } from 'react';
import { WORD_COLORS } from './word-colors';
import { HighlightedText } from './HighlightedText';
import { SearchIcon } from './SearchIcon';
import { parseQuery } from './query';
import { ThemeToggle } from './ThemeToggle';

export const DEMO_QUERY = 'Die Podcast Wort Suche';
const INTRO = 'Du willst diese eine Podcast-Folge wiederfinden, erinnerst dich aber nur an ein paar Wörter? Die Suche zeigt dir, in welchen Folgen deine Schlüsselwörter am häufigsten vorkommen. Wähle den Podcast, in dem du suchen möchtest, und leg los!';
const families: Record<string, string[]> = {
  die: ['die', 'der', 'das', 'den', 'dem', 'des'], podcast: ['podcast', 'podcasts'],
  wort: ['wort', 'worte', 'wörter', 'wörtern', 'worten', 'schlüsselwort', 'schlüsselwörter', 'schlüsselwörtern'],
  suche: ['suche', 'suchen', 'suchst', 'sucht', 'gesucht'], folge: ['folge', 'folgen'],
};
export function LandingIntro({ onQuery }: { onQuery(query: string): void }) {
  const [query, setQuery] = useState(DEMO_QUERY);
  let terms: string[] = [], labels: Record<string, string> = {}, error = '';
  try { ({ terms, labels } = parseQuery(query)); } catch (reason) { error = String((reason as Error).message); }
  const words = terms.map((term, index) => ({ term, label: labels[term], color: WORD_COLORS[index] }));
  const highlights = [...INTRO.matchAll(/\p{L}[\p{L}\p{M}]*/gu)].flatMap(match => {
    const form = match[0].toLocaleLowerCase('de-DE');
    const matched = terms.filter(term => (families[term] ?? [term]).includes(form));
    return matched.length ? [{ start: match.index, end: match.index + match[0].length, terms: matched }] : [];
  });
  return <section className="landing-intro" aria-labelledby="page-heading">
    <h1 id="page-heading" className="visually-hidden">Die Podcast Wort Suche</h1>
    <div className="intro-search-row"><div className="intro-search search-input"><SearchIcon /><label className="visually-hidden" htmlFor="demo-word">Wörter im Beispieltext suchen</label>
      <input type="search" id="demo-word" value={query} maxLength={250} autoComplete="off" aria-describedby="demo-caption" onChange={event => { setQuery(event.target.value); onQuery(event.target.value); }} />
    </div><ThemeToggle /></div>
    <p className="demo-caption" id="demo-caption">Eine kleine Vorschau: Ändere die Wörter und schau in den Text.</p>
    {error && <p role="status">{error}</p>}
    <p className="demo-explanation" aria-label="So funktioniert Racoo"><HighlightedText text={INTRO} highlights={highlights} words={words} /></p>
  </section>;
}
