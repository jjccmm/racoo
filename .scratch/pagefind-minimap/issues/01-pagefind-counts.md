# Globale Pagefind-Trefferzählung

Status: resolved
Blocked by: none

## Acceptance criteria

- [x] Einzelbegriffe normalisieren, deduplizieren, fünf wirksame Begriffe begrenzen; keine zitierte Phrasensuche.
- [x] Unbeschränkte Rohresultate je Begriff zählen; Nullfolgen, Überschneidungen und stabile IDs nachweisen.
- [x] Details nur gezielt laden; erfolgreiche Workerinstanz wiederverwenden, Fehler/Abbruch/veraltete Antworten beherrschen.
- [x] Reale Engine-Prüfungen für Wiederholungen, Flexionen, Präfixe, Komposita, Mehrwortvereinigung, Unicode und Fehlerzustände.

## Comments

- 2026-11-10: Aus dem bestätigten Pagefind-/Minimap-Plan erstellt.

- Chromium am echten 106er-Index: Eimer 27, Münzen 32, Kleingeld 33; 29 Folgen in der Vereinigung, null Fragment-/Transkriptabrufe. Haus/Häuser liefern überlappende Positionen mit korrekt getrennter Einzel-/Eindeutigzählung. Weitere Engine-/Fehlerregressionen werden in Ticket 04 integriert.
