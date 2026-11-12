# Strenge und erweiterte Wortsuche

Stand: 12. November 2026. **Recherche und Planungsvorschlag; keine Änderung des aktiven Suchvertrags.** Untersucht wurden die gesperrte Pagefind-Version 1.5.2, ihr veröffentlichter Quelltext und der vorhandene 106-Folgen-Index. Anwendung, Transkripte, Produktionsindex und Abhängigkeiten wurden nicht geändert. Ausgangspunkte: [Suchvertrag](../search.md), [bisherige Versionsuntersuchung](pagefind-counting-2026-11-10.md), [Projektplan](../../PLAN.md).

## Ergebnis für die Entscheidung

Zwei verständliche Modi lassen sich vollständig statisch und ohne spaCy umsetzen:

- **Ganzes Wort** als Vorgabe: normalisierte Schreibweise eines vollständigen Wortes. `Ei` trifft `Ei`, aber weder `eine` noch `eigentlich`, `einem` oder `einfach`. `kommen` trifft zunächst nur `kommen`.
- **Wortteil** als ausdrückliche Erweiterung: die normalisierte Eingabe muss innerhalb eines Wortes stehen. `kommen` trifft auch `vorkommen`, `ankommen` und `gekommen`; `kommt`, `vorkommt` und `kam` enthalten diese Zeichenfolge nicht. `Ei` würde als Wortteil auch `einfach` treffen. Für sehr kurze Eingaben empfiehlt sich ein erklärter Mindestumfang von drei Zeichen nur für diesen Modus; die genaue Schwelle ist eine Produktentscheidung.

Das sind Vorschläge, keine bereits zugesagten Regeln. „Wortformen“ und „gleicher Wortstamm“ sind zusätzliche, andere Modi. Wer `kommen` auch in `kommt`, `kam` und `vorkommt` finden möchte, verlangt mehr als reine Teilwortsuche. Die folgenden Befunde sprechen gegen einen Modusschalter, der lediglich Pagefind-Rankingparameter verändert. Eine wichtige Folge der Zeichenregel: `kommen` steht auch in `Kommentar` und `kommentieren`. Falls genau solche Treffer unerwünscht sind, ist „Wortende“ (`endsWith`) enger: Es findet `vorkommen` und `gekommen`, außerdem aber `willkommen`, `vollkommen` und `Abkommen`. Auch das ist keine sprachliche Familienerkennung.

**Bevorzugte technische Variante:** Beim statischen Build ein vollständiges Wortverzeichnis mit kompakten Zählungen je Folge erzeugen. Im Worker passende Schreibweisen auswählen und deren Zählungen addieren. Nur die ausgewählten Ergebnisfolgen laden und denselben Wortvergleich auf deren Originaltext anwenden, um Markierungen und Minimap-Bereiche zu bestimmen. Gespeicherte Positionslisten sind dafür zunächst nicht erforderlich. Diese Variante braucht eine eigene, ausdrücklich definierte Wortzählung, aber kein Sprachmodell und keinen Server.

## Warum `Ei` heute überraschend reagiert

Der native 1.5.2-Suchweg bildet zuerst Stämme und erweitert sie um passende Wortanfänge. Das ist keine vollständige Suche nach beliebigen Wortteilen. Die Erweiterung durchsucht zudem nur die bereits geladenen Wörter. [Versionierter Suchquelltext](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web/src/search.rs)

Der Chunk-Lader prüft Eingabe und Stamm: Liegt ein Begriff innerhalb eines gespeicherten Chunk-Bereichs, lädt er diese „strict“-Chunks. Erst wenn kein solcher Bereich passt, verwendet er die großzügigere Präfixüberlappung. Bereits geladene Chunks bleiben im Suchindex. Daraus folgt: Ein vorhandenes kurzes Wort kann weniger Präfixvarianten laden als eine spätere Suche; weitere geladene Chunks können dessen Treffer nachträglich erweitern. Das ist eine Folgerung aus dem Lader und wurde hier am echten Index bestätigt. [Chunk-Anforderung und Indexspeicher in 1.5.2](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web/src/lib.rs), [JavaScript-Laden und Chunk-Cache](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web_js/lib/coupled_search.ts)

Read-only-Browserproben auf Index `f376233a66369947c391ece1ddb3fd27ae51344ffdf4b784bef6ef7024c02d3d` ergaben:

| Ablauf in einer frischen Suchinstanz | Unterschiedliche native Positionen über alle Folgen |
| --- | ---: |
| `Ei` | 33.329 |
| danach `einfach` | 8.497 |
| danach nochmals `Ei`, direkt in Pagefind | 45.171 |
| frischer Anwendungsadapter: `Ei`, `einfach`, nochmals `Ei` | 33.329, 8.497, 33.329 |
| frischer Anwendungsadapter: zuerst `einfach`, danach `Ei` | 8.497, 45.171 |

Der Anwendungscache bewahrt das zuerst errechnete Begriffsergebnis; deshalb übernimmt die unmittelbare Wiederholung dort nicht die native Erweiterung. Die Reihenfolge beim ersten Auftreten bleibt relevant. Die zunächst beobachteten `eine`/`eigentlich`/`einem`, aber fehlenden `einfach` sind folglich keine sinnvolle sprachliche Wortfamilie. Die vorläufigen Rohproben liegen lokal unter `.cache/search-options-native-real.json`, `.cache/search-options-warm-native.json` und `.cache/search-options-app-order.json`; sie sind keine versionierten Vertragsdateien.

Eine zusätzliche, vollständig im Speicher erzeugte deutsche 1.5.2-Fixture hatte genau einen Index-Chunk und diesen Text:

```text
Ei Ei eine eigentlich einem einfach kommen kommen vorkommen vorkommt gekommen kommt Kommentar Komma kommunizieren.
```

Darin liefert `Ei` sämtliche ersten sechs Positionen, einschließlich `einfach`. `kommen` liefert die beiden `kommen`, außerdem `kommt`, `Kommentar`, `Komma` und `kommunizieren`; `vorkommen`, `vorkommt` und `gekommen` fehlen. Eine zweite Fixture prüfte zusätzlich `kam` als einzelnes Dokument. Die reale Suche `kommen` lieferte 3.075 Positionen einschließlich verschiedener `komm…`-Erweiterungen, aber kein `vorkommen`; die eigene Suche `vorkommen` fand 25 Positionen in 22 Folgen. Weitere Chunk-Erwärmung änderte diese konkrete `kommen`-Zahl nicht. Daraus folgt keine Garantie für alle Begriffe oder Datenstände.

## Exakt, Stamm, Präfix und Wortteil getrennt halten

| Vergleichsregel | Beispiel | Grenze |
| --- | --- | --- |
| Ganzes Wort | `Ei` = `Ei` nach festgelegter Normalisierung | Keine automatische Flexion oder Kompositumsuche |
| Gleicher Stamm | `stem(wort) = stem(eingabe)` | Technische Näherung, kein Wörterbuchlemma |
| Präfix der Schreibweise | `wort.startsWith(eingabe)` | `Ei` findet `einfach`; `kommen` findet nicht `vorkommen` |
| Wortende der Schreibweise | `wort.endsWith(eingabe)` | `kommen` findet `vorkommen`, `gekommen`, `willkommen`; kein `Kommentar` |
| Teil der Schreibweise | `wort.includes(eingabe)` | `kommen` findet `vorkommen`, `gekommen` und `Kommentar`, aber nicht `kommt` oder `kam` |
| Sprachliche Formen/Familien | etwa `kommen` / `kam` / `vorkommt` | Braucht eine gesonderte linguistische Regel oder Ressource |

Pagefind verwendet generierte Snowball-Algorithmen. Snowball beschreibt beim Deutschen ausdrücklich Grenzen bei Komposita, trennbaren Verbpräfixen und `ge` sowie mögliche Fehlzusammenführungen. Auch Endungen wie `-t` werden nicht allgemein entfernt. Aktuelle Snowball-Dokumentation erklärt die Art der Näherung; sie ersetzt keinen Nachweis der konkret eingebauten Pagefind-Fassung. [Pagefind-Stemmer 1.5.2](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_stem/src/lib.rs), [eingebauter deutscher Algorithmus](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_stem/src/snowball/algorithms/german.rs), [Snowball-Design und Versionsgeschichte](https://snowballstem.org/algorithms/german/stemmer.html)

Eine zweite native 1.5.2-Fixture bestand aus neun getrennten Einwort-Dokumenten: `kommen`, `kommt`, `vorkommen`, `vorkommt`, `gekommen`, `kam`, `Kommentar`, `Komma`, `kommunizieren`. Unquoted `kommen` fand die Dokumente `kommen`, `kommt`, `Kommentar`, `Komma`, `kommunizieren`. Quoted `"kommen"` fand ausschließlich `kommen`, quoted `"kommt"` ausschließlich `kommt`. Im gesperrten Enginepfad sind `kommen` und `kommt` folglich verschiedene Stammschlüssel; ihr gemeinsames unquoted Ergebnis darf nicht als Beweis einer Stammgleichheit gelten.

## Was Pagefind-Konfiguration und Anführungszeichen leisten

Die öffentlichen Browseroptionen und Indexierungsoptionen von 1.5.2 enthalten keinen Schalter, der deutsche Stammverarbeitung und Präfixerweiterung unabhängig pro Suche abschaltet. `exactDiacritics` regelt diakritische Varianten, keine vollständigen Wörter. Eine andere erzwungene Indexsprache wäre keine belastbare Umsetzung zweier deutscher Suchmodi. [Browser-API 1.5.2](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web_js/types/index.d.ts), [Node-Indexierungsoptionen 1.5.2](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/wrappers/node/types/index.d.ts)

`termSimilarity` verändert den Einfluss des Längenunterschieds auf den Score. Es entfernt keine akzeptierten Trefferpositionen. Weil Racoo die Folgen bereits selbst nach unabhängigen Begriffszählungen sortiert, löst ein geändertes Engine-Ranking weder überbreite Zählungen noch fehlendes `vorkommen`. [Ranking-Erklärung des Herstellers](https://pagefind.app/docs/ranking/)

Eine vollständig mit Anführungszeichen umschlossene Eingabe wählt einen anderen Pfad. Auch dieser stemmt; bei einem gefundenen zusammenhängenden Texttreffer beendet er die Suche für diese Seite. Deshalb sind Quotes weder eine Garantie der Originalschreibweise noch eine Quelle vollständiger Vorkommenszahlen. In der Ein-Chunk-Fixture liefern `"Ei"` nur Position `[0]` statt `[0,1]` und `"kommen"` nur `[6]` statt `[6,7]`. Am echten Index lieferte `"kommen"` 106 Positionen in 106 Folgen. [Pfadauswahl in JavaScript](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web_js/lib/coupled_search.ts), [Stemming und Abbruch in der exakten Suche](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web/src/search.rs)

Native Ergebnislisten, Rohpositionen, gewichtete Positionen und Ranking-Scores sind verschiedene Größen. Die Anwendung muss weiterhin alle erforderlichen Folgen vor der Top-10-Auswahl zählen. Ein nachträglicher Textfilter kann falsche Kandidaten entfernen, aber keine nicht gelieferten Folgen oder Positionen hinzufügen. Insbesondere macht ein Filter auf dem Ergebnis von `kommen` daraus keine vollständige Teilwortsuche nach `vorkommen`.

## Architekturvarianten und Kosten

Die folgenden Bewertungen sind Architekturvorschläge aus den geprüften Grenzen, keine Herstellerzusagen.

| Variante | Vollständigkeit und Kosten | Bewertung |
| --- | --- | --- |
| Native Pagefind-Ergebnisse nach Originalwort filtern | Wenig neuer Suchcode; braucht zur genauen Prüfung zusätzliche Wort-/Originaldaten. Kein Nachweis allgemeiner Kandidatenvollständigkeit; fehlende Wortteile und Chunk-Präfixe bleiben fehlend. | Als allgemeiner Zweimodus-Vertrag ungeeignet. |
| Vollständiges Wortverzeichnis + Zählpaare je Folge; Originaltext nur für sichtbare Ergebnisse prüfen | Eigener kleiner Build-/Worker-Vertrag. Exakte Suche per Wörterbuch; Wortteilvergleich über das vollständige Vokabular. Keine Positionsdaten für das gesamte Archiv erforderlich. Top-10-Texte bleiben verzögert ladbar. | Bevorzugte kompakte Variante. |
| Wortverzeichnis + Vorkommenspositionen | Gleiche vollständige Wortauswahl, unmittelbare globale Fundstellen. Mehr statische Daten, Positionskodierung und Abgleichlogik. | Erst bei gemessenem Bedarf an globalen Positionen. |
| Alle Originaltranskripte bei jeder Suche prüfen | Einfache Referenzimplementierung, vollständiger Vergleich. Kalte Suche lädt und verarbeitet das gesamte Archiv. | Als lokale Prüfreferenz sinnvoll; Produktionskosten passen schlecht zum bestehenden Lazy-Loading-Ziel. |
| Vokabular passend expandieren, jeden Trefferbegriff nativ suchen, Kandidatentexte neu prüfen | Kann bei bewiesener Wortabdeckung vollständig werden; ein kurzer Teil kann sehr viele native Anfragen und Originalabrufe auslösen. Kombination zweier Tokenisierungen und Suchcaches bleibt aufwendig. | Meist komplexer als direkte Zählpaare. |
| Pagefind forken oder Suchbibliothek austauschen | Eigene Upgrade-/WASM-Pflege beziehungsweise neue Indexintegration. Eine andere Bibliothek allein liefert noch keinen Racoo-Vertrag für globale Zählungen und Originalmarkierungen. | Für zwei lexikalische Modi zunächst unnötiger Umfang. |

Eine alternative Browserbibliothek kann präzisere Stellschrauben bieten: MiniSearch 7.2.0 dokumentiert getrennte `prefix`-/`fuzzy`-Optionen und anpassbare Tokenisierung/Termverarbeitung. Sie ist jedoch eine In-Memory-Suche, deren Kosten und Ergebnisdaten eigens gegen diesen Korpus geprüft werden müssten. Eine echte Teilwortsuche und gemeinsame Vorkommenszählung entstehen dadurch nicht automatisch. [Herstellerdokumentation](https://lucaong.github.io/minisearch/), [versionierte Optionen und Ergebnisstruktur](https://github.com/lucaong/minisearch/blob/v7.2.0/src/MiniSearch.ts)

Für die bevorzugte Variante:

1. Einen gemeinsamen, versionierten Normalisierer und Wortzerleger für Build und Browser festlegen. NFC und Kleinschreibung können erhalten bleiben; Umlaute, `ß`, Bindestriche, Schrägstriche, Ziffern und Satzzeichen brauchen explizite Beispiele. Keine Akzent-/Stammgleichheit stillschweigend hinzufügen. Bei `Euro-Münze`, `Wort/Teil` oder mehreren Wortteilen innerhalb eines bisherigen Pagefind-Whitespace-Tokens können sich die Zähleinheiten ändern.
2. Pro Podcast alle normalisierten Wortschreibweisen speichern; je Wort nur nichtleere Paare `[Folgenindex, Anzahl]`. An den Publikationsstand binden, bei Bedarf sharden und komprimieren. Wortteilvergleich kostet zunächst einen Durchlauf über die unterschiedlichen Wörter, keinen Download aller Originaltexte. Erst messen, bevor zusätzliche N-Gramm-Indizes gebaut werden.
3. Pro Suchbegriff die erlaubten Wörter bestimmen und deren Zählpaare addieren; alle veröffentlichten Folgen einschließlich Nullen ergänzen, dann die vorhandene Diagrammsortierung anwenden. Überlappende Suchbegriffe weiterhin getrennt zählen und sichtbare identische Fundstellen zusammenführen.
4. Für geöffnete Top-Folgen die vorhandenen Original-JSONs laden und mit identischem Matcher UTF-16-Spannen erzeugen. Globale Zahlen und lokale Markierungen müssen pro Folge/Begriff übereinstimmen. Vorhandene Segmentzeiten und Audiohinweise erhalten; keine Wortzeitstempel nötig.
5. Suchmodus in Link und Cacheidentität aufnehmen. Ein Moduswechsel muss Zahlen, Reihenfolge und Markierungen gemeinsam aktualisieren. Ladefehler bleiben Fehler; Abbruch und veraltete Antworten bleiben abgesichert.

Eine lokale Größenprobe des vorhandenen 106-Folgen-Bestands fand mit dem aktuellen Suchwortmuster als vorläufigem Unicode-Wortzerleger 55.060 Wortformen und 236.490 nichtleere Wort/Folge-Paare. Die reine Wortliste umfasste 694.646 Byte unkomprimiert beziehungsweise 198.061 Byte gzip, flache Zählpaare 1.302.391 beziehungsweise 350.286 Byte. Zusammen sind das rund 0,55 MB gzip, noch ohne endgültiges Veröffentlichungsformat, Metadaten und Browserkosten. Dies ist eine Machbarkeitsmessung mit vorläufiger Wortregel, keine veröffentlichte Datei oder Netzwerkgarantie für 600 Folgen.

Dieselbe vorläufige Referenzzählung fand `kommen` als ganzes Wort 718-mal, als Wortende 2.342-mal und als beliebigen Wortteil 2.605-mal. Im letzten Fall gehören `Kommentar` (57) und `Kommentare` (83) ausdrücklich dazu; bei der Wortendregel unter anderem `willkommen` (200) und `vollkommen` (24). `Ei` als ganzes Wort kam 12-mal vor. Solche Unterschiede sind Produktsemantik und müssen vor Optimierungen sichtbar entschieden werden. Die Wortend- und Wortteilmengen enthalten 121 beziehungsweise 169 verschiedene Schreibweisen. Die Größen-/Vergleichsprobe liegt vorläufig lokal unter `.cache/search-options-lexicon-size.json`; sie ist nicht der Sollvertrag für einen noch unbestätigten Tokenisierer.
Die Größenordnung hängt von verschiedenen Wörtern und nichtleeren Wort/Folge-Paaren ab, nicht nur von der Folgenzahl. Vor einer Umsetzung sind kalte/warme Bytes, Wortteil-Scanzeit und Browser-Arbeitsspeicher zu messen. Positionspostings, Stammindizes oder vorab gespeicherte Teilwörter erhöhen den Aufwand; sie sind keine Voraussetzung für den ersten exakten/Wortteil-Vertrag.

## Neuere Version und offene Nachweise

Die öffentliche Pagefind-Dokumentation zeigt aktuell 1.6.0; das Projekt bleibt auf 1.5.2. Die offizielle 1.6.0-Veröffentlichung nennt unter anderem schnellere breite Suchen und eine Korrektur von Phrasen über diakritische Varianten. Die geprüfte 1.6.0-API bietet weiterhin keinen unabhängigen Stem-/Präfix-/Substring-Schalter. Im 1.6.0-Quelltext bestehen außerdem Stammverarbeitung, Präfixsuche über geladene Wörter und der Abbruch nach dem ersten Phrasentreffer weiter. Diese Versionsprüfung ist eine Quelltextprüfung, kein lokaler 1.6.0-Lauf. Ein Upgrade allein belegt keine Lösung dieser Anforderungen. [Release 1.6.0 vom 1. November 2026](https://github.com/Pagefind/pagefind/releases/tag/v1.6.0), [1.6.0-API](https://github.com/Pagefind/pagefind/blob/860a4ea87e7a52379520f9eaefd0f8a6b23eb462/pagefind_web_js/types/index.d.ts), [1.6.0-Suche](https://github.com/Pagefind/pagefind/blob/860a4ea87e7a52379520f9eaefd0f8a6b23eb462/pagefind_web/src/search.rs), [1.6.0-Chunk-Anforderung](https://github.com/Pagefind/pagefind/blob/860a4ea87e7a52379520f9eaefd0f8a6b23eb462/pagefind_web/src/lib.rs)

Vor Implementierung bleiben die Wortgrenzen, Wortteil-Mindestlänge und gewünschte zusätzliche Flexionsabdeckung zu entscheiden. Abnahmefälle sollten mindestens `Ei`/`eine`/`eigentlich`/`einem`/`einfach`, `kommen`/`kommt`/`kam`/`vorkommen`/`vorkommt`/`gekommen`, Umlaute, `ß`, Interpunktion und Komposita enthalten. Zahlen müssen über alle Folgen stimmen, unabhängig von Suchreihenfolge und Cachezustand. Die unveränderte Pagefind-Suche kann als historischer Vergleich dienen, aber nicht als Sollmenge der neuen Modi.

Tippfehler- und Bedeutungssuche später getrennt beurteilen: editierdistanzbasierte Erweiterung betrifft Wörter, semantische Suche betrifft Bedeutung und ähnliche Passagen. Beides benötigt eigene Regeln für Treffer und Zählungen. Keine dieser Fähigkeiten ist durch die oben geprüfte native 1.5.2-Suche nachgewiesen. Für die erste Entscheidung sind exakte Wörter und ausdrücklich gewählte Wortteile ausreichend.


Die maßgeblichen Rohbeobachtungen und Größenwerte sind zusätzlich als [versionierte kompakte Evidenz](evidence/search-options-2026-11-12.json) gespeichert. Der gesonderte [Produkt-/Umsetzungsplan](../planning/search-modes.md) vergleicht vier rein lexikalische Modi sowie spätere sprachliche Erweiterungen; er ist weiterhin unbestätigt.
