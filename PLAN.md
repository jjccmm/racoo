# Racoo – Projektplan

Stand: 10. November 2026. Der Nutzer hat den [Pagefind-/Minimap-Plan](docs/planning/pagefind-and-minimap.md) zur Umsetzung bestätigt. Die [Tickets](.scratch/pagefind-minimap/spec.md) führen den aktuellen Umfang; frühere Pilotberichte bleiben historische Nachweise.

## Ziel und Architektur

Podcastfolgen anhand erinnerter Stichwörter wiederfinden. Zunächst DAS PODCAST UFO; Hobbybetrieb mit ungefähr zehn Besuchern pro Tag, später weitere Podcasts. Lokal verarbeiten und statisch auf GitHub Pages veröffentlichen: Python, Parakeet-TDT-0.6B-v3 FP32/CUDA, versionierte Episoden-JSONs, React/TypeScript/Vite, Recharts und Pagefind 1.5.2.

```text
Offizieller RSS-Feed → Katalog + direkte Audio-URLs
→ fehlende Folgen mit Limit lokal herunterladen/transkribieren
→ validierte Episoden-JSONs mit Originaltext, Segmentzeiten und Laufzeiten
→ statischer Build: Folgenmetadaten + Pagefind-Index je Podcast
→ GitHub Pages → Freitext → Suchwort-Treffer → Diagramm + Originaltexte + Minimap
```

Die Browseranfrage verwendet ausschließlich statische Dateien. Es gibt keine laufende Datenbank oder eigene API. Der lokale Update-Befehl benötigt kein zusätzliches NLP-Modell. Die frühere spaCy-Grundformstatistik samt Vokabular/Zählpaketen ist durch die gemeinsame Pagefind-Suchzählung ersetzt.

## Feed, Identität und Verarbeitung

Die Konfiguration [`podcasts.json`](podcasts.json) nennt Podcast-ID, Name, Sprecher, Cover, Feed und getrennten Datenordner. Standardfeed ist `https://feeds.acast.com/public/shows/podcast-ufo`; die [Quellenprüfung](docs/research/v3-feed-and-search.md) dokumentiert ihn. Alle Feed-Einträge einschließlich Sonderfolgen ohne UFO-Präfix erhalten. Ein fehlender Eintrag allein löscht keine gespeicherte Folge. Fehlende Quellen und verfügbare, aber unverarbeitete Folgen unterscheiden.

Folgenidentitäten bleiben unabhängig von Titel, Nummer, Audio-URL und neuen GUID-Aliasen stabil; siehe [ADR 0001](docs/adr/0001-stabile-folgenidentitaet.md). Folge 37 ist historisch ergänzt, aber mangels bestätigtem Datum im normalen Update nicht verarbeitbar. Keine Angaben erfinden. Zähler und Datum beziehen sich auf den gespeicherten Katalog beziehungsweise den letzten erfolgreichen Feedimport.

Ein lokales `update --podcast <id> --limit N` importiert den Feed, wählt höchstens N fehlende verarbeitbare Folgen (älteste zuerst, optional neueste) und verarbeitet einen Batch mit einmaligem Modellsetup. Das Limit zählt Versuche. Fertige gültige Transkripte überspringen; passende vorhandene Dateien können unterbrochene Katalogzustände reparieren. Teilergebnisse erhalten und Fehler erneut ausführbar machen.

Das unterstützte ASR läuft auf Windows/GTX 1050 Ti mit Parakeet FP32, ONNX Runtime GPU 1.20.1 als CUDA-11-Build, CUDA 11.8/cuDNN 8.6 und Python 3.12. Etwa 25× Echtzeit bleibt der Planungswert. Die [ASR-Untersuchung](docs/research/asr-investigation.md) bewahrt CPU-/Colab-Vergleiche; der aktive Code verwendet nur lokales FP32.

Audio einmal je Verarbeitungsversuch laden, decodieren, mit VAD verarbeiten und nach Erfolg oder Fehler löschen. Das gespeicherte Transkript ist die Datenbasis; kein späterer Abgleich gegen veränderte Online-MP3s. Grobe chronologische Segmente mit höchstens 300 Sekunden enthalten Originaltext, ID, Start und Ende. Keine Wortzeitstempel. Download-, Transkriptions- und Gesamtzeit speichern und in lokalen Logs/Berichten ausweisen; Setup separat, zusätzlich Sekunden je Audiominute.

## Gemeinsame Such- und Zählsemantik

Ein Dokument pro vollständiger Folge, ausschließlich Segmenttext mit Segmentankern; Metadaten dürfen keine gesprochenen Treffer erzeugen. Pagefind indexiert beim Build. Jeder akzeptierte Begriff wird unabhängig gesucht; alle Rohresultate vor Seitenauswahl und Detailabruf auswerten. Die Mehrwortvereinigung enthält auch Folgen mit Teilabdeckung.

Eine Serie zählt unterschiedliche Pagefind-Positionen für ein Stichwort je Folge. Groß-/Kleinschreibung und identische Eingaben deduplizieren. Wortformen und Wortanfänge können passen; das ist keine genaue Lemma-, Synonym- oder Bedeutungssuche. Zitat-/Operator-Syntax ist nicht Teil der Freitexteingabe. [Recherche und Versionsgrenzen](docs/research/pagefind-counting-2026-11-10.md)

Die Stapelhöhe ist die Summe aller Suchwort-/Positionspaare. Überlappende Begriffe können dieselbe Textposition mehrfach zur Summe beitragen. Der Leser markiert und navigiert die Vereinigung dieser Positionen als eindeutige Fundstellen. Originaltexte unverändert und sicher als Text rendern. Die Zuordnung zum Original muss bei nicht passenden Ankern/Tokenständen einen Fehler anzeigen.

Alle eingegebenen Wörter durchsuchen, einschließlich häufiger Funktionswörter. Keine aktiven Stoppwort-/Zusatzlisten. Die Begriffe sind normalisierte Schreibweisen, keine automatisch erkannten Lemmata. Häufige Wörter können die absolute Trefferrangfolge dominieren. Index und Metadaten gehören zu derselben versionierten Veröffentlichung. Erfolgreich nicht gefundene Kombinationen sind null, Ladefehler niemals.

## Oberfläche

Die Startseite zeigt das große zentrierte Racoo-Logo und ein bearbeitbares Suchfeld mit `Die Podcast Wort Suche`. Der Erklärungstext markiert lokal passende Wörter; keine Podcastdaten für die Demo laden. Eine bearbeitete Eingabe wird beim Auswählen eines Podcasts als `q` übernommen. Der unveränderte Demostartwert ist keine echte Suche. Podcastkarten zeigen Cover, Sprecher und `106/542 Folgen durchsuchbar (Stand 8.11.2026)` als dynamisches Format.

Die Podcastansicht verwendet ein breites Freitextfeld ohne Dropdown oder Pflichtchips. Bis zehn unterschiedliche Stichwörter, Grenzhinweis erst bei Überschreitung; Enter/Suchknopf startet. DAS PODCAST UFO startet beim normalen Einstieg mit Eimer; Suchlinks und bewusst leere Eingaben haben Vorrang. Farben bleiben für Diagramm, Karten und Leser gleich.

Das absolute gestapelte Diagramm bleibt zentral: Top 10 nach Summe absteigend, Gleichstände nach Datum absteigend/ID; Alle chronologisch nach Datum/ID einschließlich Nullfolgen. Das Diagramm passt ohne horizontales Scrollen in die verfügbare Breite; Balken werden bei vielen Folgen dünn, mit kleinem Abstand; Achsentitel werden passend zur Breite ausgedünnt, bleiben auch in Alle sichtbar. Die zehn Ergebnisfolgen integrieren alle Angaben direkt in offene Transkriptkarten. Nur für diese Folgen Details laden. Eine erfolgreiche Suchinstanz pro aktivem Datenstand wiederverwenden und nach Fehlern bewusst neu starten. Veraltete Antworten dürfen eine neue Anfrage nicht ersetzen.

Jede geladene Folge zeigt ihren vollständigen chronologischen Leser direkt offen und springt zur frühesten chronologischen Fundstelle über alle Suchwörter, auch nach erweiterten Suchen mit gecachtem Transkript. Rechts eine helle vertikale Minimap mit grauen Textlinien, farbigen Treffern im Miniaturtext und Leserahmen ohne zusätzliche rechte Farbspuren oder Übersicht-/Ende-Texte; mobil als schmale vertikale Leiste. Klick/Ziehen, Tastatur, vorherige/nächste Fundstelle, Fokus und Bewegungsreduktion unterstützen. Text bleibt auswählbar. Mehrere geladene Karten bleiben offen; automatisches Scrollen ändert nur das jeweilige Textfenster und übernimmt nicht den Seitenfokus.

Die Zeitknöpfe im Text starten am Beginn ihres Abschnitts; der Header-Iconknopf spielt die Folge ab 0:00. Der Nutzerbegriff „Segment“ entfällt. Textfenster nach der ersten Verkleinerung nochmals 15 Prozent niedriger, Text links mit zustandsabhängigem Rand-Fade, Navigation nahe den Zählungen neben der Wortlegende. Weiße Minimap und gleiche leichte Schatten auf Karten, Diagramm und Podcastauswahl. Ein schließbarer gemeinsamer Player zeigt Titel, Werbehinweis und native Audioleiste. Zusätzliche Vor-/Zurück-/Teilen-Knöpfe entfallen; bestehende `?episode=…&t=…`-Links funktionieren ohne Autoplay weiter. Die Minimap navigiert ausschließlich Text und erfindet keine genaue Audiozeit.

## Speicherung, Build und Abnahme

Je Podcast `catalog.json`, `snapshots/`, `episodes/`; Transkripte und Katalog versionieren. Modelle, Audio, Caches und generierte Builds bleiben untracked. Der Build validiert alle gespeicherten fertigen Folgen und erzeugt getrennte statische Veröffentlichungen; weitere Podcasts erscheinen durch Konfiguration ohne besonderen React-Code. [Verträge](docs/data-contracts.md), [Betrieb](docs/updates.md)

Tests laufen lokal mit kleinen Fixtures ohne GPU-/Modelldownload. `scripts/check.py` prüft Python, Format/Lint, Verträge, Links und Browser an `/` und `/racoo/`, zusätzlich mehrere/leer konfigurierte Podcasts. GitHub Actions baut und veröffentlicht ausschließlich gespeicherte Daten bei einem Push/Merge auf main. Das Öffnen eines PR deployt nicht. [Pages](docs/github-pages.md)

Echte Bestände ergänzen die Fixtures: alle 106 Folgen erhalten, bekannte Suchfälle/Originalmarkierungen, Desktop/320/390 px, Zoom, Kalt-/Warmlatenz, Bytes und Cachezustand messen. Ziel auf dokumentiertem Mobilprofil: erste Ergebnisse unter fünf Sekunden, warme Suche unter einer Sekunde, bis zum ersten Ergebnis höchstens 10 MB. Kein vollständiges Transkriptarchiv vor der ersten Suche laden. Die 600-Folgen-Abnahme bleibt bis zum echten entsprechenden Korpus offen. Technische Suchabfragen aus dem Transkript sind keine unabhängige menschliche Qualitätsbewertung.

Der Build behält die bestehende Größenwarnung bei 800 MB und die harte Artefaktgrenze von 1 GB. Früher dokumentierte alphabetische Vokabulardateien oder nach Worthäufigkeit sortierte Zähldateien gehören zur abgelösten Statistikarchitektur und werden nicht mehr umgesetzt. Weitere Optimierung erst anhand gemessener Suchindex-/Browserkosten.


Die [weitere UI-Verfeinerung](.scratch/pagefind-minimap/issues/08-themes-sliding-toggle-faq.md) umfasst einen gespeicherten Hell-/Dunkelmodus, gleitenden Top10-/Alle-Kapselschalter und eine zunächst geschlossene FAQ unter der Podcastliste. Keine Änderung an Suchzahlen oder Verarbeitung.
