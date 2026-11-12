# Kompakte Karten und ungefilterte Zehnwortsuche

Die spätere [Verfeinerung von Fundstellensprung und Leser](earliest-hit-reader-polish.md) ersetzt den Start nach Eingabewort-Reihenfolge und ergänzt Fades, Quellenangabe und kompaktere Abstände. Dieser Bericht bewahrt die vorherige Abnahme.

Stand: 11. November 2026. [Ticket 06](../../.scratch/pagefind-minimap/issues/06-compact-cards-unfiltered-search.md) verfeinert die [offenen Transkriptkarten](open-transcript-cards.md) auf `feature/pagefind-minimap`.

## Ergebnis

Alle behält eine sichtbare X-Achse mit so vielen Folgentiteln, wie in die Breite passen. Kleine Abstände trennen die dünnen Balken; horizontales Scrollen bleibt unnötig. Die Ergebnisüberschrift lautet nur „Top 10 Folgen“.

Der Kartenrang ist größer, der Startknopf oben rechts ein Play-Icon mit zugänglicher Beschriftung. Die Textfensterhöhe sinkt von `clamp(350px, 62dvh, 640px)` auf `clamp(280px, 50dvh, 512px)`, also ungefähr 20 Prozent. Der Text beginnt links, ohne zentrierten Einschub. Wortlegende und Vor-/Zurücknavigation teilen eine Zeile; die Legende darf umbrechen. Der Fundstellen-Titel und der Kartenfußtext entfallen. Zeitknöpfe, Originaltexte und automatischer erster Treffer bleiben erhalten.

Der Player verwendet ein geometrisch zentriertes SVG-Schließenicon. Zusätzliche Zehnsekunden- und Teilen-Knöpfe entfallen. Unter dem Folgentitel steht nur „Werbung kann die Zeit in der Online-Audiodatei verschieben.“, anschließend die native Audioleiste. Bestehende Folge-/Zeitlinks bleiben nutzbar; Schließen stoppt und entwertet späte Antworten wie bisher. Unter dem Racoo-Logo der Podcastansicht ist weniger Abstand.

Bis zehn verschiedene Stichwörter erhalten eigene Farben. Erst beim elften Begriff erscheint der Grenzhinweis. Auf ausdrücklichen Nutzerwunsch werden alle eingegebenen Wörter durchsucht. Die aktive Ausschlusskonfiguration und ihre Dateiabrufe/Buildartefakte sind entfernt. Die ehemalige Liste liegt ausschließlich als [historischer Nachweis](../research/evidence/retired-search-rules.json) vor. Häufige Wörter können die weiterhin nach absoluten Suchwort-Treffern gebildete Rangfolge dominieren.

Die Podcast-Veröffentlichung verwendet Schema 3 ohne `searchRulesId` oder Suchregeldatei; Index, Metadaten und Vorbereitungsstand bleiben gemeinsam an die Veröffentlichungsidentität gebunden. Root-Veröffentlichung, Episoden- und Katalogschema ändern sich nicht.

## Nachweise

- Vollständiger lokaler Check `uv run --frozen python scripts/check.py`: Lint/Format, TypeScript, Builds, Links, **74 Python-Tests und 122 ausgeführte Chromium-Fälle bestanden**. Je 57 Browserfälle am Root-/Projektpfad und je vier Fälle für konfigurierte Podcasts; deren vier Fälle werden in den gewöhnlichen Durchläufen übersprungen und separat ausgeführt.
- Nach der letzten Anpassung der Legendenzeile die elf Diagramm-/Minimapfälle am Projektpfad zusätzlich bestanden. Native Zehnwortsuche, ungefilterte häufige Wörter, elfter Begriff, Headerstart, zentriertes Schließenicon, minimale Playeraktionen und bestehende Direktlinks sind abgedeckt.
- Normaler Build mit **106 echten Folgen**, Pagefind-Index `f376233a6636…`, statisches Artefakt **17.201.523 Byte**. Alle gespeicherten Episodendaten unverändert; keine neue ASR, kein Feedimport, kein Modell-/Audioabruf beim Build. Der Feedstand bleibt 8.11.2026.
- `node scripts/check_real_site.cjs http://127.0.0.1:4174/ docs/pilot/evidence/compact-cards-root.json`: alle zehn Referenzsuchen finden die erwartete Folge auf Rang 1, Alle enthält 106 Folgen ohne horizontalen Überlauf, mit sichtbaren Achsentiteln. [Such-/Mobilmessung](evidence/compact-cards-root.json)
- Echte UFO070-Karte, All-Diagramm und Player bei 1280, 390 und 320 Pixeln zusätzlich visuell geprüft. Ränge 24,8 px, Textfenster jeweils 422 px bei 844 px Viewporthöhe, Legende und Navigation in derselben Zeile, kein Seitenüberlauf. Alle zeigt acht, zwei beziehungsweise einen zur Breite passenden Titel. [Layoutbefunde](evidence/compact-cards-layout.json)
- Auf der echten mobilen Ansicht zusätzlich `haus geld eimer münze wasser auto essen telefon urlaub kleingeld` und anschließend das früher ausgeschlossene `dem` erfolgreich gesucht. Zehn Farben, geladener Originaltext, kein Hinweis und kein horizontaler Überlauf.

Im bisherigen emulierten Mobilprofil erschien der erste offene Originaltext nach **4.233 ms kalt / 604 ms warm**. Bis dahin wurden 992.723 Antwortkörper-Byte beobachtet; bei Wiederholung keine zusätzlichen. Profil: 390×844, DPR 2, Touch, CPU 4×, RTT 150 ms, Download 200.000 Byte/s und HTTP-Cache aus. Das sind lokale Desktop-CDP-Messungen für die dokumentierte Suchfolge, keine Garantie für Mobilgeräte, Internet, jede Zehnwortsuche oder einen echten 600-Folgen-Bestand. Die technische Referenzsuche ist keine unabhängige menschliche Qualitätsbewertung. Visuelle Playerprüfungen verwenden kontrolliertes Testaudio.

Die lokale Vorschau unter `http://127.0.0.1:4174/` zeigt den echten Bestand. Kein Main-Merge oder öffentliches Deployment als Teil dieser Änderung.
