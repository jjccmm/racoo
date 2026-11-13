# Präfix plus erste drei Buchstaben: Prüfung am echten Bestand

Stand: 13. November 2026. Nur Untersuchung, keine Änderung der Anwendung. Der Nutzer meint mit „erste drei Wörter“ erkennbar die ersten drei Buchstaben. [Messdaten](evidence/prefix-three-letters-2026-11-13.json), [aktueller Plan](../planning/search-modes.md).

## Methode

18 Eingaben × fünf Voranstellungen = 90 native Abfragen, echter 106er-Index, Pagefind 1.5.2. Eingaben: kommen, gehen, stehen, stellen, stehlen, laufen, lesen, suchen, schlafen, spielen, sprechen, nehmen, fangen, hören, Tisch, Wort, Eimer, Ei. Präfixe: her, vor, ver, an, auf. Pro Anfrage eine frische Browserumgebung und Engineinstanz, damit keine vorherige Testquery den nativen Chunkbestand erwärmt.

Die Rohpositionen wurden für das Experiment **offline** anhand der bereits lokal vorhandenen vollständigen Pagefind-Fragmente ihren Oberflächenformen zugeordnet. Der Browser hat dadurch nicht selbst eine neue Wortformen-API erhalten. NFC und deutsche Kleinschreibung; äußere Satzzeichen entfernen. Geprüft wurde die zusammenhängende Zeichenfolge `prefix + first3(input)` per `includes`, genau wie vorgeschlagen. Für kurze Eingaben wurden die vorhandenen Buchstaben verwendet. Unicode-Codepoints statt UTF-16-Codeunits abschneiden. Zusätzlich wurden `startsWith` und die Umlautfaltung ä/ö/ü → a/o/u mit drei beziehungsweise vier Anfangsbuchstaben verglichen.

Das ist kein sprachlich annotierter Goldbestand. Beispiele wurden inhaltlich beurteilt; aus den Gesamtmengen wird keine Trefferpräzision abgeleitet. Summen über Anfragen zählen dieselbe Textposition gegebenenfalls mehrfach. Im Evidenz-JSON sind große zurückgewiesene/corpusweite Formlisten auf zwölf Einträge gekürzt; ihre Mengen und Summen bleiben gespeichert. Die akzeptierten Formlisten sind vollständig.

## Ergebnis

Die Regel ist ein wirksamer Schutz gegen kurze Fallbacks, aber kein verlässlicher Nachweis einer passenden Wortfamilie. Von 40.912 Query-/Positionspaaren bleiben 3.487. 26 nichtleere Anfragen werden vollständig zurückgewiesen. Das sind Filterwirkungen, keine Genauigkeitswerte.

| Anfrage | Prüffolge | Beobachtung |
| --- | --- | --- |
| hertisch | hertis | Alle 296 fremden Treffer entfernt |
| herkommen | herkom | Alle 23 Positionen behalten, darunter herkommt (13) |
| vorkommen | vorkom | Alle 25 behalten, darunter vorkommt (11) |
| verstehlen | verste | Alle 411 Positionen behalten, darunter verstehen (165) und verstehe (196); andere Wortfamilie |
| aufgehen | aufgeh | Alle 73 behalten, darunter aufgehört (37), aufgehalten (7), aufgehoben (7) |
| verlaufen | verlau | verläuft (2) wird entfernt, obwohl passende Form |
| herlaufen | herlau | herläuft (2) wird entfernt; damit kein Treffer mehr |
| anfangen | anfan | anfängt (58) und anfängst (19) werden entfernt |
| anschlafen | ansch | Die isolierte Form ansch wird behalten; zu kurzer Schutz bei gemeinsamem sch-Anfang |
| verei aus Ei | verei | Unter anderem Verein (14) bleibt übrig |

Die kurzen Fallbacks sind nicht die einzigen falschen Resultate. Native Stamm-/Präfixsuche kann bereits ähnliche längere Wortanfänge liefern, die den Drei-Buchstaben-Test passieren. Eine rückwärts verkürzte Anfrage wie verstehlen → versteh ist ebenfalls länger als diese Mindestschranke. Der entsprechende kürzere-Präfix-Pfad steht im [versionierten Suchcode](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web/src/search.rs), Funktion find_word_extensions.

## Umlautfaltung und vier Buchstaben

Eine zusätzliche Umlautfaltung rettet 112 Query-/Positionspaare, darunter herläuft (2), verläuft (2), anfängt (58), anfängst (19) und auffängt (1). Sie rettet aber ebenso weitere technisch ähnliche Formen wie vorläufige (1). Die gefaltete Dreierregel akzeptiert insgesamt 3.599, die gefaltete Viererregel 3.346 Paare. Auch vier Buchstaben lösen die Grundprobleme nicht: stehlen und stehen teilen steh; gehen und gehört teilen geh, während zu lange feste Ausschnitte kurze Flexionsformen ausschließen können.

`startsWith` statt `includes` war in dieser Probe keine grundsätzliche Qualitätsverbesserung: Zusätzliche `includes`-Treffer waren unter anderem App-Hersteller, Massagesessel-Hersteller, Papp-Aufsteller und Flirt-Versuch. Ob solche Zusammensetzungen mitgezählt werden sollen, ist eine Wortgrenzenentscheidung. Die eigentlichen Gegenbeispiele verstehlen/aufgehen beginnen bereits mit der Prüffolge und bleiben bei beiden Regeln erhalten.

Die Mindestlänge des Ausgangsworts sollte für eine Erweiterung mindestens drei Buchstaben sein; bei Ei ist keine Dreierabsicherung möglich. Das ist ein Umsetzungsvorschlag, keine aktive Anfrageregel.

## Datenbedarf des Nachfilters

Auch dieser einfachere Zeichenvergleich braucht die tatsächlich getroffene Schreibweise jeder Position. Die öffentliche native Rohantwort liefert sie nicht. Werden nur die Top10 nachgefiltert, ist das billig, aber die globalen Erweitert-Zahlen und Auswahl sind damit nicht nachträglich korrekt bereinigt. Falsche Kandidaten können die führenden Plätze schon vor dem Filter belegen.

Für einen global angewendeten Filter sind weiterhin entweder die vollständigen Fragmente aller getroffenen Kandidaten oder eine zusätzliche kompakte Zuordnung notwendig. Viele blinde Voranstellungen können gerade durch Fallbacks fast alle Folgen treffen. Bereits eine eigene der geprüften Anfragen wie auflesen lieferte 6.703 Positionen, die der Dreiertest vollständig zurückwies; der Filter kann die vorher nötigen Abfragen/Datenabrufe nicht ungeschehen machen. Offlinezugriff des Experiments ist keine Aussage, dass diese Schreibweisen im Browser kostenfrei vorliegen.

Die vereinbarten informativen Top10-Listen und Exakt innerhalb der Standard-Top10 brauchen diese globale Zusatzzuordnung weiterhin nicht. Das gilt unabhängig vom Ergebnis dieser Erweitert-Untersuchung.

## Bewertung

Als zusätzliche technische Mindestprüfung ist die Idee brauchbar, besonders mit Umlautfaltung und einer kurzen Präfixliste. Als alleinige Absicherung reicht sie nicht, wenn neue Familien wie stehlen → verstehen vermieden und passende Umlautformen erhalten bleiben sollen. Erweitert kann bewusst eine solche grobe Heuristik anbieten; seine Erklärung muss dann diese Grenze benennen. Ein bloßes Erhöhen von drei auf vier Buchstaben ist keine allgemeine Lösung.

Für einen kontrollierten globalen Modus bleibt die bevorzugte offene Variante eine Prüfung anhand tatsächlicher Korpusformen beziehungsweise kompatibler Suchstämme mit ausreichend langer Basis, bevor unpassende Queries als Trefferquelle verwendet werden. Das ist weiterhin eine technische Näherung, keine vollständige Morphologie. Ein weiteres globales Filterverfahren oder eine bewusste Top10-Beschränkung von Erweitert wurde mit diesem Test nicht entschieden.
