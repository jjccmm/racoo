# Direkt offene Transkriptkarten und kompakte Diagramme

Status: resolved
Blocked by: none

Neue Nutzeranforderungen nach Abnahme der ersten Minimap-Version.

## Acceptance criteria

- [x] Alle bisherigen Folgeninfos sind im Header einer direkt offenen Transkriptkarte integriert; keine getrennten Kurzausschnitte oder Öffnen-Schaltfläche.
- [x] Jede geladene Karte scrollt innerhalb ihres Textfensters automatisch zur ersten Fundstelle des ersten passenden eingegebenen Suchworts, ohne den Seitenfokus zu übernehmen.
- [x] Minimap enthält nur Textabbild, farbige Textmarkierungen und Leserahmen, keine rechten Farbspuren oder Beschriftungen Übersicht/Ende.
- [x] Nutzeroberfläche verwendet verständliche Zeit-/Textstellen statt „Segment“; vorhandene Abspielknöpfe bleiben.
- [x] Header startet die ganze Folge bei 0. Der gemeinsame Player lässt sich schließen, stoppt Audio und kann durch späte Antworten nicht erneut erscheinen.
- [x] Top10 und Alle passen vollständig in die verfügbare Diagrammbreite; dünne Balken ohne überdeckende weiße Kontur und reduzierte Titel bei vielen Folgen.
- [x] Desktop/Mobil, erste Fundstelle, mehrere offene Karten, vollständiger Bestand und Playeraktionen geprüft; aktive Doku/Prüfer aktualisiert.

## Comments

- Der Nutzerwunsch ersetzt die frühere Beschränkung auf einen optional geöffneten Leser. Originaldaten, globale Zählungen und sichtbarkeitsabhängige Detailabrufe bleiben erhalten.

- Lokale Abnahme: 74 Python- und 120 Chromium-Prüfungen bestanden; Root-/Projektpfad und konfigurierte Podcasts. Echter 106er-Build, zehn Referenzsuchen, erste Fundstelle nach Resize und Desktop-/Mobilansicht geprüft. [Nachweise und Messgrenzen](../../../docs/pilot/open-transcript-cards.md).

- 2026-11-10: Verfeinerung in `406aa04` auf `feature/pagefind-minimap` integriert. Alle fünf Tickets erfüllt; [Abnahme der offenen Transkriptkarten](../../../docs/pilot/open-transcript-cards.md) mit 74 Python-/120 Browserprüfungen und realem 106er-Bestand.
