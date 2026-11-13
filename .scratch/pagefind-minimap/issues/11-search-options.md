# Exakt und Standard mit informativen Top10-Wortlisten

Status: resolved
Blocked by: none

## Auftrag

Zwei Sucharten, Standard als Vorgabe. Runder Optionsknopf öffnet eine Karte zwischen Suche und Diagramm, gemeinsame Kapselauswahl und kurze aufklappbare Hilfe. Rasterlisten zählen nur die aktuellen Top10, ohne Deaktivierung. Exakt prüft nur die fixierten Standard-Top10, ignoriert Groß-/Kleinschreibung und sortiert höchstens diese Kandidaten neu. Keine Ersatzfolgen; Alle ist in Exakt deaktiviert. Kein Erweitert und kein neuer Suchindex. FAQ kurz um Das Wort wird nicht gefunden ergänzen.

## Abnahme

- [x] Modus, Diagramm, Leser und Wortlisten stimmen überein, Standard bleibt nativ.
- [x] Top10-Grenze, Unicode/Bindestrichregeln, leere Resultate und Fehler/Retry prüfen.
- [x] Native Wortlisten laden nur Top10-Fragmente bei Bedarf, ohne Ausschlüsse.
- [x] Mobile/Dark-Darstellung und Root-/Projektpfad prüfen.
- [x] FAQ, aktive Dokumentation und Prüfnachweise aktualisieren.

## Comments

- 2026-11-13: Nutzer bestätigt ausschließlich Standard/Exakt und informative Top10-Listen. Erweitert ist ausdrücklich nicht umzusetzen. Implementierung auf feature/pagefind-minimap.

- Vollständiger Offline-Check und anschließende mobile Nachprüfung bestanden. [Abnahme](../../../docs/pilot/search-options.md) mit echtem106er-Bestand. Keine Umsetzung von Erweitert.
