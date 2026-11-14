# Umami-Events für Suchanfragen und Suchwörter

Status: resolved
Blocked by: 13 (resolved)

## Auftrag

Bewusst abgeschickte Podcast-Suchen als gesamtes Suchereignis und je unterschiedlichem Suchwort erfassen. Keine eigenen Suchevents für automatische Vorbelegung, Linkaufruf, Texteingabe, Moduswechsel oder die Startdemo. Suchlogik unverändert.

## Abnahme

- [x] search mit query, podcast und mode; search-word je normalisiertem, dedupliziertem Wort mit word, podcast und mode.
- [x] Klick und Enter jeweils einmal zählen; leere/ungültige Eingaben nicht zählen.
- [x] Automatische Suchen, Moduswechsel und reine Texteingaben lösen keine eigenen Suchevents aus.
- [x] Fehlender, synchron fehlerhafter oder abgelehnter Tracker blockiert die Suche nicht.
- [x] Lokale Browserprüfung mit simuliertem Tracker am Root-/Projektpfad; keine echten Testevents an Umami.

## Comments

- 2026-11-14: Implementierung auf feature/pagefind-minimap. API gegen offizielle Tracker-Dokumentation geprüft.

- 2026-11-14: Je 18 betroffene Chromium-Fälle auf Root- und /racoo/-Pfad bestanden (36 insgesamt), einschließlich vier dedizierter Trackingfälle je Pfad. Simulierter Tracker prüft tatsächliche Formularaktionen, Anfrage/Wortdaten, Deduplizierung, Moduszuordnung und Ausfallverhalten. TypeScript/Build und Lint bestanden; 120 Markdown-Dateien ohne defekte Links. Kein Nachweis im externen Umami-Dashboard; keine echten Tracking-Testevents.
