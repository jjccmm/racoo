import example from '../../tests/fixtures/synthetic-episode.json';

export function App() {
  return (
    <main>
      <p className="eyebrow">Podcast Words / V3</p>
      <h1>Eine erinnerte Stelle wiederfinden.</h1>
      <p className="intro">Podcast-Passagen suchen. Wörter entdecken. Im Kontext weiterhören.</p>
      <aside className="notice" aria-label="Entwicklungsstand">
        <strong>Entwicklungsstart · ausschließlich synthetische Beispieldaten</strong>
        <p>Die Arbeitsumgebung steht. Echte Transkription, Suche und Wiedergabe folgen im Pilot.</p>
      </aside>
      <section aria-labelledby="pilot-title">
        <h2 id="pilot-title">Der erste Schritt: fünf Folgen, ein vollständiger Ablauf.</h2>
        <div className="steps">
          <article><span>01</span><h3>Verarbeiten</h3><p>Audio, Transkript und Zeitmarken zusammenführen.</p></article>
          <article><span>02</span><h3>Wiederfinden</h3><p>Stichwörter suchen und passende Passagen prüfen.</p></article>
          <article><span>03</span><h3>Vergleichen</h3><p>Wortverläufe und Statistiken aus demselben Datenstand zeigen.</p></article>
        </div>
      </section>
      <section className="example" aria-labelledby="example-title">
        <p className="eyebrow">Synthetisches Vertragsbeispiel · kein echtes Transkript</p>
        <h2 id="example-title">{example.title}</h2>
        <details>
          <summary>Zwei Beispielsegmente ansehen</summary>
          {example.segments.map((segment) => (
            <p key={segment.id}>
              <span className="timestamp">{segment.start_seconds}–{segment.end_seconds} s</span>
              {segment.text}
            </p>
          ))}
        </details>
        <p className="muted">Die Beispieldatei wird auch vom Python-Validator geprüft. Es ist keine Audiodatei hinterlegt.</p>
      </section>
    </main>
  );
}
