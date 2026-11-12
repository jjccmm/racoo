# Eingegebene Schreibweise in Suchanzeigen

Stand: 12. November 2026. [Ticket 10](../../.scratch/pagefind-minimap/issues/10-query-display-spelling.md), auf `feature/pagefind-minimap` umgesetzt.

Suchschlüssel bleiben NFC-normalisiert und kleingeschrieben. Ein getrennt gespeicherter Anzeigename erhält die eingegebene Schreibweise für Diagramm-/Transkriptlegenden, Einzelzählungen, Diagrammtooltips, Highlight-Titel und zugängliche Achsenbeschriftungen. Bei `Eimer EIMER` bleibt eine Serie mit dem ersten Anzeigenamen `Eimer`. Die Originaltranskripte und ihre Markierungen werden nicht umgeschrieben.

Web-Lint, TypeScript/Build, lokale Links und **130 Chromium-Fälle** bestanden: je 65 am Root- und Projektpfad, je vier separate Mehrpodcast-Fälle übersprungen. Die Prüfungen umfassen Unicode-/Dopplungsregeln, gemischte Schreibweise in Legende und beiden Tooltip-Arten sowie unveränderte Zahlen und Wiederverwendung desselben Originaltranskripts nach einer reinen Schreibweisenänderung.

Der normale Build enthält wieder **106 echte Folgen**. Index `f376233a6636…` und Veröffentlichung `939d88ce3706…` bleiben gleich, Artefakt 17.881.183 Byte. Echte Browserprüfung: automatische Vorgabe erscheint als `Eimer`; `EiMeR EIMER` erscheint als eine Serie `EiMeR`, auch im Leser und Tooltip. Die komplette Top10-Reihenfolge und Summen stimmen mit der ursprünglichen Eimer-Anfrage überein. Gespeicherte Episoden-/Katalogdaten und Python-/ASR-Code unverändert.

Die lokale Vorschau unter `http://127.0.0.1:4174/` zeigt den neuen Stand. Kein Main-Merge oder öffentliches Deployment.
