# Abnahme: Standard / Exakt und informative Wortlisten

Stand: 13. November 2026, integriert auf feature/pagefind-minimap. [Ticket11](../../.scratch/pagefind-minimap/issues/11-search-options.md), [aktiver Suchvertrag](../search.md).

## Umsetzung

Runder Optionsknopf, aufklappbare Karte zwischen Suche und Diagramm, gemeinsame gleitende Zweifach-Kapsel sowie klickbare Modushilfe. Standard bleibt die native Vorgabe. Exakt scannt ausschließlich die fixierten Standard-Top10 im Original, zählt vollständige Unicode-Wörter ohne Unterschied der Groß-/Kleinschreibung und verwendet dieselben Bereiche für Leser und Minimap. Keine Ersatzfolgen; Alle ist in Exakt deaktiviert. match=exact teilt den Modus im Link.

Informative Wortlisten im Raster zählen nur die Top10. Sie verändern keine Suche. Standard lädt dafür nur deren fehlende Pagefind-Fragmente beim Öffnen; Originale bleiben für Leser lazy. Exakt braucht die höchstens zehn Originaltexte für die Prüfung und verwendet sie anschließend direkt für seine Karten. Keine globale Wortdatei, keine Ausschlüsse, kein Erweitert. FAQ um kurze Hinweise zu Ei, Wortformen und Transkript-/Bestandslücken ergänzt.

## Lokale Prüfungen

- scripts/check.py vollständig erfolgreich: 74 Python-Prüfungen, Ruff/Lint/TypeScript, Dateiverträge und Markdownlinks. Ein lokaler Pytest-Cache-Schreibhinweis blieb ohne Einfluss auf die Testergebnisse.
- 69 Browserfälle je Root-/racoo/-Pfad plus vier konfigurierte Mehrpodcastfälle je Pfad, zusammen 146 bestandene Browserprüfungen. Die vier nur für konfigurierte Podcasts vorgesehenen Fälle werden in den normalen Läufen absichtlich übersprungen und anschließend gesondert ausgeführt.
- Vier neue Fälle prüfen native Varianten ohne Eingriff, exakte Zahlen/Highlights, feste Top10-Grenze ohne Abruf weiterer Kandidaten, Unicode/NFC, Bindestriche/Schrägstriche, leere exakte Resultate und Downloadfehler mit Retry.
- Nach visueller Korrektur der mobilen Hilfe zusätzlich neun betroffene Browserfälle am /racoo/-Pfad erfolgreich: Optionen, mobile Gesamtnutzung und Themenwechsel. Finaler Lint und echter Produktionsbuild erfolgreich.
- Echte Desktop-/320px-Dunkelansicht visuell geprüft. Lange Hilfetexte erhalten beim Aufklappen die volle Breite; wenige Wortlisten werden im Raster nicht unnötig über die ganze Karte gestreckt.

## Echter 106er-Bestand

Mit Tisch: Standard-Top10 ergeben 46 Treffer in 14 normalisierten Schreibweisen; exakt innerhalb derselben Kandidaten 26 Treffer in 7 Folgen. Die Summe der informativen Varianten stimmt mit der Standard-Top10-Summe überein. Alle 26 sichtbaren exakten Markierungen sind Tisch, ohne andere Formen. Beim Standardlauf wurde zunächst ein Original für den sichtbaren Leser angefordert, nach Exakt genau die zehn Kandidatenoriginale. Keine JavaScriptfehler und kein horizontaler Seitenüberlauf bei 320px. [Kompakte Beobachtung](evidence/search-options.json)

Der normale echte Build wurde nach den Fixturechecks wiederhergestellt: 106 Folgen, Suchindex f376233a66369947c391ece1ddb3fd27ae51344ffdf4b784bef6ef7024c02d3d, Veröffentlichung 939d88ce37062fc74339fb8b297429250516a1b14c97e6ba900d2c29d01e4e0b. Keine neue Transkription und keine Datenmigration.

## Grenzen

Exakt ist ausdrücklich keine globale genaue Archivsuche: Außerhalb der Standard-Top10 liegende passende Folgen bleiben ungeprüft. Die bekannten nativen Stemming-/Präfix-/Chunkgrenzen von Standard bestehen fort. Die lokale Sicht-/Funktionsprüfung ersetzt keine gemessene GitHub-Pages-Netzwerklatenz, keinen echten Mobilgeräteversuch und keinen 600-Folgen-Nachweis. Neue Wortzeitstempel, Backend oder Sprachmodelle wurden nicht eingeführt.


## Verfeinerung vom 14. November

FAQ mit acht Antworten: Suchprobleme anhand von kommen/kommt/Kommentar und Ei erläutert, Exakt-Top10-Grenze und Transkriptionsfehler genannt, markante Nomen als Schlüsselwörter empfohlen, Herkunft als Inhaltszuordnung statt Eigentumsbehauptung formuliert. SVG-Fragezeichen öffnet eine kleine native Dialoghilfe. Schließen-Icon, Escape, Hintergrundklick und Fokusrückgabe; beide Themen und mobile Breite unterstützt. Die Hilfe spricht von exakten Übereinstimmungen. Lint, TypeScript/Build und je 13 betroffene Browserfälle an / und /racoo/ geprüft. Keine Suchlogik geändert; [Ticket12](../../.scratch/pagefind-minimap/issues/12-faq-help-popup.md).
