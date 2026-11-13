const answers = [
  ['Warum gibt es Racoo?', 'Ich wollte eine bestimmte Folge wiederfinden und erinnerte mich nur an ein paar Schlüsselwörter. Normale Suchmaschinen halfen mir nicht. Mit Racoo habe ich sie gefunden – vielleicht hilft es dir genauso.'],
  ['Gehört Racoo zu den Podcasts?', 'Nein. Racoo ist ein unabhängiges Hobbyprojekt.'],
  ['Woher stammen die Texte?', 'Die Folgen werden maschinell transkribiert. Dabei können Fehler entstehen.'],
  ['Das Wort wird nicht gefunden', 'Kurze Wörter wie „Ei“ können unerwartete Treffer liefern. Standard findet auch Wortformen („Wort“ → „Wörter“). Probiere längere Schlüsselwörter oder Exakt (nur Standard-Top10). Auch Transkriptionsfehler oder noch fehlende Folgen können der Grund sein.'],
  ['Wie genau sind die Audiomarken?', 'Die Marken sind grobe Orientierungspunkte. Wechselnde Werbung kann sie zusätzlich um etwa ±2 Minuten verschieben.'],
  ['Warum fehlen die neuesten Folgen?', 'Ich versuche, neue Folgen regelmäßig zu verarbeiten. Deshalb sind nicht immer sofort alle aktuellen Folgen dabei.'],
  ['Warum heißt das Projekt Racoo?', 'Die erste Version wurde bei DAS PODCAST UFO in der Folge „Waschbär“ erwähnt. Darüber habe ich mich so gefreut, dass der Waschbär die Inspiration für den Namen wurde.'],
];

export function Faq() {
  return <details className="faq">
    <summary>FAQ<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></summary>
    <dl className="faq-answers">{answers.map(([question, answer]) => <div key={question}><dt>{question}</dt><dd>{answer}</dd></div>)}</dl>
  </details>;
}
