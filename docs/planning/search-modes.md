# Suchoptionen mit informativen Top10-Wortlisten

Stand: 13. November 2026. **Wortlisten und begrenzter Exaktmodus vom Nutzer präzisiert; Erweitert noch in Abstimmung.** Diese Fassung ersetzt den vorherigen Vorschlag globaler ausschließbarer Wortformen und einer vollständigen Positions-/Wortzuordnung. Die laufende Anwendung und der [aktive Suchvertrag](../search.md) sind noch unverändert. Grundlage: [API-Recherche](../research/variant-filter-api-2026-11-13.md), [106er-Größenmessung](../research/variant-filter-traffic-2026-11-13.md), [Präfixbeispiele](../research/evidence/prefix-fallback-2026-11-13.json).

## Oberfläche und festgelegter Umfang

Rundes Schieberegler-Icon rechts neben der Suche. Klick öffnet die Suchoptionen als Karte zwischen Suche und Diagramm. Die bestehende Top10/Alle-Kapsel auf drei Auswahlmöglichkeiten Exakt / Standard / Erweitert übertragen; daneben per Klick/Tastatur eine kurze Erklärung mit Beispielen öffnen. Standard ist beim normalen Einstieg die bisherige native Pagefind-Suche mit Wortformen und Wortanfängen. Für einen aktiven Sondermodus bei geschlossener Karte einen kleinen sichtbaren Status vorsehen.

Unter der Modusauswahl je Suchbegriff eine informative Wortliste im Raster zeigen. Die Überschrift verwendet die eingegebene Schreibweise und die Serienfarbe. Die Liste zählt ausschließlich die tatsächlich gefundenen Stellen in den **Top10 dieses Suchergebnisses**, unabhängig davon, ob das Diagramm Top10 oder Alle zeigt. Häufigkeiten je normalisierter Schreibweise zusammenfassen, absteigend sortieren, Gleichstände alphabetisch. Beschriftung beispielsweise Gefundene Wörter in den Top 10. Kleine eigene Scrollbereiche; mobile Anordnung ohne zehn schmale Spalten.

**Keine Deaktivierung oder Auswahl durch Klick, keine Ausschlussliste und keine Änderung der Suche durch die Wortlisten.** Es gibt keinen Filterzustand, kein Durchstreichen, keinen Ausschlusszähler und keine daraus folgende Nachladeschleife für andere Folgen. Solange nicht alle benötigten Top10-Texte vorliegen, einen Ladezustand oder ausdrücklich unvollständigen Zwischenstand zeigen; Teilzahlen dürfen nicht als fertige Summen erscheinen.

Die natürliche Anzeige einer zusammengefassten Form, etwa Tisch statt tisch, anhand der häufigsten Originalschreibweise festlegen. Die eingegebenen Stichwörter behalten wie bisher ihre ursprüngliche Schreibweise für Legenden und Überschriften.

## Modus Standard

Die bisherigen unabhängigen nativen Pagefind-Suchen über den ganzen veröffentlichten Podcastbestand bleiben unverändert. Alle Rohpositionen zählen, danach Top10 bestimmen. Die Wortlisten erklären lediglich die in diesen zehn Folgen tatsächlich vorkommenden getroffenen Formen, beispielsweise Tisch/Tische/Tischtennis. Sie ändern keine globalen Diagrammwerte oder Leserstellen.

Die bekannten Chunk-/Reihenfolgegrenzen bleiben dokumentiert; der neue Modusname verspricht keine Korrektur dieser Enginegrenzen. Zusätzliche Erweitert-Abfragen können den nativen Ladezustand verändern. Einen Wechsel von Erweitert zurück zu Standard deshalb ohne versteckte Zusatzqueries ausführen; getrennte Instanzen/Caches sind als Schutz gegen neu eingeführte Vermischung zu prüfen.

## Modus Exakt: bewusst auf zehn Kandidaten begrenzt

Festgelegter Ablauf:

1. Dieselbe Standardsuche ausführen und deren höchstens zehn führende Folgen anhand der bestehenden Gesamtsumme und Gleichstände bestimmen. Diese Kandidatenmenge vor dem wörtlichen Filter fixieren.
2. Nur die Texte dieser Folgen wörtlich untersuchen. Vollständige Wörter nach NFC vergleichen, Groß-/Kleinschreibung ignorieren. Kein Stemming, keine Umlautgleichsetzung und keine Präfixerweiterung. Wortgrenzen, Bindestriche und Schrägstriche vor der Implementierung mit Beispielen festlegen.
3. Nur die exakten Stellen zählen und hervorheben. Innerhalb der fixierten Kandidaten darf nach der exakten Summe neu sortiert werden. Folgen ohne exakte Treffer können entfallen; keine Ersatzfolgen von Rang11 oder dahinter nachladen. Das Ergebnis darf weniger als zehn Folgen oder leer sein.
4. Wortlisten und Leser zeigen dieselben exakten Fundstellen. Abbruch-/Ladefehler bleiben Fehler; unbekannte Werte sind nicht null.

Vorgeschlagener Hilfetext:

> Exakt prüft nur die zehn Folgen mit den meisten Treffern der Standardsuche. Darin werden ausschließlich vollständige Wörter gezählt; Groß- und Kleinschreibung spielen keine Rolle. Weitere Folgen werden nicht geprüft.

Bewusste Grenze: Eine Folge außerhalb der Standard-Top10 kann mehr exakte Treffer besitzen und trotzdem fehlen. Dies wird vom Nutzer für die Vereinfachung akzeptiert und darf nicht als globale exakte Suche bezeichnet werden.

**Diagrammentscheidung noch als Vorschlag:** In Exakt die Auswahl Alle deaktivieren bzw. nur die geprüften Kandidaten anbieten. Nicht geprüfte Folgen dürfen nicht als Nulltreffer erscheinen. Standard und Erweitert behalten die globale Top10/Alle-Auswahl. Keine Mischung globaler Standardzahlen und eingeschränkter exakter Markierungen unter derselben Modusbezeichnung.

## Datenfluss und geringerer Traffic

Eine vollständige globale Surface-/Positionsdatei ist für diese Wortlisten und den eingeschränkten Exaktmodus **nicht mehr erforderlich**. Die frühere Empfehlung von rund 1,91 MB gzip für alle 106 Folgen ist damit für diesen Funktionsumfang entfallen.

- Standard ermittelt zuerst wie bisher globale Zahlen aus Rohpositionen. Erst beim Öffnen der Wortlisten die fehlenden Pagefind-Fragmente der Top10 laden. Diese enthalten die zu den Positionen gehörenden Schreibweisen. Bereits geladene Leserfragmente wiederverwenden; keine Texte der übrigen Folgen laden.
- Für Exakt die Texte der fixierten zehn Standardkandidaten laden. Ob der exakte Matcher direkt die Original-JSONs oder den geprüften Fragmenttext verwendet, bei der Implementierung anhand der Wortgrenzen/Originalzuordnung festlegen. Ein zusätzlicher eigener globaler Index ist dafür nicht nötig.
- Originaltranskripte für Leser bleiben im Standardmodus sichtbarkeitsabhängig. Eine geöffnete vollständige Wortübersicht braucht zwar die Fragmente aller zehn Kandidaten, aber nicht automatisch alle zugehörigen Original-JSONs.
- Nach einer neuen Suche nur die neue Kandidatenmenge berücksichtigen; passende Cacheeinträge verwenden. Die Grenze von zehn geladenen Kandidaten skaliert unabhängig von der gesamten Folgenzahl, die Dateigröße hängt aber von deren Länge ab.

Die bestehende lokale Messung ergab für **sämtliche Top10-Fragmente** je Anfrage etwa 0,48 bis 0,70 MB, statt 2,76 bis 5,20 MB für sämtliche Trefferfolgen. Native kalte Zählung zusätzlich etwa 0,20 bis 0,22 MB. Alle zehn Original-JSONs lagen je nach Anfrage bei 0,68 bis 0,99 MB unkomprimiert; diese sind nicht pauschal als Zusatzbedarf der informativen Liste zu addieren. Bereits geladene Dateien sparen weitere Abrufe. Das sind lokale Body-Größen aus dem bestehenden 106er-Bestand, keine Pages- oder Mobil-Latenzgarantie.

## Erweitert: Kombinationen und blinde Anfragen

Vorläufiger begrenzter Kandidatengenerator:

1. Ursprünglichen Begriff immer einschließen.
2. Genau eine Voranstellung aus einer kurzen Liste erzeugen, beispielsweise ab-, an-, auf-, aus-, ein-, her-, hin-, mit-, nach-, vor-, zu-, zurück-. Keine rekursiven Mehrfachkombinationen. Die Liste und der Umgang mit sehr kurzen Eingaben bleiben festzulegen.
3. Die Wörter einzeln suchen; eine gemeinsame Eingabe mehrerer Varianten wäre im nativen Pagefind-Pfad keine sichere Oder-Vereinigung. Die Ergebnisse der Varianten zu **einem ursprünglichen Stichwort** zusammenführen, nicht als neue farbige Stichwörter behandeln.
4. Pro Folge und ursprünglichem Stichwort die Vereinigung der akzeptierten Positionen zählen. Dieselbe Position darf bei mehreren Varianten nicht doppelt zählen. Danach die globalen erweiterten Top10 bestimmen; nur für diese zehn die informativen Wortlisten und Texte laden.

Blinde Kombinationen sind technisch möglich. **Ungeprüfte Treffer dürfen aber nicht einfach addiert werden:** Pagefind kann bei fehlenden Erweiterungen auf einen kürzeren geladenen Indexpräfix zurückfallen. Das ist ein expliziter Pfad im [gesperrten Suchcode](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web/src/search.rs).

Frische native Instanzen auf dem echten Index ergaben:

| Erzeugte Anfrage | Positionen | Beobachtete tatsächliche Formen |
| --- | ---: | --- |
| vorkommen |25| vorkommen (12), vorkommt (11), vorkomm (1), vorkommenden (1) |
| herkommen |23| herkommt (13), herkomme (5), herkommen (5) |
| hertisch |296| her (254), here (39) sowie drei weitere Formen; kein hertisch |
| vereimer |11| ver (10), vers (1); kein vereimer |
| vortisch |0| keine |

Die Unterschiede zeigen auch: Nicht jede erfundene Anfrage produziert einen Fallback. Die [Rohbeobachtungen](../research/evidence/prefix-fallback-2026-11-13.json) gelten für diesen Datenstand und Ablauf, nicht für jeden Suchindex.

Empfehlung für eine kontrollierte globale Erweiterung: Ein **kleines buildseitiges Verzeichnis vorhandener Wörter oder Suchstämme** zur Kandidatenprüfung erproben. Eingabe/erzeugte Anfrage und Korpusschlüssel müssen dieselbe geprüfte Stammbehandlung verwenden, damit bestehende Formen wie herkommt nicht durch einen zu wörtlichen Vortest verlorengehen. Nur Kandidaten mit passender tatsächlicher Form/Stammerweiterung an Pagefind geben. Diese Variante benötigt kein globales Positionsmapping; Größe, Stemmerkompatibilität und Browserkosten sind getrennt nachzuweisen. Die frühere reine Vokabularprobe von etwa 0,20 MB gzip ist lediglich eine Größenreferenz, noch kein fertiges passendes Verzeichnis.

Alternative ohne Verzeichnis: Die erzeugten Queries blind ausführen, danach jede getroffene Position auf die erwartete Formfamilie prüfen. Für globale korrekte Zahlen bräuchte dieser Nachfilter unter Umständen wieder alle passenden Fragmente. Nur die ausgewählten zehn Folgen nachzufiltern könnte zwar eine zusätzliche bewusst eingeschränkte Suchart sein, ist für Erweitert aber noch nicht vereinbart. Reines Ranking hilft nicht, weil Racoo die Positionen zählt.

Das Voranstellen bleibt eine technische Heuristik: kommen/bekommen, suchen/versuchen und hören/aufhören sind unterschiedliche Bedeutungen. kam sowie getrennte Verbteile oder mehrere Präfixe werden nicht automatisch vollständig erfasst. Da die neuen Wortlisten rein informativ sind, dienen sie nun der Erklärung und nicht der Korrektur per Ausschluss. Die konkrete Erweitert-Regel ist daher noch offen.

## Nächste Schritte

1. Die eingeschränkte Exaktsemantik und den vorgeschlagenen Umgang mit Alle als konkrete Abnahmefälle festhalten; Wortgrenzen definieren.
2. Vor einer Umsetzung von Erweitert die Kandidatenvalidierung samt kompatibler Stammbehandlung und kleinem Verzeichnis an echten Beispielen erproben. Blinde Anfragen dürfen keine fremden kürzeren Präfixe als Trefferfamilie einschleusen.
3. Danach UI, Top10-Detailaggregation und Exakt auf kleinen echten Pagefind-Fixtures implementieren. Zahlen, Listen, Diagramm, Markierungen und Navigation müssen denselben Modus zeigen. Keine Deaktivierungs-/Ausschlusslogik bauen.
4. Echtes 106er-Beispiel mit geöffneter Wortübersicht messen; Caches, neue Suchtexte, leere exakte Top10, beide Themen und Handybreiten prüfen. Keine gesamten Archivtexte oder globale Positionsdatei vorladen.

Diese Präzisierung ändert Dokumentation und Entscheidungsstand, noch keinen Anwendungscode. Keine neue Transkription, kein Backend und kein spaCy-Modell nötig.
