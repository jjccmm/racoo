# Kompakte und gefilterte Wortstatistik

Stand: 25. Oktober 2026. Beide [Tickets](../../.scratch/compact-filtered-statistics/ticket-index.md) sind auf `codex/compact-filtered-statistics` umgesetzt. Dies ergänzt den vorhandenen Fünf-Folgen-Pilot; es wurden weder neue Audiodateien geladen noch ASR oder spaCy erneut ausgeführt.

## Ergebnis und Bedienung

Die öffentlichen Statistikdateien verwenden Schema 2 mit Paaren `[Folgenindex, Anzahl]`. Der nullbasierte Index verweist auf die chronologische Folgenliste desselben Statistikkatalogs; deren Einträge behalten die dauerhaften Episoden-IDs. Der Index ist keine dauerhafte Identität.

Automatisch erkannte Stoppwörter und die manuelle [Zusatzliste](https://github.com/jjccmm/racoo/blob/5172e992ffec43f75e516aedc4a0de566f840ab8/src/podcast_words/ignored_lemmas.txt) fehlen sowohl im veröffentlichten Vokabular als auch in den 64 Zählpaketen. Die Liste enthält zunächst `äh` und `ähm`. Eine alphabetische Grundform pro Zeile hinzufügen und anschließend `npm.cmd --prefix web run build` ausführen. Der Standardbuild veröffentlicht aus den gespeicherten Analysen neu. Die [Betriebsanleitung](../analysis.md#zusätzliche-ignorierte-grundformen-pflegen) erklärt Kommentare, Normalisierung, Fehler, CLI-Overrides und die erforderliche erneute Vorbereitung einer ausdrücklich gewählten Veröffentlichungsquelle.

Die Webseite erklärt den Ausschluss direkt bei der Wortauswahl. Transkripte, Pagefind-Suche und vollständige gespeicherte Analysen bleiben erhalten. Gesamtwörter, verschiedene und neue Wörter sowie der Nenner je 1.000 Gesamtwörter berücksichtigen weiterhin alle alphabetischen Wörter. Der Stoppwortschalter ist entfernt.

## Echte fünf Folgen

Alle Angaben sind unkomprimierte Bytes. Die Zwischengröße „nur kompakt“ trennt den Formatwechsel von der nachfolgenden Filterung.

| Größe | Vorher | Nur kompakte Paare | Kompakt und gefiltert |
| --- | ---: | ---: | ---: |
| Zählpakete insgesamt | 438.666 | 133.530 | 122.873 |
| Wortverzeichnis | 422.627 | 422.627 | 399.713 |
| Statistikkatalog | 1.770 | 1.770 | 1.770 |
| Auswählbare Grundformen | 5.427 | 5.427 | 5.121 |
| Grundform-/Folgenpaare | 8.476 | 8.476 | 7.304 |

Das sind insgesamt rund 72 % weniger Zählpaketbytes. Ausgeschlossen wurden 304 automatische Stoppwort-Grundformen und die beiden manuellen Ergänzungen. Die vollständigen Gesamtwerte bleiben 49.665 Wörter, 5.427 verschiedene und 5.427 erstmals auftretende Grundformen.

Der Browsernachweis hat am [Root-Pfad](evidence/filtered-statistics-browser-root.json) und am [Projektpfad](evidence/filtered-statistics-browser-project.json) sämtliche 7.304 Paare gegen die gespeicherten Analysen verglichen. Sichtbare `hund`-Werte sind 12, 0, 2, 0, 4 in chronologischer Reihenfolge; absolute und normierte Ansichten, Nullwerte, fünf Folgen mit Laufzeiten, ausgeschlossene Vorschläge, Hinweis und mobile Breite wurden geprüft. Vor der Stichwortsuche wurden keine Transkripte geladen. Je zehn frühere technische Suchabfragen blieben auf Rang 1. Das sind transcriptbasierte Regressionstests, keine unabhängige menschliche Suchqualitätsprüfung. Online-Audio wurde bei diesen Prüfungen nicht abgerufen.

## Synthetische 600 Folgen

120 Wiederholungen derselben fünf gespeicherten Analysen mit neuen gleich langen Episoden-IDs prüfen die Statistikgröße und Indizes bis 599. Es sind keine 600 unabhängigen Texte; Vokabularwachstum, echter Pagefind-Index, Übertragungszeiten und Browserleistung werden damit nicht nachgewiesen.

| Export | Alle Zählpakete | Größtes Paket | Exportdauer |
| --- | ---: | ---: | ---: |
| Historischer ID-Paar-Export | 42,89 MB | 966.629 Byte | 8,54 s |
| Kompakte Paare | 8,11 MB | 183.389 Byte | 8,62 s |
| Kompakte, gefilterte Paare | 6,94 MB | 149.629 Byte | 9,17 s |

Die Exportläufe sind Einzelmessungen, keine Aussage über Geschwindigkeitsunterschiede. Der gefilterte Export enthält 876.480 Paare, aber weiterhin 5.959.800 Gesamtwörter. Temporäre 600er-Exportdateien wurden gelöscht. [Größennachweise und genaue Abgrenzung](evidence/filtered-statistics-sizes.json).

## Abschlussprüfung

Der vollständige Offline-Check bestand: 76 Pythonfälle, Ruff/Format, Dokumentations- und Vertragsprüfung, Weblint/TypeScript sowie 49 Chromiumfälle je Root- und Projektpfad. Die [getrennten Reviews](../../.scratch/compact-filtered-statistics/review.md) fanden weder Standards- noch Anforderungsprobleme. Der echte Root-Build wurde nach den Fixture-Prüfungen wiederhergestellt; der lokale Preview unter `http://127.0.0.1:4173/` zeigt die fünf echten Folgen.

Alphabetische Wortlisten und nach globaler Häufigkeit geordnete Zählpakete sind [dokumentierte spätere Optionen](../research/github-pages-600-episodes.md#zurückgestellte-optionen-bei-gemessenen-leistungsproblemen). Die aktuelle Umsetzung behält ein Wortverzeichnis und 64 Hash-Pakete; zusätzliche Caches oder Such-Worker-Umbauten wurden nicht eingeführt. Archivverarbeitung und öffentliche Veröffentlichung bleiben gesonderte Arbeiten.
