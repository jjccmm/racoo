# Freitext, Ergebnisse und heller Minimap-Leser

Status: resolved
Blocked by: 01, 02

## Acceptance criteria

- [x] Freitext-Startdemo und Podcastformular, keine Dropdowns/Pflichtchips/haus-Vorbelegung; q übernehmen.
- [x] Diagramm Top10/Alle, Einzelwerte und Abdeckung aus gemeinsamen Suchpositionen; Stoppwörter sichtbar erklären.
- [x] Eine aktive Folge vollständig chronologisch mit Originaltext und echten Trefferbereichen öffnen.
- [x] Helle vertikale Canvas-Minimap mit Leserahmen, Farben, Klick/Ziehen, Tastatur und Vor-/Zurücknavigation; mobil vertikal.
- [x] Gemeinsamer Player/Segmentanfänge, Werbehinweis und Deep Links bleiben bedienbar; Minimap startet kein Audio.

## Comments

- 2026-11-10: Aus dem bestätigten Pagefind-/Minimap-Plan erstellt.

- 2026-11-10: Transkriptbasierter echter 106er-Build erfolgreich (17,2 MB), 30 gezielte Python-Fälle bestanden. Freitext/Minimap mit echtem UFO070 auf Desktop und 390 px geprüft; 45 Browserfälle im ersten Durchlauf bestanden, zwei überholte Fixture-Erwartungen werden im Integrationsticket berichtigt.

- Abgeschlossen in Integrationscommit `309441f` auf `feature/pagefind-minimap`. Vollständiger lokaler Check: 74 Python-Fälle, 49 Browserfälle je Basispfad und vier Mehr-Podcast-Fälle je Basispfad (106 ausgeführt). Echte 106 Folgen an beiden Pfaden: 10/10 Referenzsuchen auf Platz 1, 18-stellige UFO070-Minimap mit Touch/HiDPI, kalte Suche 4,0–4,1 s und Wiederholung 0,43–0,46 s im dokumentierten Mobilprofil. [Abnahme](../../../docs/pilot/pagefind-minimap.md).
