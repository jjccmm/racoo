# Pagefind-Freitextsuche und helle vertikale Minimap

Die spätere [Verfeinerung der Transkriptkarten](open-transcript-cards.md) ersetzt Kurzvorschau und optionalen Einzelleser; dieser Bericht bewahrt die ursprüngliche Abnahme.

Stand: 10. November 2026. Integrationscommit `309441f`. Umsetzung auf `feature/pagefind-minimap` nach dem bestätigten [Plan](../planning/pagefind-and-minimap.md) und [vier Tickets](../../.scratch/pagefind-minimap/spec.md). Die Anwendung verwendet Pagefind 1.5.2 als gemeinsame Such-/Zählquelle und einen vollständigen Leser mit heller Minimap. Die 106 Originaltranskripte blieben bytegleich; es gab keine neue ASR-Verarbeitung und keine Audioabrufe für die Abnahme.

## Resultierender Ablauf

RSS → begrenzte lokale FP32-Transkription → validierte Episoden-JSONs → statischer Metadatenkatalog, Suchregeln und Pagefind-Index → Freitextsuche im Browser. Der aktive Code benötigt kein spaCy-Modell. Entfernt sind Analysemodul/-schema/-CLI, Modellprüfskript, 106 gespeicherte Analysen, 17 Analyse-Fixtures, Vokabular-/Zählexport und frühere Grundformstatistik-Oberflächen. Historische Dokumentation und Messergebnisse bleiben erhalten.

Der Betreiberbefehl ist jetzt beispielsweise:

```powershell
uv run --frozen --inexact podcast-words update --podcast podcast-ufo --limit 10 --run-report .cache/asr/latest-run.json
```

`--extra analysis` entfällt. Feedquellen, stabile IDs, Teilergebnisse/Wiederaufnahme, Download-/Transkriptions-/Gesamtzeiten und normalisierte Konsolenausgabe bleiben erhalten. Das lokale Update benötigt anschließend wie bisher einen Webbuild für die Vorschau; die bestehende Pages-Veröffentlichung baut nach Push/Merge auf main automatisch. Keine zusätzliche CI-Testpipeline.

## Bedienung und Zählregel

Die Startseite ersetzt die Chips durch die bearbeitbare Freitextdemo `Die Podcast Wort Suche`. Eine geänderte Eingabe wird zur Podcastansicht übernommen. Dort bis fünf wirksame Begriffe eingeben und Enter/Suchen drücken. Die gepflegten [Stopp-/Zusatzlisten](../../config/search-rules.json) filtern nur die Anfrage und nennen ignorierte Wörter sichtbar.

Alle Rohtreffer jedes Begriffs werden global vor der Top-10-Auswahl gezählt. Eine Balkenserie zählt passende Pagefind-Positionen, einschließlich Wortformen/Präfixen. Die Summe kann dieselbe Position für verschiedene Begriffe mehrfach enthalten. Der Leser navigiert hingegen eindeutige markierte Stellen; keine exakten Grundformzahlen oder Gesamt-/Neuwortzahlen behaupten. Die Recherche zeigt etwa `Münze` → `Münzfach`; im echten Test liefert `gebärdensprache` sieben Pagefind-Treffer statt früher fünf spaCy-Grundformvorkommen. [Suchvertrag](../search.md)

Top10 bleibt nach Gesamtsumme geordnet, Alle chronologisch einschließlich Nullfolgen. Die Werte erscheinen für alle Top-Folgen sofort. Texte laden für die erste beziehungsweise in die Nähe des sichtbaren Bereichs kommende Karte; ein langsamer Abruf blockiert andere Karten nicht. Die erfolgreiche Indexbindung, native Suchinstanz und bis zu zwanzig Originaltranskripte bleiben im Sitzungscache. Nach Fehlern wird die Instanz bewusst erneuert. Unterschiedliche Veröffentlichungsstände dürfen nicht gemeinsam als gültige Werte erscheinen.

Je Folge zwei kurze Ausschnitte und die Möglichkeit, das gesamte Transkript chronologisch zu öffnen. Ein Leser zugleich; Farben, Fundstellennavigation und Minimap verwenden dieselben geprüften Originaltextbereiche. Die helle Karte bleibt bei 320/390 px vertikal, unterstützt Maus/Ziehen, Tastatur und emulierte Touch-Eingabe. Sie startet kein Audio. Der gemeinsame Player springt weiter an Segmentanfänge und zeigt den Werbehinweis; direkte Folgen-/Zeitlinks und bewusst wiederholbare Fehler bleiben erhalten.

## Lokale Prüfung

`uv run --frozen python scripts/check.py` bestand vollständig:

- **74 Python-Fälle**: darunter echte HTTP-/FFmpeg-Grenzen mit ersetztem Modell, Update-Limit/Wiederaufnahme, metadatenbasierte Veröffentlichung, unveränderte Texte/Laufzeiten, Identität, atomarer Ausgabeschutz und ungültige Konfigurationen.
- **106 ausgeführte Browserfälle**: 49 kleine Einzelkorpus-Fälle je `/` und `/racoo/`, zusätzlich vier konfigurierte Mehr-Podcast-Fälle je Basispfad. Die vier konfigurierten Fälle werden in den Einzelkorpusläufen absichtlich übersprungen und danach separat ausgeführt.
- Ruff, Format, Web-Lint/TypeScript, struktureller Episodevertrag, Dokumentationslinks und `uv lock --check --offline` bestanden. Der aktive Lockfile enthält 38 Pakete und keine spaCy-Abhängigkeit.

Die Browserfälle decken native Wiederholungen, Flexionen, Präfixe/Komposita, Überschneidungen und Unicode, vollständige Zählungen jenseits der ersten zehn, Titel-Ausschluss, Nullfolgen, Fehler/Retry, veraltete Antworten, warme Cachewiederverwendung, Datenstandswechsel, Originaltextschutz, Minimap-/Fokusnavigation und Player/Links ab. Eine gezielt außerhalb des sichtbaren Bereichs liegende Karte wird im Test wie beim Benutzen erst in den sichtbaren Bereich gescrollt.

Zusätzlich die echten 106 Folgen neu gebaut und unter beiden Basispfaden geprüft. Zehn aus gespeicherten Transkripten bekannte Stichproben finden ihre erwartete Folge jeweils auf **Platz 1**. Fünf frühere Mehrwort-Beispiele und fünf weitere seltene Wörter sind vollständig im [Root-Nachweis](evidence/pagefind-minimap-root.json) und [Projektpfad-Nachweis](evidence/pagefind-minimap-project.json) erfasst. Diese technischen Referenzabfragen ersetzen keine unabhängige menschliche Erinnerungssuche.

## Laufzeit und Größe

Die erste Mobilmessung zeigte unnötige Metadatenabrufe und das gemeinsame Abwarten aller zehn Originaltexte. Index-/Transkriptcaches und sichtbarkeitsabhängige Karten beseitigten diese Ursachen. Endmessung: frischer Chromium-Kontext, 390×844, Pixeldichte 2, Touch emuliert, vierfache CPU-Verlangsamung im Page-Target, 150 ms RTT, 200.000 Byte/s Download und 62.500 Byte/s Upload; HTTP-Cache deaktiviert. Wiederholung derselben Anfrage erhält die Anwendungscaches.

| Messung | Root | `/racoo/` |
| --- | ---: | ---: |
| Erste Suche bis zur ersten Originalpassage | 4016 ms | 4068 ms |
| Wiederholung derselben Suche | 457 ms | 429 ms |
| Beobachtete Antwort-Bodybytes ab Navigation bis zur ersten Passage | 994,305 | 994,361 |
| Zusätzliche Bodybytes bei Wiederholung | 0 | 0 |

Die Requestgrößen stammen aus BrowserContext-Ereignissen und enthalten beobachtete Workerabrufe; native Index-/Fragment-Bodybytes sind in den JSONs separat nachgewiesen. HTTP-Header sind nicht enthalten. CDP-Seitenprofil auf einem lokalen Windows-Rechner ist kein Nachweis für jedes physische Mobilgerät, alle Worker-CPU-Eigenschaften oder eine echte Internetverbindung. Im aufgezeichneten Profil sind die bisherigen Ziele von fünf Sekunden kalt/einer Sekunde warm und zehn MB bis zum ersten Ergebnis erreicht.

Die reale UFO070-Ansicht wurde außerdem mit **drei Farben, elf Segmenten und 18 eindeutigen Fundstellen** geprüft: vertikale Karte, Pos1/Ende, Touch-Tap mit echtem Textscroll, Canvas mit doppelter Pixeldichte, kein Seitenüberlauf und kein Audiostart.

Die aktuelle Root-Veröffentlichung hat **17,206,019 Byte** statt 22.424.703 Byte vorher, rund 23.3 % weniger. Das ist die Summe roher Artefaktdateien; keine pauschale Trafficprognose. Alle 106 Transkripte sind enthalten und es gibt keine `stats/`-Artefakte. Der unveränderte Pages-Schutz für Schema 2, echten Status und positiven Bestand besteht lokal. [Zusammenfassung](evidence/pagefind-minimap-validation.json)

Die echte 600-Folgen-Leistungsabnahme bleibt bis zu einem entsprechenden unabhängigen Korpus offen. Eine menschliche Prüfung der Suchqualität und reale Geräte können die technische Abnahme ergänzen.

## Reproduzieren

Nach normalem Build und gestarteter Vorschau:

```powershell
node scripts/check_real_site.cjs http://127.0.0.1:4174/ .cache/real-site-report.json
```

Der optionale lokale Prüfer enthält bewusst Podcast-UFO-Referenzen; er läuft weder bei normalen Datenupdates noch in GitHub Actions. Für den Projektpfad vorher mit `--base /racoo/` bauen und die Vorschau mit demselben Base-Argument starten. Die tatsächlichen Daten bleiben in der normalen Root-Vorschau auf Port 4174 geöffnet. Es wurde nicht nach main gemergt oder veröffentlicht.
