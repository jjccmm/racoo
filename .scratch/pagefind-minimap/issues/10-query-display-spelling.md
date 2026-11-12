# Eingegebene Schreibweise in Suchanzeigen

Status: resolved
Blocked by: none

## Acceptance criteria

- [x] Legenden, Einzelzählungen, Diagramm-/Highlight-Tooltips und zugängliche Beschriftungen übernehmen die eingegebene Schreibweise.
- [x] Normalisierte Such-/Zählschlüssel und Cache bleiben unabhängig von Groß-/Kleinschreibung. Wiederholungen desselben Begriffs erhalten die erste eingegebene Schreibweise.
- [x] Originaltranskripte unverändert; Standard-Eimer, Unicode und Startdemo weiterhin korrekt.
- [x] Relevante lokale Prüfungen und echte Vorschau aktualisiert.

## Comments

- 2026-11-12: Nutzerauftrag. Anzeigename getrennt vom normalisierten Suchbegriff halten.

- 2026-11-12: Web-Lint, TypeScript, Links und 130 Browserfälle bestanden. Echter 106er-Bestand: Eimer/EiMeR-Anzeigen, Tooltips und unveränderte Top10-Zahlen geprüft. [Abnahme](../../../docs/pilot/query-display-spelling.md).

- 2026-11-12: In `a814181` auf `feature/pagefind-minimap` integriert. Alle zehn Tickets erfüllt; 130 Browserprüfungen und echte Anzeige-/Zählprüfung bestanden.
