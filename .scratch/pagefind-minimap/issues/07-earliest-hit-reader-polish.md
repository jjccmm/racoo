# Früheste Fundstelle und ruhiger Transkriptleser

Status: resolved
Blocked by: none

## Acceptance criteria

- [x] Jede neue Suche springt zur frühesten chronologischen Fundstelle aller Suchwörter, auch bei erweitertem Suchtext und gecachtem Originaltranskript; Suche behält Fokus.
- [x] Text blendet an beiden Scrollgrenzen leicht aus; am tatsächlichen Anfang/Ende entfällt der jeweilige Fade. Minimap hat Kartenfarbe.
- [x] Textfenster weitere 15 Prozent niedriger, Wortlegende näher an Zählungen; Karten, Diagramm und Podcastauswahl mit demselben leichten Schatten.
- [x] Diagnose-/Laufzeitbereiche unter Ergebnissen entfallen zugunsten eines kleinen podcastspezifischen Quellenhinweises samt Hinweis auf maschinelle Fehler. Gespeicherte Laufzeiten/Logs bleiben erhalten.
- [x] Kompakte gleiche Abstände vor/nach Suche, Logo näher an Podcastinfos und Waschbär mit Podcastcover bündig; Website-Link hinter Sprechern.
- [x] Tab-Icon verwendet das vorhandene Racoo-Logo; Root-/Projektpfad, mobile Darstellung und echte 106 Folgen geprüft.

## Comments

- 2026-11-12: Repro mit realem UFO070: `node .cache/repro-first-hit.cjs` schlägt fehl. `kratzeis` → `kratzeis urlaub`: aktive Stelle Kratzeis, erste DOM-Fundstelle Urlaub, Originaltranskript-Abrufe vorher/nachher jeweils 1. Neue gewünschte Semantik ersetzt die frühere Auswahl nach Eingabewort-Reihenfolge.

- 2026-11-12: Die chronologische Auswahl behebt den ursprünglichen Repro ohne zusätzlichen Originalabruf. 74 Python-/128 Browserprüfungen, realer 106er-Build, zehn Suchstichproben und Desktop/390/320 px bestanden. [Abnahme und Messgrenzen](../../../docs/pilot/earliest-hit-reader-polish.md).

- 2026-11-12: In `47d8373` auf `feature/pagefind-minimap` integriert. Alle sieben Tickets erfüllt. [Abnahme](../../../docs/pilot/earliest-hit-reader-polish.md) mit 74 Python-/128 Browserprüfungen und realem 106er-Bestand.
