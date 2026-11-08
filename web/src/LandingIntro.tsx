import { useRef, useState } from 'react';
import { WORD_COLORS, wordStyle } from './word-colors';
import { SearchIcon } from './SearchIcon';

const INTRO = 'Du willst diese eine Podcast-Folge wiederfinden, erinnerst dich aber nur an ein paar Wörter? Die Suche zeigt dir, in welchen Folgen deine Schlüsselwörter am häufigsten vorkommen. Wähle den Podcast, in dem du suchen möchtest, und leg los!';
const normalize = (value: string) => value.normalize('NFC').toLocaleLowerCase('de-DE').trim();
const families = [
  { label: 'Die', forms: ['die', 'der', 'das', 'den', 'dem', 'des'] },
  { label: 'Podcast', forms: ['podcast', 'podcasts'] },
  { label: 'Wort', forms: ['wort', 'worte', 'wörter', 'wörtern', 'worten', 'schlüsselwort', 'schlüsselwörter', 'schlüsselwörtern'] },
  { label: 'Suche', forms: ['suche', 'suchen', 'suchst', 'sucht', 'gesucht'] },
  { label: 'Folge', forms: ['folge', 'folgen'] },
];
type DemoWord = { key: string; label: string; forms: string[]; count: number };
const words = new Map<string, DemoWord>(families.map((family) => [normalize(family.label), { ...family, key: normalize(family.label), count: 0 }]));
const byForm = new Map(families.flatMap((family) => family.forms.map((form) => [form, normalize(family.label)] as const)));
// This example matches only the fixed introduction; it never loads podcast data.
const pieces = INTRO.split(/(\p{L}[\p{L}\p{M}]*)/gu);
for (const piece of pieces) {
  if (!/^\p{L}/u.test(piece)) continue;
  const form = normalize(piece);
  const key = byForm.get(form) ?? form;
  byForm.set(form, key);
  if (!words.has(key)) words.set(key, { key, label: piece[0].toLocaleUpperCase('de-DE') + piece.slice(1), forms: [form], count: 0 });
  words.get(key)!.count++;
}
type Selected = { key: string; color: string };

export function LandingIntro() {
  const [selected, setSelected] = useState<Selected[]>(() => ['die', 'podcast', 'wort', 'suche'].map((key, index) => ({ key, color: WORD_COLORS[index] })));
  const [query, setQuery] = useState('');
  const [opened, setOpened] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const term = normalize(query);
  const suggestions = [...words.values()].filter((word) => word.count > 0 && !selected.some((item) => item.key === word.key)
    && (normalize(word.label).includes(term) || word.forms.some((form) => form.includes(term))))
    .sort((a, b) => {
      const priority = (word: DemoWord) => term ? word.forms.includes(term) || normalize(word.label) === term ? 0 : 1 : word.key === 'folge' ? 0 : 1;
      return priority(a) - priority(b) || b.count - a.count || a.label.localeCompare(b.label, 'de');
    }).slice(0, 6);
  const showOptions = opened && selected.length < 5;

  function choose(word: DemoWord) {
    if (selected.length >= 5 || selected.some((item) => item.key === word.key)) return;
    const color = WORD_COLORS.find((color) => !selected.some((item) => item.color === color))!;
    setSelected((current) => [...current, { key: word.key, color }]);
    setQuery(''); setOpened(false); setActive(-1);
    input.current?.focus();
  }
  function remove(key: string) {
    setSelected((current) => current.filter((item) => item.key !== key));
    input.current?.focus();
  }

  return <section className="landing-intro" aria-labelledby="page-heading">
    <h1 id="page-heading" className="visually-hidden">Die Podcast Wort Suche</h1>
    <div className="demo-controls">
      <ul className="demo-selected" aria-label="Wörter im Beispieltext">{selected.map((item) => <li key={item.key}>
        <button type="button" className="word-chip demo-chip" style={wordStyle(item.color)} aria-label={`${words.get(item.key)!.label} entfernen`} onClick={() => remove(item.key)}>
          {words.get(item.key)!.label}<span aria-hidden="true">×</span>
        </button>
      </li>)}</ul>
      <div className="demo-field" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpened(false); }}>
        <label className="visually-hidden" htmlFor="demo-word">Wort im Beispieltext suchen</label>
        <div className="search-input"><SearchIcon /><input type="search" ref={input} id="demo-word" role="combobox" aria-autocomplete="list" aria-controls="demo-options" aria-expanded={showOptions}
          aria-activedescendant={showOptions && active >= 0 && suggestions[active] ? `demo-option-${active}` : undefined}
          aria-describedby={selected.length === 5 ? 'demo-hint' : undefined} value={query} placeholder="Wort ausprobieren" autoComplete="off"
          onFocus={() => { setOpened(true); setActive(-1); }}
          onChange={(event) => { setQuery(event.target.value); setOpened(true); setActive(-1); }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setOpened(false); setActive(-1); }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault(); setOpened(true);
              setActive((current) => suggestions.length ? event.key === 'ArrowDown' ? (current + 1) % suggestions.length : (current <= 0 ? suggestions.length : current) - 1 : -1);
            }
            if (event.key === 'Enter' && showOptions && suggestions.length) {
              event.preventDefault(); choose(suggestions[active >= 0 ? active : 0]);
            }
          }} /></div>
        {showOptions && <ul id="demo-options" className="autocomplete demo-options" role="listbox" aria-label="Wörter im Beispieltext hinzufügen">
          {suggestions.map((word, index) => <li key={word.key} id={`demo-option-${index}`} role="option" aria-label={word.label} aria-selected={index === active}
            onPointerDown={(event) => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => choose(word)}>
            <span>{word.label}</span><small>{word.count}× im Text</small>
          </li>)}
          {!suggestions.length && <li className="no-option">Kein weiteres passendes Wort im Beispieltext.</li>}
        </ul>}
      </div>
    </div>
    <p className="demo-explanation" aria-label="So funktioniert Racoo">{pieces.map((piece, index) => {
      const item = selected.find((item) => item.key === byForm.get(normalize(piece)));
      return item ? <mark key={index} style={wordStyle(item.color)} title={words.get(item.key)!.label}>{piece}</mark> : piece;
    })}</p>
    {selected.length === 5 && <p className="demo-hint" id="demo-hint" aria-live="polite">Fünf Wörter ausgewählt. Entferne eines, um ein anderes auszuprobieren.</p>}
  </section>;
}
