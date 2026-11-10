# Freitextsuche mit Pagefind und helle Fundstellen-Minimap

Stand: 10. November 2026. **Vom Nutzer am 10. November 2026 zur Umsetzung bestätigt.** Geprüfter Ausgangspunkt: Commit `5172e99`, 106 veröffentlichte Folgen, Pagefind 1.5.2. Dieser Vorschlag ersetzt den bestätigten [Projektplan](../../PLAN.md) noch nicht. Die [technische Recherche](../research/pagefind-counting-2026-11-10.md) hält API, Quellen, Versionsgrenzen und native Versuche fest.

## Empfehlung

Für das Ziel „anhand erinnerter Stichwörter eine Folge wiederfinden“ **Pagefind als einzige Such- und Zählquelle verwenden**. Das Diagramm zeigt dann Suchwort-Treffer der Suchmaschine. spaCy ist dafür technisch nicht nötig. Eine sprachwissenschaftliche Grundformstatistik ist ein anderes Produkt; die bisherige Aussage „exakte Grundformzählung“ darf beim Wechsel nicht erhalten bleiben.

Die passende Vereinfachung besteht aus drei zusammenhängenden Änderungen:

1. Freitext statt Auswahl aus dem gesamten Grundformverzeichnis.
2. Suchindexpositionen für Diagramm, Rangfolge und Originaltext-Markierungen gemeinsam verwenden.
3. Kompakte Ergebnisse mit einem aufklappbaren Transkriptleser und einer **hellen, stets vertikalen** Minimap verbinden.

RSS, lokale FP32-Transkription, Episoden-JSONs mit groben Segmenten, Download-/Verarbeitungszeiten, mehrere Podcasts und GitHub Pages bleiben die Grundlage. Vorhandene Transkripte reichen für den Wechsel vollständig aus; keine erneute Audioverarbeitung.

## Was Pagefind zählen kann

Der aktuelle Build indexiert **eine vollständige Folge pro Suchdokument**, ausschließlich den gesprochenen Segmenttext. Die Absätze tragen Segment-IDs. Der Suchworker sucht bereits jeden Begriff einzeln und kopiert die Rohpositionen `result.words`, bevor er Details lädt. Diese Positionen lassen sich nach stabiler Folgen-ID gruppieren und zählen. Das ist keine Zählung des Relevanzwertes und keine Zählung der Ergebnisfolgen.

Für jede Folge und jedes normalisierte Suchwort gilt:

```text
Positionen[Suchwort, Folge] = unterschiedliche Pagefind-Wortpositionen
Treffer[Suchwort, Folge] = Anzahl dieser Positionen
Diagrammsumme[Folge] = Summe der Treffer aller Suchwörter
```

Alle Rohresultate pro Wort auswerten, nicht nur die ersten zehn Ergebnisse. Fehlende Kombinationen nach erfolgreicher Suche sind null. Ein Ladefehler bleibt ein Fehler. Erst nach dem globalen Zählen die Top-Folgen bestimmen und deren Fragmente/Originaltexte laden. Der Index liefert Positionslisten bereits vor `result.data()`; das komplette Transkriptarchiv muss dafür nicht heruntergeladen werden. Die [Pagefind-API](https://pagefind.app/docs/api/) beschreibt die getrennten Rohresultate und nachladbaren Details; die Recherche prüft zusätzlich die tatsächlich gesperrte Version.

**Die Bedeutung ändert sich:** Pagefind kombiniert deutsches Stemming und Wortanfangstreffer. Im aktuellen Index liefern `Haus`, `Häuser` und `Hauses` jeweils dieselben 666 Positionen in 102 Folgen. `Münze` liefert auch `Münzfach` und `Münzgeldtasche`. Das kann die Erinnerungssuche verbessern und zugleich unerwünschte Treffer erzeugen. Es ersetzt weder kontextabhängige Lemmatisierung noch Synonyme oder Bedeutungssuche. Bei Tippfehlern und deutschen Wortzusammensetzungen gibt es keine Vollständigkeitsgarantie. Anführungszeichen sind in der untersuchten Version kein Weg zur vollständigen exakten Wortzählung: Ein kontrollierter Text mit dreimal `Münze` liefert beim zitierten Suchpfad nur die erste Position. Diesen Pfad für die geplanten Zählungen ausschließen.

Ein Vergleich über alle 106 Folgen zeigt die praktische Abweichung:

| Eingabe | Pagefind-Suchpositionen | Bisherige spaCy-Grundformvorkommen |
| --- | ---: | ---: |
| Eimer | 27 | 24 |
| Münzen | 32 | 16 für die Grundform `münze` |
| Kleingeld | 33 | 31 |
| Haus | 666 | 523 |
| Bank | 80 | 53 |

Das sind gemessene unterschiedliche Definitionen, kein Nachweis, dass eine der beiden Methoden die sprachlich richtige Gesamtzahl liefert. Die Freigabe muss die Eignung zur Erinnerungssuche bewerten.

Auch eine gemeinsame Anfrage darf die Einzelwortabfragen nicht ersetzen: `Eimer Münzen Kleingeld` liefert im echten Index nur eine Folge; die Vereinigung der drei Einzelsuchen findet 29. Begriffe dürfen über verschiedene Segmente verteilt sein. Der bestehende eigene Wrapper ist deshalb weiter nötig, auch bei „nur Pagefind“. [Mehrwortsuche und API](https://pagefind.app/docs/api/)

### Überschneidende Begriffe transparent behandeln

Identische Eingabebegriffe nach Kleinschreibung und Unicode-Normalisierung nur einmal suchen. Unterschiedliche Begriffe können trotzdem dieselbe Wortposition treffen, etwa `Haus` und `Häuser`. Für den ersten Umbau keine automatische sprachliche Zusammenführung und keine erfundene Aufteilung der Positionen einführen:

- Jede Balkenserie zählt unabhängig die Treffer ihres Suchwortes.
- Die Stapelhöhe heißt **„Suchwort-Treffer“** und ist die Summe dieser Serien. Ein passender Texttoken kann zu mehreren Serien beitragen.
- Leser und Minimap zeigen eine überlappende Position nur einmal, mit mehreren zugeordneten Farben. Die Vor-/Zurücknavigation zählt eindeutige Textstellen.
- Ein kurzer Hinweis erklärt, warum die Summe der Suchwort-Treffer größer als die Anzahl eindeutiger markierter Stellen sein kann. Ein Testfall `Haus Häuser` schützt diese Regel.

Dadurch bleiben Stapel und Einzelwerte mathematisch konsistent. Falls später ausschließlich eindeutige Textstellen als Balkenhöhe gewünscht sind, muss eine andere Darstellung gewählt werden; eine Vereinigung der Positionen lässt sich bei Überschneidungen nicht einfach als unabhängige Wortserien stapeln.

## Vorteile, Nachteile und Alternative

| Gesichtspunkt | Pagefind als einzige Such-/Zählquelle | spaCy zusätzlich behalten |
| --- | --- | --- |
| Betreiberaufwand | Kein zusätzliches deutsches Modell und kein Analyseschritt; weniger Verträge, Cache- und Fehlerzustände | Separates Modell, Analysen und Veröffentlichungsartefakte weiter pflegen |
| Zählung und Text | Dieselben Trefferpositionen bilden Zahlen und Markierungen | Grundformzahlen können von lexikalisch gefundenen Passagen abweichen |
| Eingabe | Frei erinnerte Wörter, unbekannte Wörter ergeben ehrliche Nulltreffer | Ausgewählte, bekannte Grundformen samt Vorschlägen |
| Bedeutung der Zahl | Positionen, die zur Suchanfrage passen; Stemming/Präfixe wirken mit | Sprachlich ermittelte Grundformvorkommen; auch das Modell kann Fehler machen |
| Wortschatz-Auswertungen | Kein verlässlicher Ersatz für verschiedene/neue Grundformen | Vorhandene chronologische Grundform- und Wortschatzstatistiken bleiben möglich |
| Skalierung | Gemeinsamer Index; häufige Begriffe können große Positionslisten laden | Zusätzliche Daten, aber vorberechnete Zählpakete sind direkt abrufbar |
| Abhängigkeit | Zählsemantik hängt stärker an der gesperrten Pagefind-Version | Zählung bleibt unabhängig von Änderungen der Suchmaschine |

Gemessen am aktuellen 106-Folgen-Build: Das öffentliche Vokabular hat 3.417.322 Byte, die 64 Zähldateien zusammen 1.787.753 Byte. Sämtliche 67 Statistik-JSONs haben 5.237.210 Byte; 106 gespeicherte Analysen 7.559.556 Byte. Das sind rohe Dateigrößen, keine gemessenen Netzwerktransfers. Die Vorschlagswortliste wird gegenwärtig vollständig geladen. Ihr Wegfall ist besonders für den Einstieg attraktiv; die genaue neue Gesamtgröße und Suchlatenz müssen gemessen werden.

Wenn genaue Grundformstatistiken weiterhin ein wesentliches Ziel sind, **spaCy behalten**. Freitextfeld und Minimap lassen sich auch mit der bestehenden Analyse kombinieren; für die UI sind sie nicht von ihrem Wegfall abhängig. Ein eigener leichter Regex-Zähler wäre eine dritte Variante mit neuer Tokenisierungs-/Flexionslogik und löst das Sprachenproblem nicht automatisch. Für die Erinnerungssuche empfiehlt sich daher kein zusätzlicher Zähler.

## Freitext auf Start- und Podcastseite

### Startseite

Das große Racoo-Logo und die Podcastkarten bleiben. Die bisherigen vier ausgewählten Wörter und das kleine Vorschlagsfeld werden durch **ein normales Suchfeld mit Suchsymbol** ersetzt. Es enthält als bearbeitbaren Startwert `Die Podcast Wort Suche`, ohne Dropdown und ohne Auswahlzwang. Der kurze Erklärungstext darunter bleibt und markiert lokal passende Begriffe in denselben Farben.

Die Startseite bleibt zunächst eine klar als Beispiel bezeichnete Demonstration. Dafür keine Podcastindizes laden und keine beliebigen sprachlichen Gleichsetzungen versprechen. Die vorhandenen kleinen Wortfamilien im Erklärungstext dürfen als explizite Demoregeln erhalten bleiben; sie sind kein Pagefind-Qualitätsnachweis. Der unveränderte Demostartwert startet keine echte Podcastsuche. Eine vom Nutzer bearbeitete Eingabe wird beim Anklicken einer Podcastkarte als `q` in die Podcastansicht übernommen. Auf eine zusätzliche Suche über alle Podcasts verzichten.

### Podcastseite

Ein ausreichend breites Feld mit Suchsymbol, beispielsweise `Eimer Münzen Kleingeld`. Mehrere Wörter direkt hineinschreiben; keine Pflicht-Chips und keine Vorschlagsliste. Suche mit Enter oder Suchknopf auslösen. Das vermeidet teure neue Anfragen nach jedem Buchstaben und hält den ersten Umbau einfach. Leeren ist eine normale Aktion im Feld. Der frühere automatische Start mit `haus` entfällt in dieser Freitextvariante; eine übernommene/geteilte Anfrage wird dagegen ausgeführt.

Die erste Version behandelt die Eingabe ausschließlich als Stichwortliste, ohne Zitat-, Boolean- oder Operator-Syntax. Anführungszeichen als äußere Satzzeichen behandeln und nicht an Pagefind als Phrasenanweisung weiterreichen. Leerraum und Kommas trennen Begriffe; Groß-/Kleinschreibung, Unicode-Normalisierung, Wiederholungen, Bindestriche und Randzeichen erhalten dokumentierte, getestete Regeln. Begriffsreihenfolge erhalten, damit die Farbzuordnung nachvollziehbar bleibt. Höchstens fünf unterschiedliche wirksame Stichwörter; längere Eingaben sichtbar erklären statt still abzuschneiden.

Eine kleine Farblegende neben Diagramm und Leser ordnet die erkannten Begriffe zu. Sie ist keine zweite Wortauswahl. Die bestehenden Top-10-/Alle-Ansichten bleiben: Top 10 nach Summe der Suchwort-Treffer absteigend, Alle chronologisch einschließlich Nullfolgen. Bei gleicher Summe gelten die bisherigen Datum-/ID-Regeln. Abdeckung wie „2 von 3 Suchwörtern“ zusätzlich angeben. Ein Wechsel zur Sortierung nach Abdeckung wäre eine gesonderte Produktentscheidung, keine versteckte Folge dieses Umbaus.

### Stoppwörter und Zusatzliste

Die bisher zugesagte Filterung erhalten, aber vom spaCy-Modell lösen: eine versionierte kleine deutsche Stoppwortliste und die manuelle Zusatzliste als normalisierte Suchbegriffe veröffentlichen. Die Liste filtert die **Anfrage**, nicht den gespeicherten Text und nicht die Indexpositionen. Ohne Lemmatisierung brauchen auszuschließende Wortformen explizite Einträge; die bisherige Lemmaliste darf nicht ungeprüft als gleichwertig gelten.

Ignorierte Eingaben knapp nennen, etwa „Ignoriert: die, und“. Bei ausschließlich ignorierten Wörtern zum Ergänzen eines aussagekräftigen Stichworts auffordern. Pagefind selbst übernimmt diese Produktregel nicht. Regeln und Index werden an denselben Veröffentlichungsstand gebunden.

## Fundstellen mit heller vertikaler Minimap

Der angehängte [HTML-Prototyp](C:/Users/User/Downloads/racoo-minimap-prototyp.html) wurde lokal in Chromium mit dem echten, lokal gespeicherten UFO070-Transkript geprüft: elf Segmente, 18 markierte Stellen, keine JavaScript-Fehler. Seine Trefferbereiche sind fest im HTML hinterlegt. Er ist ein UI-Nachweis, keine dynamische Suche. Mobil schaltet er automatisch auf horizontal; das wird ausdrücklich nicht übernommen. Ebenfalls nicht übernommen werden seine Ersatzmarke, fest verdrahtete Folge und externe Rohdaten-URL.

### Ansicht und Bedienung

Unter dem Diagramm bleiben zehn kompakte Folgenkarten mit Einzelwerten, Abdeckung und zunächst höchstens zwei kurzen Ausschnitten. „Transkript öffnen“ erweitert **eine aktive Folge** zum Leser; keine zehn großen Scrollfenster zugleich. Die Erweiterung ist direkt in der Ergebnisliste, ohne zusätzliche Editorbibliothek und ohne neue Serverroute. Der Leser lädt bei Bedarf alle Segmente dieser einen Folge und stellt sie chronologisch dar, auch solche ohne Treffer. Die bisherige Sortierung einzelner Passagen nach Abdeckung eignet sich nicht für diese Gesamtübersicht.

Rechts neben dem Text steht die vertikale Minimap. Sie bildet das **vollständige Transkript der geöffneten Folge** ab, nicht die Liste aller Folgen und nicht eine genaue Audiozeitleiste:

- sehr feine graue Zeilen für Textstruktur;
- Farbmarkierungen für Fundstellen und kleine Spuren je Suchwort, damit gleichzeitige Farben nicht verdeckt werden;
- ein dezenter sichtbarer Rahmen für den aktuellen Lesebereich;
- ein Umriss für die aktive Fundstelle, ergänzend zur Farbe;
- dünne Segmentmarken als grobe Orientierung.

Ein Klick nahe einer Fundstelle öffnet diese im Text; ein Klick auf eine freie Stelle scrollt an die entsprechende Textposition. Ziehen verschiebt den Lesebereich. „Vorherige/Nächste Fundstelle“ und „3/18“ erlauben gezielte Navigation unabhängig von der Minimap. Markierungen mehrerer Begriffe an derselben Stelle erhalten eine geteilte Farbfläche oder mehrere Unterstreichungen und eine zugängliche Beschriftung.

Die Minimap selbst startet **kein Audio**. „Ab 15:02 anhören“ verwendet wie bisher den Segmentanfang; der Hinweis zu Werbung bleibt direkt erreichbar. Innerhalb eines Fünf-Minuten-Segments entsteht durch Textpositionen keine genauere Audiozeit. Teilbare Folgen-/Zeitlinks und der gemeinsame Player bleiben erhalten, ohne Autoplay beim Öffnen.

### Light Theme und Mobilansicht

An die vorhandene Oberfläche anknüpfen: Seitenhintergrund `#f4f6f5`, Leser weiß, Minimap beispielsweise `#edf1ee`, Textlinien in einem gedeckten Graugrün. Der Sichtbereich bekommt eine schwach getönte Fläche und einen klaren graugrünen Rahmen. Treffer verwenden dieselben Wortfarben wie das Diagramm; die heutigen sehr hellen Prototyp-Marker nicht unverändert auf hellem Grund übernehmen. Kontrast und Erkennbarkeit der tatsächlichen Kombinationen prüfen. Keine dunkle Seitenfläche, keine zusätzliche flächige Trennlinie, kein Ausrichtungsumschalter.

Desktop: etwa 96–120 px breite Übersicht; Text mit angenehmer Zeilenlänge und an die Fensterhöhe angepasstem Lesefenster. Mobil: etwa 44–52 px schmale **vertikale** Trefferleiste, reduzierte graue Textdetails und weiterhin gut lesbarer Haupttext. Diese Maße sind Startwerte für die Layoutprüfung, keine feste Mindestbreite. Die Seitenbreite darf bei 320/390 px und Zoom nicht überlaufen; Text umbrechen lassen. Die normale Scrollgeste im Text und die Vor-/Zurückknöpfe bleiben die zuverlässigen Hauptbedienwege.

### Technischer Zuschnitt

`TranscriptReader` verwaltet die geöffnete Folge, chronologische Segmente und aktive Fundstelle. `TranscriptMinimap` erhält ausschließlich dieselben Textbereiche und misst deren Layout. Die vorhandene Zuordnung `Pagefind-Position → Segmentanker → Originaltextbereich` wiederverwenden und ihre Schutzprüfungen erhalten. Keine Wortzeitstempel, zusätzlichen NLP-Daten oder gespeicherten Minimap-Dateien hinzufügen.

Gering aufgelöste Zeilendarstellung und Treffer auf ein Canvas zeichnen, ein DOM-Element als sichtbaren Scrollrahmen darüberlegen. Rechtecke aus `Range.getClientRects()` messen; bei Größen-/Zeilenumbruchänderungen per `ResizeObserver` neu bestimmen, beim Scrollen nur den Sichtbereich aktualisieren. Messung/Zeichnung über `requestAnimationFrame` bündeln, nicht bei jedem Scrollereignis das ganze Transkript vermessen. Canvas an `devicePixelRatio` anpassen und nach Zoom/Dichtewechsel aktualisieren; dadurch werden Minimap-Linien nicht unnötig unscharf. [Range-Rechtecke](https://developer.mozilla.org/en-US/docs/Web/API/Range/getClientRects), [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver), [Canvas-Pixeldichte](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio)

Der Canvas ist rein visuell. Text bleibt echter, auswählbarer DOM-Text; Trefferknöpfe haben Namen und Fokuszustände. Für die interaktive Scrollfläche `role="scrollbar"`, `aria-controls`, vertikale Orientierung sowie Min-/Max-/Aktuell-Werte gemäß [WAI-ARIA](https://www.w3.org/TR/wai-aria-1.2/#scrollbar) verwenden; Pfeile, Bild auf/ab und Pos1/Ende unterstützen. Statusansagen nur für gezielte Navigation, nicht für jede Scrollbewegung. Bewegungsreduktion beachten und die native Textscrollfunktion erhalten. Tastatur und Touch einschließlich assistiver Bedienung separat prüfen.

## Änderungen im Repository

| Bereich | Geplante Änderung |
| --- | --- |
| `updates.py`, `cli.py`, `site.py`, `publication.py` | Erfolgreiche Transkription/Validierung reicht für Suchbereitschaft. Analyseaufruf und die Pflicht zu passenden Analyse-JSONs entfernen. `update --limit N` und alle ASR-Zeiten erhalten. |
| `analysis.py`, Analysis-Schema, `analyses/`, `pyproject.toml`, Lockdatei | Nach bestandener neuer Abnahme aus dem aktiven Laufweg entfernen; spaCy und Sprachmodellinstallation entfallen. Historische Ergebnisdokumentation erhalten. Keine Neutranskription. |
| `web/build/site.ts`, `statistics.ts`, `publication.ts`, Build-Inputs | Vokabular und 64 Zähldateien entfallen. Kleinen öffentlichen Folgenkatalog mit Titel/Datum/Dauer/Laufzeiten direkt aus Transkripten erzeugen. Veröffentlichungsvertrag neu versionieren; Suchindex, Katalog, Suchregeln und IDs gemeinsam validieren. |
| `web/src/search.ts`, `search-worker.ts` | Globale Einzelwortzählungen vor Detailabrufen zurückgeben. Einen Worker je aktivem Podcast/Veröffentlichungsstand wiederverwenden; nach Fehlern bewusst erneuern. Anfrage-IDs, Abbruch, Datenstandsbindung und kopierte Positionslisten erhalten. |
| `Stats.tsx`, `Frequency.tsx`, `LandingIntro.tsx` | Freitextformular und neue Trefferdaten statt Lemmaauswahl/Zählpaketen. Vorhandenes Diagramm weiterverwenden. Stoppworthinweis an die neue Filterregel anpassen. |
| `VocabularySummary.tsx` | Die bisherigen Grundformwerte „verschiedene/neue Wörter“ entfernen. Ein Pagefind-`word_count` ist kein gleichwertiger Ersatz für die bisherigen alphabetischen spaCy-Gesamtwörter. Laufzeit-/Folgenübersicht erhalten. |
| neue Leser-/Minimap-Komponenten, Styles | Eine aufklappbare Gesamttranskriptansicht, vertikale helle Minimap und gezielte Treffernavigation. Bestehender Player bleibt gemeinsam. |
| Tests, Verträge und Dokumentation | Auf Suchwort-Treffer umstellen; `PLAN.md`, `GLOSSARY.md`, Datenverträge, Betriebsanleitung und Fixture-Prüfungen nach der Entscheidung gemeinsam ändern. Nur vorhandenen Pages-Deploymentworkflow an neue Artefakte anpassen. Tests bleiben lokal. |

„Nur Pagefind“ bedeutet also **ein Suchindex statt Suchindex plus NLP-Statistik**, weiterhin mit einem kleinen eigenen Adapter für Mehrwortsuche, Zählungen, Farben, IDs und Minimap. Kein neues Backend und keine neue Datenbank.

## Umsetzung und Abnahme in überschaubaren Schritten

1. **Zählsemantik und Qualität beweisen.** Kleine kontrollierte Texte mit Wiederholungen, Flexionen, Präfixen, Komposita, Bindestrichen, Stoppliste, Doppelbegriffen und Nulltreffern prüfen. Auf den echten 106 Folgen zehn bekannte Erinnerungssuchen gegen die heutige Ansicht vergleichen. Insbesondere breite, unerwartete Präfixtreffer bewerten. Empfehlung nur übernehmen, wenn diese Qualität für die Folgensuche genügt; andernfalls Analyse beibehalten und UI separat verbessern.
2. **Pagefind-Datenadapter und Freitext umstellen.** Globale Wortzählungen ohne flächige Fragment-/Transkriptabrufe, deterministische Top 10, Alle einschließlich Nullfolgen, Einzelwerte, Farben und Fehlerzustände nachweisen. Kalte/warme Suche messen. Die persistentere Instanz darf weder alte Antworten anzeigen noch nach einem Ladefehler dauerhaft defekt bleiben.
3. **Den aktiven Pipeline-/Buildweg vereinfachen.** Neuen Metadatenkatalog und versionierten Veröffentlichungsvertrag einführen, ohne spaCy bauen und die vorhandenen 106 Folgen vollständig veröffentlichen. Erst dann tote Analysefunktionen, Datenartefakte und Abhängigkeiten entfernen. Keine dauerhafte doppelte Produktionspipeline oder neuer Laufzeit-Umschalter.
4. **Minimap integrieren.** Mit einer realen Folge und mindestens drei Farben beginnen. Scrollen, Ziehen, Vor/Zurück, Segmentanfang, mehrfarbige Überschneidungen, längster Text, Nulltreffer, offene Folge bei neuer Suche, Resize, Zoom, Rückkehr zur Karte und Fokus prüfen. Originaltext darf durch das Markieren nicht verändert werden.
5. **Lokal abnehmen und regulär veröffentlichen.** Echte Daten und kleine Prüfkorpora unter `/` und `/racoo/`, mehrere/leer konfigurierte Podcasts, 320/390 px sowie Desktop, Tastatur, Touch, kaputte Suchdateien und Audiofehler abdecken. Bestehende Projektziele verwenden: auf dokumentiertem Mobilprofil erste Ergebnisse innerhalb von fünf Sekunden, warme Suche innerhalb einer Sekunde und bis zum ersten Ergebnis höchstens 10 MB anstreben. Tatsächliche Bytes, CPU-/Netzprofil und Cachezustand protokollieren. Kein behaupteter 600-Folgen-Nachweis, solange kein unabhängiger echter Korpus dieser Größe geprüft ist.

Zuerst also nachweisen, dass die neue Bedeutung von „Treffer“ zum Nutzungsziel passt. Der restliche Umbau wird dadurch kleiner; der Nutzen der Minimap lässt sich unabhängig davon behalten.
