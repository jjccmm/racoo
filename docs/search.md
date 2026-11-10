# Freitext, Suchwort-Treffer und Minimap

Racoo verwendet den gesperrten Pagefind-1.5.2-Index als gemeinsame Quelle für Zählungen und Markierungen. Die [native Untersuchung](research/pagefind-counting-2026-11-10.md) enthält die Grenzen und Beispiele. Der [Plan](planning/pagefind-and-minimap.md) dokumentiert die Abwägung gegenüber der früheren Grundformanalyse.

## Eingabe und Regeln

Auf der Podcastseite bis fünf unterschiedliche Stichwörter eingeben und Enter oder „Suchen“ drücken. Groß-/Kleinschreibung und NFC-Unterschiede erzeugen keine zusätzlichen Begriffe. Wiederholungen deduplizieren; Reihenfolge für die Farben erhalten. Unicode-Buchstaben/Ziffern, innere Bindestriche und Schrägstriche gehören zum Begriff; Randzeichen, Anführungszeichen, Leerraum und Kommas trennen ihn. Keine Zitat-/Operator-Syntax. Eingaben über fünf wirksamen Begriffen oder 250 Zeichen werden erklärt, nicht abgeschnitten.

[`config/search-rules.json`](../config/search-rules.json) enthält normalisierte deutsche `stopwords` und manuell gepflegte `ignoredWords`. Einträge sind konkrete Schreibweisen, keine Lemmata; benötigte weitere Formen ausdrücklich ergänzen. Der Build validiert die Listen und bindet ihren Hash an die Veröffentlichung. Regeln filtern nur die Anfrage. Ignorierte Begriffe werden sichtbar genannt. Eine ausschließlich ignorierte Eingabe lädt keinen Suchindex.

Die Startdemo verwendet eigene kleine, explizite Wortfamilien ausschließlich im Erklärungstext. Sie lädt keinen Podcastkorpus. Der unveränderte Startwert ist keine echte Suche; eine bearbeitete Eingabe wird als `q` in die gewählte Podcastansicht übernommen.

## Zahlen und Datenfluss

Jeden Begriff einzeln suchen. Pro Folge/Begriff die unterschiedlichen Rohpositionen `result.words` zählen; erst anschließend Top-Folgen bestimmen. Die gemeinsame native Mehrwortsuche würde Teiltreffer verlieren. Alle erfolgreichen Rohresultate auswerten, einschließlich Kandidaten jenseits der ersten zehn. Nullfolgen aus dem vollständigen veröffentlichten Metadatenkatalog ergänzen. Fehlgeschlagene Abrufe bleiben sichtbare Fehler.

Die Stapelserien zählen unabhängig. `Haus Häuser` kann dieselbe Stelle zweimal zur Stapelsumme beitragen lassen; diese Summe heißt Suchwort-Treffer. Markierungen und Leser-Navigation führen dieselbe Textposition dagegen zu einer eindeutigen Fundstelle mit mehreren Farben zusammen. Pagefind trifft auch Wortformen/Präfixe, beispielsweise `Münze` → `Münzfach`. Keine Gleichsetzung mit sprachlich exakten Grundform- oder Gesamtwortzahlen.

Top 10 nach Gesamtsumme absteigend, dann Datum absteigend und ID. Alle nach Datum/ID aufsteigend, einschließlich Nullen. Die zehn Top-Folgen erhalten ihre globalen Zählungen sofort; Fragmente und Originaltranskripte werden erst für die erste oder gerade sichtbar werdende Karte geladen. Ein langsamer Textabruf blockiert die anderen Karten nicht. Der Browser hält die erfolgreiche Indexbindung je aktivem Datenstand. Der Suchworker behält erfolgreiche Pagefind-/Begriffscaches und höchstens zwanzig Originaltranskripte je Index bei; Aufrufe serialisieren. Abbruch, Anfragegenerationen und Kopien der Rohpositionen schützen neuere Suchen. Nach Ladefehlern die Instanz verwerfen und auf bewusste Wiederholung warten.

## Leser und Minimap

„Transkript öffnen“ erweitert eine Folge. Alle Originalsegmente chronologisch anzeigen und die nativen Positionen über geprüfte Segmentanker in UTF-16-Bereiche des Originaltexts übersetzen. Bei nicht übereinstimmenden Textständen keine Markierungen erfinden. Vorherige/nächste Fundstelle zählt die eindeutigen Bereiche. Schließen gibt den Tastaturfokus an die öffnende Schaltfläche zurück.

Die helle Minimap ist auch mobil vertikal. Graue Zeilen zeigen Textstruktur, farbige Spuren die Stichwörter, ein Rahmen den sichtbaren Bereich. Klick navigiert zur nahen Fundstelle oder Textposition, Ziehen verschiebt den Lesebereich. Pfeile, Bild auf/ab, Pos1/Ende und die normale Scrollgeste bleiben verfügbar. Der Canvas ist dekorativ; der Originaltext bleibt auswählbarer DOM-Text.

Nach Umbruch/Resize die Layoutpositionen neu messen; beim Scrollen nur den sichtbaren Rahmen aktualisieren. Canvas-Pixeldichte an Display/Zoom anpassen. Die Karte ist eine Textübersicht, keine genaue Audiozeitleiste. Sie lädt oder startet kein Audio. Die separate Abspielaktion nutzt wie bisher den gespeicherten Segmentanfang samt Werbehinweis.

## Prüfung

`scripts/check.py` verwendet kleine echte Pagefind-Indizes unter beiden Basispfaden und zusätzliche konfigurierte Podcasts. Browserfälle decken wiederholte/überlappende Begriffe, Titel-Ausschluss, Unicode/Komposita, Stoppwörter, komplette Rohzählungen, Ladefehler, Abbruch, Textabgleich, Minimap-/Fokusnavigation sowie gemeinsame Wiedergabe ab. Ein echter 106er-Lauf ergänzt die Fixtures. 600 unabhängige Folgen und reale Mobilgeräte bleiben separate Mess-/Qualitätsnachweise.
