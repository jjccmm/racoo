# Kontrollierter Suchprüfkorpus

Diese 15 vollständig synthetischen Folgen ergänzen die zwei bisherigen Episoden in [der Korpusliste](../search-corpus.json). Die ursprünglichen Prüfdaten bleiben unverändert. Keine Audioadresse bezeichnet eine echte Aufnahme.

## Unabhängig ausgearbeitetes Beispiel

Die Texte legen die Suchabdeckung von „Laterne Katzen Fenster“ unabhängig von der App fest: `complete` enthält alle drei Wörter, die vier `pair`-Folgen enthalten Laterne und Katzen, die zehn `single`-Folgen jeweils nur eines davon. Mehrfachnennungen in den Paaren erhöhen die Abdeckung nicht. Die lange vollständige Folge muss trotz ihrer schwächeren Einzelränge zuerst stehen.

Die folgenden nullbasierten Einzelränge wurden am 17. Oktober 2026 direkt aus der öffentlichen API des real gebauten Pagefind-1.5.2-Indexes aufgenommen, bevor die erwartete App-Reihenfolge festgeschrieben wurde. Der Browsertest vergleicht die App mit der unten manuell ausgearbeiteten Reihenfolge; ein separater nativer API-Test hält diese Eingangsannahmen fest. Die Erwartung wird nicht durch einen zweiten Aufruf des App-Sortierers erzeugt.

| Episode (`coverage-…`) | Laterne | Katzen | Fenster | Abdeckung | Rangsumme |
| --- | ---: | ---: | ---: | ---: | ---: |
| complete | 9 | 9 | 0 | 3/3 | 18 |
| pair-a | 0 | 7 | — | 2/3 | 7 |
| pair-b | 7 | 0 | — | 2/3 | 7 |
| pair-c | 1 | 8 | — | 2/3 | 9 |
| pair-d | 8 | 1 | — | 2/3 | 9 |
| single-01 | 2 | — | — | 1/3 | 2 |
| single-02 | — | 2 | — | 1/3 | 2 |
| single-03 | 3 | — | — | 1/3 | 3 |
| single-04 | — | 3 | — | 1/3 | 3 |
| single-05 | 4 | — | — | 1/3 | 4 |
| single-06 | — | 4 | — | 1/3 | 4 |
| single-07 | 5 | — | — | 1/3 | 5 |
| single-08 | — | 5 | — | 1/3 | 5 |
| single-09 | 6 | — | — | 1/3 | 6 |
| single-10 | — | 6 | — | 1/3 | 6 |

`pair-b` ist mit `2023-12-31T23:30:00-13:00` tatsächlich eine halbe Stunde neuer als `pair-a` (`2024-01-01T12:00:00Z`); ein lexikographischer Datumsvergleich wäre falsch. Die neueren C/D-Folgen von 2030 dürfen wegen ihrer schlechteren Rangsumme nicht vor A/B rutschen. C (`2030-01-01T12:00:00Z`) und D (`2030-01-01T13:00:00+01:00`) haben denselben Veröffentlichungszeitpunkt; hier entscheidet die dauerhafte ID für C. Diese Entscheidung widerspricht der Reihenfolge D-vor-C, in der die zusammengeführten Rohlisten diese beiden Kandidaten zunächst liefern.

Die erwartete Gesamtreihenfolge lautet deshalb `complete, pair-b, pair-a, pair-c, pair-d, single-01, single-02, …, single-10`. Die ersten zehn Details enden bei `single-05`; die fünf übrigen folgen nur auf Anforderung. Die Browserprüfungen zählen echte Fragment- und Episodenabrufe und halten spätere Antworten gezielt zurück, um Fehler und überholte Suchläufe zu prüfen.

Alle Segmente beginnen bei 20 Sekunden. Im vollständigen Text liegen Signal, Laterne, Katzen und Fenster auf Wortposition 0, 1, 2 und 3. „Fuß Gruss“ findet außerdem die originalen Pluralformen „Füße und Grüße“, ohne einen Vergleich auf exakte Schreibweise. Dies belegt Wortformsuche und keine Grundformzählung.

## Suchzählungen

Der aktive Build verwendet diese 17 Transkripte direkt und benötigt keine Analyse-JSONs. Die öffentliche Suchschnittstelle behält die oben dokumentierte Abdeckungsreihenfolge. Das sichtbare Diagramm ordnet dagegen nach der Summe aller einzelnen Suchwort-Treffer; beide Verbraucher nutzen dieselben nativen Positionen. Der vollständige Rohzählungstest prüft alle 15 passenden Folgen vor dem ersten Detailabruf.
