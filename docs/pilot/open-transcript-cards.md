# Direkt offene Transkriptkarten

Stand: 10. November 2026. Die [Verfeinerung](../../.scratch/pagefind-minimap/issues/05-open-transcript-cards.md) ist auf `feature/pagefind-minimap` umgesetzt. Sie ersetzt die Kurzvorschau mit optional geöffnetem Leser aus der [ersten Minimap-Abnahme](pagefind-minimap.md).

## Verhalten

Jede der zehn Trefferfolgen ist eine direkt offene Transkriptkarte. Der Header integriert Rang, Titel, Datum, Dauer, Episodenseite, Gesamtsumme, Suchabdeckung und die farbigen Einzelzählungen. „Von Anfang abspielen“ startet bei 0:00. Volltexte werden weiterhin erst für die erste oder gerade sichtbar werdende Karte abgerufen; geladene Karten bleiben gleichzeitig offen.

Das Textfenster springt zur ersten Fundstelle des ersten eingegebenen Wortes, das in dieser Folge Treffer hat. Die Reihenfolge der Eingabe bestimmt also den Start, auch wenn ein anderes Wort früher im Text vorkommt. Die Seitenscrollposition und der Suchfokus bleiben erhalten. Ändert sich die Textbreite, bleibt die aktive Fundstelle sichtbar.

Die helle vertikale Minimap zeigt grauen Miniaturtext, farbige Markierungen an den Textpositionen und einen Leserahmen. Zusätzliche rechte Farbspuren sowie Übersicht-/Ende-Beschriftungen entfallen. Klick, Ziehen, Touch und Tastatur bleiben nutzbar. Die Oberfläche spricht von Fundstellen und Textabschnitten. Die Zeitknöpfe im Text bleiben erhalten, einschließlich des Hinweises auf mögliche Werbeverschiebungen.

Der gemeinsame Player hat einen Schließen-Knopf. Er pausiert die Wiedergabe, gibt die Audioquelle frei, entfernt Folge/Zeit aus dem Link und gibt den Fokus an den Auslöser zurück. Ausstehende Metadaten-/Ladeantworten können den geschlossenen Player nicht erneut öffnen. Anschließend ist ein neuer Start möglich.

Top10 und Alle passen in die verfügbare Diagrammbreite. Viele Folgen erzeugen schmale Balken ohne überdeckende weiße Konturen. Bei mehr als dreißig Folgen entfallen in Alle die sichtbaren Achsentitel; vollständige Titel und Werte bleiben im Tooltip und in zugänglichen Beschriftungen erhalten.

## Lokale Abnahme

- `uv run --frozen python scripts/check.py`: Python-Lint/Format, Dokumentationslinks, Web-Lint/TypeScript und Builds bestanden; **74 Python-Tests und 120 ausgeführte Chromium-Fälle bestanden**. Davon jeweils 56 Fälle am Root- und Projektpfad sowie vier Fälle mit konfigurierten Podcasts pro Pfad. Die vier jeweils übersprungenen Fälle gehören zum separat ausgeführten konfigurierten Bestand.
- Browserprüfungen decken erste Fundstelle nach Eingabereihenfolge und Fallback, unveränderten Suchfokus, Sichtbarkeit nach Resize, mehrere offene Karten, Minimapnavigation, Headerstart bei 0:00, Schließen/Fokus/Ressourcenfreigabe, spätes Audio und Wiederöffnen ab.
- Top10 und Alle passen bei 320, 390 und 1280 Pixeln ohne horizontales Scrollen. Desktop- und Mobilansicht der echten UFO070-Karte sowie das Alle-Diagramm wurden zusätzlich als Screenshots visuell geprüft.
- Anschließend normaler `npm.cmd --prefix web run build`: **106 echte Folgen**, unveränderte gespeicherte Episodendaten, statisches Artefakt **17.204.551 Byte**. Keine Transkription, kein Audio-/Modellabruf. Feedstand unverändert.
- `node scripts/check_real_site.cjs http://127.0.0.1:4174/ docs/pilot/evidence/open-transcript-cards-root.json`: alle zehn Referenzsuchen finden die erwartete Folge auf Rang 1; Alle enthält 106 vollständig beschriftete Folgen, keine sichtbaren X-Titel und keinen horizontalen Überlauf. Die [maschinellen Ergebnisse](evidence/open-transcript-cards-root.json) enthalten die Suchfälle und Mobilmessung.

Im emulierten Mobilprofil (390×844, DPR 2, Touch, CPU 4×, RTT 150 ms, 200.000 Byte/s Download, HTTP-Cache aus) erschien der erste offene Originaltext nach **4.061 ms kalt / 552 ms warm**. Bis zum ersten Ergebnis wurden 993.946 Antwortkörper-Byte beobachtet, bei warmer Wiederholung keine zusätzlichen. Das sind lokale Desktop-CDP-Messungen, keine Garantie für physische Mobilgeräte, Internet oder einen späteren Bestand von 600 Folgen. Die Suchstichproben sind technische Prüfungen mit bekannten Transkriptwörtern, keine unabhängige menschliche Suchqualitätsbewertung.

Die lokale Vorschau unter `http://127.0.0.1:4174/` zeigt wieder den echten Bestand. Diese Abnahme enthält keinen Merge auf `main` und kein öffentliches Deployment.
