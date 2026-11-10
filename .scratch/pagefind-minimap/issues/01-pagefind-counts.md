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

- Abgeschlossen in Integrationscommit `309441f` auf `feature/pagefind-minimap`. Vollständiger lokaler Check: 74 Python-Fälle, 49 Browserfälle je Basispfad und vier Mehr-Podcast-Fälle je Basispfad (106 ausgeführt). Echte 106 Folgen an beiden Pfaden: 10/10 Referenzsuchen auf Platz 1, 18-stellige UFO070-Minimap mit Touch/HiDPI, kalte Suche 4,0–4,1 s und Wiederholung 0,43–0,46 s im dokumentierten Mobilprofil. [Abnahme](../../../docs/pilot/pagefind-minimap.md).
