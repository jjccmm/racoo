# Skalierung auf 600 Folgen mit GitHub Pages

Stand: 25. Oktober 2026. Einschätzung des bestehenden Codes und gemessener Pilotdateien; keine Architekturänderung oder Freigabe zur Archivtranskription. Die Grundentscheidung bleibt sinnvoll: lokal verarbeiten, statische Dateien veröffentlichen, im Browser suchen und auswerten. Ein echter 600-Folgen-Browser-/Deploymentnachweis steht aus.

## Hostinggrenzen und Traffic

GitHub dokumentiert maximal **1 GB veröffentlichte Seitengröße** und **100 GB monatlichen Datentransfer als weiche Grenze**. Die 1-GB-Angabe für das Quellrepository ist eine Empfehlung. Deployments haben ein Zehn-Minuten-Limit; die weiche Grenze von zehn Builds pro Stunde gilt nicht für einen eigenen Actions-Workflow. Das sind Hostinggrenzen, keine Zusage für schnelle Browserinteraktionen. [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

Ein GitHub-gehosteter Actions-Job darf grundsätzlich bis sechs Stunden laufen; Build und Pages-Deployment sind unterschiedliche Schritte. ASR und spaCy bleiben lokal bzw. bewusst vorgelagert und gehören nicht zur Besucheranfrage. [Actions limits](https://docs.github.com/en/actions/reference/limits), [Custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)

Rechenbeispiel ohne Bots: zehn Sitzungen pro Tag × 30 Tage × 10 MB je kompletter Sitzung sind **3 GB/Monat**. Selbst 50 MB je Sitzung wären 15 GB. Das Podcastaudio wird vom Podcastanbieter geliefert und ist kein Pages-Traffic des Projekts. Das ist eine Größenordnung, keine Nutzungsprognose.

## Messwerte und transparente Hochrechnungen

Die vorhandene echte Fünferauswahl enthält 49.665 gezählte Wörter und 5.427 verschiedene Grundformen. Alle MB-/KB-Werte hier sind dezimale Dateigrößen; gzip-Werte wären nur lokale Kompressionsmessungen und werden nicht als tatsächlicher GitHub-Transfer ausgegeben.

| Bestandteil | Gemessene fünf Folgen | Aussage für 600 Folgen |
|---|---:|---|
| Ausgelieferte Transkript-JSONs | 315.076 Byte | Rund 37,8 MB bei vergleichbarer durchschnittlicher Textlänge; lineare Hochrechnung. |
| Folgenkatalog für Statistik | 1.770 Byte | 177.218 Byte im synthetischen 600er-Test. |
| Alle Zählpakete | 438.666 Byte | 42.889.945 Byte im synthetischen 600er-Test. |
| Ein Zählpaket | Ø 6.854, maximal 9.593 Byte | Ø 670.155, maximal 966.629 Byte im synthetischen 600er-Test. |
| Vollständiges Vokabular | 422.627 Byte für 5.427 Grundformen | Wachstum nicht linear zur Folgenzahl. Bei 50.000/100.000/200.000 Grundformen etwa 3,9/7,8/15,6 MB mit gleicher mittlerer Eintragsgröße; Szenarien, keine Vorhersage. |
| Komplette Webseite | 2.797.724 Byte | Nicht einfach mit 120 multiplizieren: App-/Suchlaufzeitdateien sind weitgehend fix, Wörterbuch und Suchindex wachsen anders. |

Die Größenordnung der Texte und Zählungen lässt erheblichen Abstand zur 1-GB-Seitengrenze erwarten. Die genaue Gesamtgröße samt Pagefind und der wachsenden Wortliste muss der echte Archivbuild bestimmen.

## Was der synthetische 600er-Test beweist

Der unveränderte produktive Exporter `podcast_words.analysis.publish` wurde mit **600 unterschiedlichen Episoden-IDs** und 120 Wiederholungen der fünf vorhandenen Analysen aufgerufen. Er erzeugte 64 Zählpakete mit **1.017.120 Wort/Folgen-Paaren** und knapp sechs Millionen gezählten Wörtern. Der Statistikexport dauerte lokal **8,54 Sekunden**. Die temporären Exportdateien wurden anschließend gelöscht. [Maschinenlesbare Messung](evidence/statistics-scale-600.json)

Das ist ein Test des Statistikformats und Exporters. Er enthält keine 600 unabhängigen Texte, keinen neuen ASR-/spaCy-Lauf, keinen 600er-Pagefind-Index und keinen gemessenen 600er-Browser. Die Wiederholungen halten das Vokabular künstlich klein und komprimieren besonders gut; ihre gzip-Größe ist daher keine Transferprognose.

## Browserverhalten des aktuellen Codes

- [Stats.tsx](../../web/src/Stats.tsx) lädt Katalog und das **gesamte Vokabular**, sobald die Statistik geöffnet wird. Zehn sichtbare Vorschläge begrenzen nicht die geladene Wortliste.
- [Frequency.tsx](../../web/src/Frequency.tsx) durchsucht diese Liste bei jeder Eingabe mit `filter(...).slice(0,10)`. Bei Auswahl lädt und parst es das zuständige vollständige Zählpaket. Für unterschiedliche Wörter desselben Pakets gibt es keinen eigenen Cache bereits geparster Pakete; der HTTP-Cache kann helfen. Die eigentlichen Diagrammwerte sind mit höchstens 5 × 600 Punkten überschaubar.
- [search.ts](../../web/src/search.ts) erzeugt für jede Suche und Nachladeseite einen neuen Worker. Das isoliert bewusst Fehlerzustände, verwirft aber die bereits initialisierte Pagefind-Instanz. Die vorhandene gedrosselte Fünfermessung lag bereits bei etwa 3,0 s erster Suche und 1,9 s wiederholter Suche; 600 Folgen sind kein automatischer Geschwindigkeitsnachweis.
- [search-worker.ts](../../web/src/search-worker.ts) bestimmt die globale Rangfolge aus Kandidaten und lädt erst für höchstens zehn angezeigte Treffer Pagefind-Fragmente und vollständige Folgen-JSONs. Bei bisheriger mittlerer Textlänge sind zehn Folgen-JSONs rund 630 KB, unabhängig davon, ob der Bestand 60 oder 600 Folgen umfasst. Suchindexteile und Fragmente kommen hinzu. Häufige Wörter und mehrere Begriffe benötigen trotzdem einen Messfall mit dem großen Index.
- Die beiden Folgenübersichten in [Stats.tsx](../../web/src/Stats.tsx) und [VocabularySummary.tsx](../../web/src/VocabularySummary.tsx) rendern derzeit alle Folgen. 600 Zeilen sind vor allem ein Bedienproblem; einfache Seitennavigation oder Filter reichen zunächst aus.

Pagefind liefert Treffer-IDs zunächst getrennt von ihren asynchron nachzuladenden Details. Dieses vorhandene Ladeprinzip ist für den größeren Bestand passend; eine Produktangabe zu kurzen Webseiten wäre kein Leistungsnachweis für unsere langen Transkripte und den eigenen Wrapper. [Pagefind Search API](https://pagefind.app/docs/api/), [Pagefind](https://pagefind.app/)

## Kleine sinnvolle Anpassungen vor dem Archivbetrieb

1. **Zählpaare kompakter veröffentlichen.** Die dauerhaften Episoden-IDs bleiben im Originaldatensatz und Katalog. Innerhalb eines veröffentlichten Statistikstands kann ein Paar stattdessen einen kurzen Folgenindex enthalten, etwa `[123,12]`. Für exakt dieselbe synthetische Paarverteilung ergibt das 7.027.568 statt 41.796.120 Byte für die Paarwerte, also **83,2 % weniger Paarbytes**. Mit unveränderten Wortschlüsseln und Paketköpfen wären alle Zählpakete etwa **8,1 statt 42,9 MB** groß. Das ist eine Berechnung, kein implementierter Formatwechsel. Mit dieser Änderung könnten zunächst sogar die 64 Pakete bleiben.
2. **Suchinstanz und geladene Zählpakete wiederverwenden.** Einen Worker je Datenstand nutzen, bei Fehlern bewusst erneuern und die bestehenden Abbruch-/Wiederholungsprüfungen erhalten. Zählpakete nach Dateipfad/Datenstand cachen. Die konkrete Verbesserung muss gemessen werden; kein Versprechen einer bestimmten Latenz.
3. **Vokabular und lange Übersichten sparsam halten.** Wiederholte Feldnamen/Pfade im veröffentlichten Wortverzeichnis verkürzen; bei tatsächlich großer Datei gezielt aufteilen. Folgenübersichten seitenweise zeigen. Eine zusätzliche API folgt aus diesen Aufgaben nicht.
4. **Echten 600er-Abnahmelauf durchführen.** Ganze Buildgröße, Wortlistengröße, größte Zählpakete, kalte/warme Suchlatenz und über alle Worker gemessene Transfers prüfen. Seltene und häufige Wörter, drei Begriffe, Nulltreffer, weitere Trefferseiten, fünf Statistikserien, Mobilansicht und Projektpfad abdecken. Präfix-/Wortformtreffer auch auf ihre praktische Suchqualität prüfen.

Mehr Zählpakete (beispielsweise 256) bleiben eine einfache Alternative, falls die tatsächliche Paketgröße das gewählte Ladebudget überschreitet. Das sollte von realen Bytes abhängen; 64 ist ein Startwert und kein fachlich notwendiger Grenzwert.

## Entscheidungsvorschlag

Für 600 Folgen und ungefähr zehn tägliche Besucher **GitHub Pages, Pagefind und vorberechnete JSON-Dateien beibehalten**. Der größere Bestand erfordert voraussichtlich einige kleine Verbesserungen der Auslieferung und Browserarbeit. Ein neues Backend oder eine laufende Datenbank ist aus den gemessenen Größen nicht begründet. Die lokale Fünferabnahme und der synthetische Statistiktest ersetzen keinen echten 600-Folgen-Leistungsnachweis.
