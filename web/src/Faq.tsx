const answers = [
  ['Warum gibt es Racoo?', 'Ich wollte eine bestimmte Folge wiederfinden und erinnerte mich nur an ein paar Schlüsselwörter. Normale Suchmaschinen halfen mir nicht. Mit Racoo habe ich sie gefunden – vielleicht hilft es dir genauso.'],
  ['Gehört Racoo zu den Podcasts?', 'Nein. Racoo ist ein unabhängiges Hobbyprojekt.'],
  ['Woher stammen die Texte?', 'Die Texte werden maschinell aus den Podcastfolgen erstellt. Die Inhalte stammen von den jeweiligen Podcast-Autorinnen und -Autoren; Racoo macht sie durchsuchbar. Bei der Transkription können Fehler entstehen.'],
  ['Es werden zu viele oder zu wenige Wörter gefunden', 'Standard berücksichtigt Wortanfänge und Wortstämme: „kommen“ findet so auch „kommt“, aber ebenso „Kommentar“. Sehr kurze Wörter wie „Ei“ liefern viele Treffer, etwa „eigentlich“ oder „eine“. Exakt prüft nur die zehn Folgen mit den meisten Standardtreffern auf exakte Übereinstimmungen. Transkriptionsfehler können dazu führen, dass gesagte Wörter fehlen.'],
  ['Mit welchen Wörtern klappt die Suche am besten?', 'Probiere markante Nomen (Substantive) wie „Eimer“, „Münze“ oder „Waschbär“. Ihre Formen lassen sich oft leichter zusammenführen als die von Verben. Kombiniere am besten zwei oder drei Schlüsselwörter, an die du dich erinnerst.'],
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
