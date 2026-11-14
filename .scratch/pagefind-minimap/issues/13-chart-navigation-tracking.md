# Diagrammnavigation, Startwörter und Umami

Status: resolved
Blocked by: 12 (resolved)

## Auftrag

Überlappungshinweis unter den Ergebnissen entfernen. Top10-Balken führen zur zugehörigen Folge. UFO startet mit Eimer und Münze, explizite Suchlinks bleiben maßgeblich. Nach Scrollen einen schwebenden Nach-oben-Button anzeigen. Den beauftragten externen Umami-Code unverändert im HTML-Head einfügen.

## Abnahme

- [x] Balken per Klick und Tastatur erreichbar, richtige Karte fokussiert und sichtbar; Alle unverändert.
- [x] Eimer Münze als Default, leere/individuelle Suchlinks erhalten.
- [x] Nach-oben-Button auf kleinen/großen Ansichten; Player wird nicht überdeckt.
- [x] Umami-Code mit defer und gewünschter Website-ID; Suchlogik und Daten unverändert.
- [x] Lint, TypeScript und betroffene Browserfälle auf Root-/Projektpfad geprüft.

## Comments

- 2026-11-14: Umsetzung auf feature/pagefind-minimap begonnen.

- 2026-11-14: Lint und TypeScript bestanden. Je 18 betroffene Chromium-Fälle am Root- und /racoo/-Pfad bestanden (36 insgesamt). Dokuprüfung: 119 Markdown-Dateien ohne defekte Links. Echter 106-Folgen-Build wiederhergestellt. Zusätzliche Browserprüfung bei 320px im Dunkelmodus: Eimer Münze, Player und Nach-oben-Button ohne Überlappung (28px Abstand), Rücksprung zum Seitenanfang bestanden. Umami während gezielter QA blockiert; kein Dashboard-/Erfassungsnachweis.
