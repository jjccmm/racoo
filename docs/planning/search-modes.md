# Vorschlag: Suchoptionen und ausschließbare Wortvarianten

Stand: 13. November 2026. **Bewertung und Plan, noch nicht zur Umsetzung bestätigt.** Diese Konkretisierung ersetzt die vorherige Empfehlung eines eigenen Standard-Matchers. Die laufende Seite und der [aktive Suchvertrag](../search.md) bleiben unverändert. Grundlage: [API-Recherche](../research/variant-filter-api-2026-11-13.md), [lokale Datenmessung](../research/variant-filter-traffic-2026-11-13.md), [bisherige Untersuchung](../research/search-modes-2026-11-12.md).

## Bewertung und empfohlene Oberfläche

Der Nutzervorschlag ist sinnvoll und statisch umsetzbar. Er bewahrt die einfache normale Suche und legt fortgeschrittene Steuerung in eine aufklappbare Karte. Empfohlen: rundes Schieberegler-Icon rechts neben der Suche, darunter im Seitenfluss die Suchoptionen zwischen Suchzeile und Diagramm. Die Karte verändert keine Ergebnisse allein durch Öffnen oder Schließen. Bei aktivem Sondermodus/Ausschluss bleibt neben dem Icon ein kleiner sichtbarer Status stehen, damit geschlossene Optionen keine unerklärlich abweichenden Zahlen verursachen.

Die vorhandene Top10/Alle-Kapsel ist eigenes React/CSS und lässt sich ohne zusätzliche UI-Bibliothek auf drei Segmente übertragen. Ein neuer gemeinsamer Baustein kann beide Varianten mit zwei/drei Einträgen, gleitender Fläche, Tastaturbedienung und reduzierter Bewegung abdecken. Die drei Sucharten sind eine eigene Auswahl neben der unveränderten Diagrammauswahl.

Ein kleines Fragezeichen öffnet per Klick/Tastatur eine kurze Erklärung; nicht ausschließlich als Hover-Tooltip. Vorgeschlagener Inhalt:

| Modus | Erklärung | Beispiel |
| --- | --- | --- |
| Exakt | Nur vollständige gleich geschriebene Wörter, ohne Unterschied der Groß-/Kleinschreibung | Ei zählt Ei, aber nicht eine; Tisch zählt nicht Tische/Tischtennis |
| Standard, Vorgabe | Die bisherige Pagefind-Suche: Wortformen und Wortanfänge können passen | Tisch findet Tische und Tischtennis; Wort findet Wörter |
| Erweitert | Standard plus kontrolliert zugelassene deutsche Voranstellungen | kommen soll auch vorkommen und herkommen finden |

**Standard bleibt die aktuelle native Pagefind-Suche und die Vorgabe beim Einstieg.** Die vorher vorgeschlagene Stammgleichheit ohne Präfixe ist dafür nicht der Vertrag. Auch ein Austausch von Pagefind gehört nicht zu diesem Entwurf. Seine bekannten Reihenfolge-/Chunk-Grenzen bleiben dokumentiert; eine separate Korrektur ist nicht stillschweigend eingeschlossen.

## Listen tatsächlich gefundener Formen

Für jedes akzeptierte Stichwort eine kompakte Liste mit eingegebener Schreibweise als Überschrift und derselben Serienfarbe anzeigen. Darin die tatsächlich getroffenen Oberflächenformen, nicht nur Wörter mit ähnlicher Bedeutung, nach ihrer gesamten nativen Trefferzahl über **alle Trefferfolgen** sortieren. Bei Gleichstand alphabetisch. Groß-/Kleinschreibung einer Form zusammenfassen; natürliche Anzeige etwa anhand ihrer häufigsten Originalschreibweise wäre zu definieren. Die Positionen aus der gemessenen Zusatzdatei sind normalisierte IDs; Anzeigenamen sind noch nicht vermessen.

Bei zehn Stichwörtern kein dauerhaftes Zehnspaltenlayout: auf breiten Ansichten ein Raster, auf kleinen Ansichten einzelne aufklappbare Wortlisten. Jede geöffnete Liste hat eine begrenzte Höhe und bei Bedarf ihren eigenen Scrollbereich. Bei vielen Formen optional eine lokale Filterzeile ergänzen, falls die Benutzung das rechtfertigt.

Ein Klick schaltet genau die ausgewählte Form aus oder wieder ein. Grau plus Durchstreichen und ein klarer Auswahlzustand machen dies sichtbar. Die Zeile bleibt mit ihrer ursprünglichen Häufigkeit stehen, damit sie wieder einschaltbar ist und die Liste nicht bei jedem Klick umsortiert. Beispielsweise Tischtennis ausschließen betrifft diese Form, nicht automatisch Tischtennisball. Ein sichtbarer Ausschlusszähler und Alle zurücksetzen verhindern versteckte Filter.

Vorschlag entsprechend „in der Suche ignoriert“: Ausschlüsse gelten für alle Folgen und alle Stichwortserien **dieser aktuellen Suche**, unabhängig von der gerade angezeigten Top10. Dieselbe Form in mehreren Wortlisten zeigt denselben Zustand. Alle markierten Formen sind in Zählung, Diagramm, Leser, Navigation und Minimap ausgeschlossen. Eine Stelle darf nicht über eine andere Suchserie sichtbar bleiben, wenn die Form global ausgeschlossen wurde. Neue Suchbegriffe/Moduswechsel und geteilte Links brauchen einen festgelegten Umgang mit dem Filterzustand; keine ungefragte dauerhafte globale Ausschlussliste im Browser einführen.

## Warum die Listen nicht auf Top10 beschränken

Die vorgeschlagene Nachladeschleife liefert ohne weitere Nachweise keine vollständige Wortliste oder sichere neue Rangfolge. Eine bislang außerhalb liegende Folge kann nach Ausschlüssen führend werden. Auch ihre Formen und bereinigten Zahlen wären dann zunächst unbekannt. Im schlimmsten Fall müssen alle bisherigen Kandidaten geprüft werden. Außerdem benötigt die Ansicht Alle ohnehin bereinigte globale Werte.

Deshalb erst die vollständigen Trefferpositionen aller Kandidaten mit ihren Formen bestimmen, dann Ausschlüsse anwenden und die Folgen neu sortieren. Erst danach werden die nun sichtbaren Lesertexte geladen. Nur die neue Karte benötigt eventuell einen noch fehlenden Text; die globale Rangberechnung darf darauf nicht warten.

## Datenbedarf und bevorzugter Ansatz

Pagefind gibt `result.words` als Positionen zurück; die Oberflächenformen stehen erst im vollständigen `result.data().content`. Die heutige API würde daher die **Pagefind-Textfragmente aller passenden Folgen** brauchen. Die separaten Original-JSONs aller Folgen müssen dafür nicht zusätzlich geladen werden. Die [versionsgebundene Recherche](../research/variant-filter-api-2026-11-13.md) erklärt, warum Playground-Stämme und reine Wörterhäufigkeiten diese Lücke nicht schließen.

Bevorzugter Machbarkeitsnachweis: Pagefind behalten und beim Build eine **kompakte Zuordnung Position → Wort-ID** mit gemeinsamem Oberflächenlexikon erzeugen. Das sind Suchpositionen, keine Audio-Wortzeitstempel; die Episoden-JSONs und groben Audiozeiten ändern sich nicht.

1. Der normale Standardweg ohne Optionen/Filter startet wie bisher allein mit dem nativen Suchindex. Ein Öffnen der Optionen lädt die zusätzliche Zuordnung für diesen Podcast/Datenstand, soweit nicht bereits gecacht. Bereits aktive Sondermodi/Filter lösen den nötigen Abruf auch bei geschlossener Karte aus.
2. Für jede native Trefferposition die Wort-ID nachschlagen. Dadurch erhält Standard seine tatsächlichen Formen samt globalen Häufigkeiten, ohne alle Texte zu laden und ohne weitere native Erweiterungsqueries auszuführen.
3. Ausgeschlossene IDs aus den nativen Positionsmengen entfernen. Pro Serie neu zählen, Nullfolgen erhalten und Top10/Alle neu sortieren. Die ungefilterten Basismengen und Variantenhäufigkeiten bleiben für Rücknahme im Cache.
4. Leser verwenden die gefilterten Positionen. Bisherige Fragment-/Originaltext-Prüfungen, lazy Karten, Abbruch und Fehlerzustände beibehalten. Nur fehlende Details nun sichtbarer Folgen nachladen.
5. Exakt/Erweitert können dieselbe Zuordnung verwenden, benötigen jedoch ausdrücklich definierte Regeln und gegebenenfalls Komponenteninformationen. Eigene Wortformen für Erweitert dürfen die native Standardinstanz nicht durch heimliche Zusatzqueries erwärmen.

Ein-ID-je-Whitespace-Position ist ein Größenprototyp, noch kein abschließender Wortgrenzenvertrag. Insbesondere Euro-Münze, Wort/Teil und direkt aneinanderstehende Wörter ohne Leerzeichen benötigen Beispiele. Soll Exakt einzelne Komponenten unterscheiden oder mehrfach innerhalb derselben nativen Position zählen, braucht der Entwurf zusätzliche Informationen. Diese Entscheidung geht dem Produktionsschema voraus.

## Gemessener Traffic im 106er-Bestand

| Eingabe | Trefferfolgen / Formen | Native Counts-Dateien | Vollständige Textfragmente für Varianten ohne Zusatzzuordnung |
| --- | ---: | ---: | ---: |
| Tisch | 53 / 20 | 0,20 MB | 2,76 MB |
| Wort | 99 / 45 | 0,20 MB | 4,90 MB |
| kommen | 106 / 77 | 0,21 MB | 5,20 MB |

Gemessen sind lokale Response-Bodies, ohne App-Shell/HTTP-Header. Fragmente sind intern komprimiert. Bereits für sichtbare Karten geladene Fragmente müssen nicht noch einmal übertragen werden. Das ist keine Pages-Netzwerkmessung.

Der Zusatzdatei-Prototyp für **alle 106 Folgen** umfasst rund **4,80 MB JSON beziehungsweise 1,91 MB offline gzip**, inklusive Vokabular und ohne fertige Metadaten/Runtime. Eine optionale Binärkodierung spart komprimiert nur etwa 0,21 MB und ist zunächst nicht erforderlich. Die ältere 0,55-MB-Probe reiner Zählpaare erfüllt den jetzt ausdrücklich gewünschten Erhalt beliebiger nativer Standardpositionen nicht.

Komprimierte Auslieferung und Paketierung müssen bewusst gewählt und geprüft werden; sonst fallen die größeren Rohgrößen an. Eine geladene Zuordnung pro Datenstand wiederverwenden. Weitere Ausschlüsse brauchen dann keine neuen Dateien für globale Formen/Zahlen, neu sichtbare Karten eventuell schon. Bei 600 Folgen ist eine vollständige neue Messung nötig; ein bloß lineares Vergleichsszenario liegt bei etwa 29 MB Fragmenten bzw. 11 MB gzip-Zuordnung und ist keine belastbare Prognose. Deshalb Zusatzdaten nicht ungefragt beim normalen Einstieg laden und Pakete nach gemessenem Bedarf wählen. Die Aufteilung in wenige Pakete kann unabhängig vom endgültigen internen Format erfolgen; feste 64 Teile sind keine Vorgabe.

## Erweitert: Präfixvorschlag bewerten

Eine kurze, explizite Liste wie an-, her-, hin-, vor-, zurück-, mit- ist ein sinnvoller begrenzter Einstieg. Sie bleibt technische Erweiterung, keine vollständige deutsche Sprachfamilie. Vorschlag zur Machbarkeit:

- Nur Kombinationen zulassen, die im tatsächlichen Podcastvokabular vorkommen. Erfundenen Suchwörtern keine nativen Queries geben, die über Pagefind-Fallbacks unerwartete kürzere Wörter treffen können.
- Standardpositionen stets erhalten und zusätzliche akzeptierte Formen vereinigen; dieselbe Position je Stichwort nur einmal zählen. Die Formliste macht die Erweiterung sichtbar und korrigierbar.
- Zusammenspiel von Präfix, Eingabestamm und Wortanfang anhand echter Beispiele entscheiden. Ein Stemmer gleicher Bezeichnung garantiert keine identische Implementierung; die Fassung festlegen und prüfen.
- Bedeutungsänderungen sind zu erwarten: bekommen ist nicht dasselbe wie kommen, versuchen nicht dasselbe wie suchen, aufhören nicht dasselbe wie hören. kam sowie getrennte Verbteile werden damit nicht automatisch vollständig erkannt.

Viele zusätzliche Enginequeries sind technisch möglich, erhöhen aber Aufrufe und können den nativen Chunkzustand verändern. Bevorzugt ist deshalb eine ausdrücklich corpusbegrenzte Auswahl anhand des Zusatzlexikons mit anschließendem Positionsvergleich. Die genaue Präfixliste und Vergleichsregel bleiben vor einem Ticket für Erweitert offen.

## Vorgehen nach Bestätigung

1. Wortgrenzen, globale Ausschlusssemantik, Filterzustand bei neuen Suchen/Links und Extended-Beispielmatrix festlegen.
2. Kleine echte Pagefind-Fixture mit Standard/Exakt, Komponenten und überlappenden Stichwörtern; kompakte Zuordnung samt Fehler-/Versionsbindung erproben. Bestehende Standardpositionen müssen für dieselbe native Abfragefolge unverändert bleiben.
3. Auf dem 106er-Bestand native Formenlisten, Ausschluss-Neuranking und Leser-Markierungen gegen die vollständige Fragmentreferenz prüfen. Counts und echte markierte Stellen müssen gemeinsam stimmen, einschließlich eines Top10-Wechsels.
4. Komprimierte Veröffentlichung, Paketanzahl, Browsercache, kalte/warme Bytes, Arbeitsspeicher und Ausschluss-Reaktionszeit messen; anschließend UI-Karte, dreiteilige Kapsel und Hilfe integrieren.
5. Erweitert erst nach bestätigter Kandidatenregel integrieren; anschließend Handyansichten, beide Themen, Tastatur, Suchlinks und einen neuen Publikationsstand prüfen. Vorhandene Transkripte wiederverwenden.

Kein neuer Backenddienst, kein spaCy-Modell und keine neue Transkription erforderlich. Die Umsetzung ist durch diese Bewertung noch nicht begonnen; der Plan dient der nächsten Entscheidung.
