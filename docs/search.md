# Freitext, Suchwort-Treffer und Minimap

Racoo verwendet den gesperrten Pagefind-1.5.2-Index als gemeinsame Quelle für Zählungen und Markierungen. Die [native Untersuchung](research/pagefind-counting-2026-11-10.md) enthält die Grenzen und Beispiele. Der [Plan](planning/pagefind-and-minimap.md) dokumentiert die Abwägung gegenüber der früheren Grundformanalyse.

## Eingabe und Regeln

Auf der Podcastseite bis zehn unterschiedliche Stichwörter eingeben und Enter oder „Suchen“ drücken. Groß-/Kleinschreibung und NFC-Unterschiede erzeugen keine zusätzlichen Begriffe. Wiederholungen deduplizieren; Reihenfolge für die Farben erhalten. Unicode-Buchstaben/Ziffern, innere Bindestriche und Schrägstriche gehören zum Begriff; Randzeichen, Anführungszeichen, Leerraum und Kommas trennen ihn. Keine Zitat-/Operator-Syntax. Ein Hinweis auf die Wortgrenze erscheint erst bei mehr als zehn verschiedenen Begriffen; auch geteilte Links werden validiert. Die bestehende Grenze von 250 Zeichen bleibt.

Alle eingegebenen Wörter werden durchsucht, einschließlich häufiger Funktionswörter. Es gibt keine aktive Stoppwort- oder manuelle Ausschlussliste. Pagefind indexiert diese Wörter bereits; die frühere Anfragefilterung ist entfernt. Häufige Wörter können bei der Sortierung nach absoluten Trefferzahlen die Rangfolge dominieren. Die [frühere Liste](research/evidence/retired-search-rules.json) bleibt ausschließlich als historischer Nachweis erhalten.

Die Startdemo verwendet eigene kleine, explizite Wortfamilien ausschließlich im Erklärungstext. Sie lädt keinen Podcastkorpus. Der unveränderte Startwert ist keine echte Suche; eine bearbeitete Eingabe wird als `q` in die gewählte Podcastansicht übernommen.

## Zahlen und Datenfluss

Jeden Begriff einzeln suchen. Pro Folge/Begriff die unterschiedlichen Rohpositionen `result.words` zählen; erst anschließend Top-Folgen bestimmen. Die gemeinsame native Mehrwortsuche würde Teiltreffer verlieren. Alle erfolgreichen Rohresultate auswerten, einschließlich Kandidaten jenseits der ersten zehn. Nullfolgen aus dem vollständigen veröffentlichten Metadatenkatalog ergänzen. Fehlgeschlagene Abrufe bleiben sichtbare Fehler.

Die Stapelserien zählen unabhängig. `Haus Häuser` kann dieselbe Stelle zweimal zur Stapelsumme beitragen lassen; diese Summe heißt Suchwort-Treffer. Markierungen und Leser-Navigation führen dieselbe Textposition dagegen zu einer eindeutigen Fundstelle mit mehreren Farben zusammen. Pagefind trifft auch Wortformen/Präfixe, beispielsweise `Münze` → `Münzfach`. Keine Gleichsetzung mit sprachlich exakten Grundform- oder Gesamtwortzahlen.

Top 10 nach Gesamtsumme absteigend, dann Datum absteigend und ID. Alle nach Datum/ID aufsteigend, einschließlich Nullen. Die zehn Top-Folgen erhalten ihre globalen Zählungen sofort; Fragmente und Originaltranskripte werden erst für die erste oder gerade sichtbar werdende Karte geladen. Ein langsamer Textabruf blockiert die anderen Karten nicht. Der Browser hält die erfolgreiche Indexbindung je aktivem Datenstand. Der Suchworker behält erfolgreiche Pagefind-/Begriffscaches und höchstens zwanzig Originaltranskripte je Index bei; Aufrufe serialisieren. Abbruch, Anfragegenerationen und Kopien der Rohpositionen schützen neuere Suchen. Nach Ladefehlern die Instanz verwerfen und auf bewusste Wiederholung warten.

## Leser und Minimap

Jede Trefferfolge erscheint direkt als offene Transkriptkarte. Ihr Header enthält Titel, Datum, Dauer, Rang, Einzelzählungen, Gesamtsumme, Suchabdeckung und Episodenlink. Originaltexte werden weiterhin sichtbarkeitsabhängig geladen; mehrere geladene Karten bleiben zugleich offen. Nach dem Laden springt nur das jeweilige Textfenster zur frühesten chronologischen Fundstelle aller Suchwörter, auch nach einer erweiterten Suche mit gecachtem Transkript. Die Suche behält ihren Tastaturfokus.

Alle Originalsegmente chronologisch anzeigen und native Positionen über geprüfte Anker in Originaltextbereiche übersetzen. Der interne Begriff „Segment“ wird in der Oberfläche durch verständliche Zeit-/Textstellen ersetzt. Bei nicht übereinstimmenden Textständen keine Markierungen erfinden. Vorherige/nächste Fundstelle zählt eindeutige Bereiche.

Die Minimap hat dieselbe weiße Hintergrundfarbe wie die Karte und bleibt auch mobil vertikal. Graue Zeilen zeigen Textstruktur, farbige Markierungen im Miniaturtext die Stichwörter, ein Rahmen den sichtbaren Bereich. Separate rechte Farbspuren und die Beschriftungen Übersicht/Ende entfallen. Klick navigiert zur nahen Fundstelle oder Textposition, Ziehen verschiebt den Lesebereich. Pfeile, Bild auf/ab, Pos1/Ende und die normale Scrollgeste bleiben verfügbar. Der Canvas ist dekorativ; der Originaltext bleibt auswählbarer DOM-Text.

Nach Umbruch/Resize die Layoutpositionen neu messen und die aktive Fundstelle bei Breitenänderungen sichtbar halten; beim Scrollen nur den sichtbaren Rahmen aktualisieren. Canvas-Pixeldichte an Display/Zoom anpassen. Die Karte ist eine Textübersicht, keine genaue Audiozeitleiste. Sie lädt oder startet kein Audio. Die Zeitknöpfe starten am Beginn des jeweiligen Textabschnitts; der Iconknopf oben rechts startet die ganze Folge bei 0:00. Die Textfenster sind nach der ersten Verkleinerung nochmals 15 Prozent niedriger; der Text beginnt links und blendet an überlaufenden oberen/unteren Rändern leicht aus. Am tatsächlichen Textanfang beziehungsweise -ende entfällt der jeweilige Fade. Die Treffer-Navigation steht neben der farbigen Wortlegende. Der Player enthält neben Titel, Schließenknopf und nativer Audioleiste ausschließlich den Werbehinweis, ohne Zeit-/Sprungbeschreibung oder zusätzliche Vor-/Zurück-/Teilen-Aktionen. Der gemeinsame Player lässt sich schließen: Audio stoppen/freigeben, ausstehende Antworten entwerten, Folge-/Zeitparameter aus dem Link entfernen und den Fokus zurückgeben.

## Prüfung

`scripts/check.py` verwendet kleine echte Pagefind-Indizes unter beiden Basispfaden und zusätzliche konfigurierte Podcasts. Browserfälle decken wiederholte/überlappende Begriffe, Titel-Ausschluss, Unicode/Komposita, ungefilterte häufige Wörter und zehn Begriffe, komplette Rohzählungen, Ladefehler, Abbruch, Textabgleich, Minimap-/Fokusnavigation sowie gemeinsame Wiedergabe ab. Die Oberfläche zeigt statt Daten-/Laufzeitdiagnosen nur einen dynamischen Podcast-Quellenhinweis. Laufzeiten bleiben im gespeicherten Katalog und den lokalen Logs. Ein echter 106er-Lauf ergänzt die Fixtures. 600 unabhängige Folgen und reale Mobilgeräte bleiben separate Mess-/Qualitätsnachweise.

## Diagrammbreite

Top10 und Alle verwenden immer die verfügbare Breite ohne horizontales Scrollen. Mehr Folgen ergeben schmalere Balken; weiße Umrandungen dürfen dünne Balken nicht überdecken. Die sichtbaren Titel werden nach verfügbarer Breite ausgedünnt, auch in Alle bleiben passende Titel sichtbar. Ein kleiner Abstand trennt die Balken. Werte und vollständige Folgentitel bleiben im Tooltip und in zugänglichen Beschriftungen verfügbar.


## Darstellung und Hilfe

Der globale Hell-/Dunkelschalter übernimmt ohne gespeicherte Wahl zunächst die Systemeinstellung. Eine manuelle Wahl wird im Browser gespeichert und vor dem ersten Seitenaufbau angewendet; gesperrter Browserspeicher verhindert das Umschalten nicht. Flächen, Logo, Wortfarben, Diagramm, Minimap und nativer Player passen sich an. Der Wechsel ersetzt keine Suchinstanz und verändert weder Anfrage noch Textposition.

Top10/Alle verwendet eine Kapsel mit gleitender Auswahl und zugänglichen Schaltflächen. Reduzierte Bewegung deaktiviert die Animation. Auf der Startseite öffnet eine native FAQ-Klappe alle sechs kurzen Antworten zu Motivation, Unabhängigkeit, maschinellen Texten, groben Audiomarken, Aktualisierung und Namensherkunft. Die ungefähre Werbeabweichung ist keine Genauigkeitsgarantie.


Beim normalen Einstieg in DAS PODCAST UFO ohne `q`-Parameter startet die Suche mit `Eimer`. Ein vorhandener Suchtext und ein ausdrücklich leeres `q=` haben Vorrang. Leeren/Suchen erhält deshalb den leeren Parameter im Link; direkte Folge-/Audiolinks starten keine zusätzliche Beispielsuchanfrage. Andere Podcasts haben keine automatische Vorgabe.

Auf der Startseite steht der Modusschalter neben der Suche. Podcastauswahl und FAQ teilen die gleiche Breite; die FAQ erhält erst geöffnet eine Kartenfläche. Die Scroll-Fades sind 36 Pixel breit und behalten ihre zustandsabhängige Sichtbarkeit.


Suchschlüssel bleiben kleingeschrieben und NFC-normalisiert. Für Legenden, Zählbeschriftungen und Tooltips wird getrennt die eingegebene Schreibweise gespeichert. Bei wiederholten Varianten wie `Eimer EIMER` gewinnt die erste Schreibweise `Eimer`; beide ergeben weiterhin eine Serie. Originaltexte werden dabei nicht umgeschrieben.


## Suchoptionen: Standard und Exakt

Ein runder Schiebereglerknopf neben der Suche öffnet eine Karte im Seitenfluss. Standard bleibt die Vorgabe und die native Pagefind-Suche. Die aufklappbare Hilfe erklärt beide Modi. Die FAQ nennt kurz Grenzen bei kurzen Wörtern wie Ei, Wortstämmen und Transkript-/Bestandslücken. Erweitert wird nicht implementiert.

Je Suchwort zeigt die geöffnete Karte eine rein informative, nach Häufigkeit absteigend/alphabetisch sortierte Liste tatsächlicher Formen der aktuellen Top10. NFC und Groß-/Kleinschreibung gruppieren eine Form; deren häufigste Originalschreibweise ist sichtbar. Kein Anklicken zum Ausschließen. Für die vollständige Übersicht werden nur die fehlenden Top10-Fragmente geladen, keine übrigen Folgen oder globalen Zusatzindizes. Unvollständige oder fehlgeschlagene Übersichten bleiben sichtbar als Ladezustand/Fehler.

Exakt fixiert zuerst die höchstens zehn Folgen mit der größten Gesamtsumme der Standardsuche, dann prüft es deren Originaltexte. Nur vollständige Tokens nach demselben Unicode-Wortmuster wie die Eingabe zählen: innere Bindestriche und Schrägstriche gehören zum Wort (Euro-Münze und Wort/Teil sind jeweils ein Token); Satzzeichen außen trennen. NFC und Kleinschreibung nur für den Vergleich, Originaltexte/UTF-16-Markierungsgrenzen bleiben unverändert. Keine Gleichsetzung von Umlauten, Akzenten oder ß/ss, kein Stemming. Ein mehrfach innerhalb eines nativen Whitespace-Tokens vorkommendes vollständiges Wort kann in Exakt mehrfach zählen; dessen Positions-IDs gehören zum lokalen exakten Wortdurchlauf, nicht zum Pagefind-Index.

Exakte Zählungen, Diagramm, Wortlisten, Leser, Navigation und Minimap stammen aus denselben Originaltreffern. Nur innerhalb der fixierten Kandidaten neu sortieren, Nulltreffer aus den Ergebnis-Karten entfernen, keine Folgen außerhalb nachladen. Deshalb kann Exakt trotz anderer möglicher Archivtreffer leer bleiben. Alle ist in Exakt deaktiviert; die Einschränkung wird dauerhaft unter der Suche und in der Modushilfe genannt. Der Linkparameter match=exact erhält den Modus; ohne diesen Parameter gilt Standard.

Standard lädt Originale weiter sichtbarkeitsabhängig. Exakt muss alle höchstens zehn ausgewählten Originale für die Zählung prüfen und verwendet diese direkt für seine Karten. Der vorhandene begrenzte Originalcache wird gemeinsam genutzt. Publikations-/Identitätsfehler, Abbruch und veraltete Antwortgenerationen bleiben abgesichert; unbekannte Werte sind keine Nullen. Das interne inspectTopEpisodes-Verfahren begrenzt die Kandidaten sowohl vor dem Workeraufruf als auch im Worker auf zehn eindeutige IDs.
