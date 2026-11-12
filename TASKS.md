# Aktuell

- [x] [Früheste Fundstelle und ruhiger Transkriptleser](.scratch/pagefind-minimap/issues/07-earliest-hit-reader-polish.md): `47d8373`, [Abnahme](docs/pilot/earliest-hit-reader-polish.md).

- [x] [Kompakte Karten und ungefilterte Zehnwortsuche](.scratch/pagefind-minimap/issues/06-compact-cards-unfiltered-search.md): `d4b7994`, [Abnahme](docs/pilot/compact-cards-unfiltered-search.md).

- [x] [Offene Transkriptkarten, Player und flexible Diagramme](.scratch/pagefind-minimap/issues/05-open-transcript-cards.md): `406aa04`, [Abnahme](docs/pilot/open-transcript-cards.md).

- [x] [Pagefind-Freitextsuche und helle Minimap](.scratch/pagefind-minimap/spec.md): [vier Tickets](.scratch/pagefind-minimap/ticket-index.md), Integration auf `feature/pagefind-minimap`; [Abnahme](docs/pilot/pagefind-minimap.md).

## Frühere Arbeiten

- [x] [Echter Update-Lauf mit Limit 1](docs/pilot/update-limit-one.md): UFO002 lokal mit FP32/GPU verarbeitet, genau eine neue Analyse, bisherige fünf Datensätze erhalten und Sechserbuild/Suche geprüft.

Abgeschlossen auf `feature/podcast-updates`: [Lokale Aktualisierung und mehrere Podcasts](.scratch/podcast-updates/spec.md), mit [den Tickets](.scratch/podcast-updates/ticket-index.md). [Abschluss und Prüfungen](docs/pilot/podcast-updates.md). Tests lokal, GitHub nur Veröffentlichung.

- [x] [Vollton-Wörter und haus-Vorbelegung](.scratch/solid-search-design/spec.md): kontrastreiche Chips, getönter Hintergrund, weniger Linien, erkennbare Suchfelder und Diagramm ohne Datentabelle. [Abschluss und Prüfung](docs/pilot/solid-search-design.md).

- [x] [Interaktiver Racoo-Einstieg](.scratch/interactive-landing/spec.md): großes zentriertes Logo, ausgewählte Wortchips und mitmarkierender Beispieltext. Der [Abschlussbericht](docs/pilot/interactive-landing.md) enthält Bedienung und Prüfnachweise.

Aktuell: [minimalistische Podcast-Auswahl und Suchansicht](.scratch/minimal-podcast-design/spec.md), mit [Gestaltungsticket](.scratch/minimal-podcast-design/issues/01-minimal-design.md) und [belegter Designrecherche](docs/research/minimal-podcast-design.md). Der [Abschlussbericht](docs/pilot/minimal-design.md) enthält die Bedienung und geprüften Grenzen.

- [x] Startseite mit genauer Überschrift, Podcast-Cover und Sprechern; kompakter Suchkontext und Navigation.
- [x] Neutrales Layout, moderne Wortfarben und kompakte Originalfundstellen; Verhalten und reale Mobil-/Desktop-Ansichten prüfen.

Aktuell: [Wortsuche mit zentralem Stapelbalkendiagramm](.scratch/word-explorer/spec.md), als [abgeschlossenes Ticket](.scratch/word-explorer/issues/01-word-explorer.md). Der [Abschlussbericht](docs/pilot/word-explorer.md) enthält Bedienung, Prüfungen und verbleibende Archiventscheidungen.

- [x] Ein Suchfeld mit Dropdown und Wortchips, absolute gestapelte Folgenzahlen und Top-10-/Alle-Umschaltung.
- [x] Top-Folgen mit Einzelzählungen, farbigen Fundstellen und gemeinsamem Player; echte Fünferdaten und beide Basispfade prüfen.

Aktuell: [kompakte und gefilterte Wortstatistik](.scratch/compact-filtered-statistics/spec.md), mit [zwei abgeschlossenen Umsetzungstickets](.scratch/compact-filtered-statistics/ticket-index.md). Der [Abschlussbericht](docs/pilot/compact-filtered-statistics.md) enthält Größen, echte Browserbefunde und Prüfungen. Alphabetische Wortlisten und nach Worthäufigkeit sortierte Dateien bleiben dokumentierte Optionen für später nachgewiesene Leistungsprobleme.

- [x] Kompakte Folgenindex-/Anzahlpaare durch Export, Build und Browser führen.
- [x] Stoppwörter und eine gepflegte Zusatzliste aus Häufigkeitsdaten ausschließen; Hinweis anzeigen und den echten Fünferbuild prüfen.

Aktueller Umfang: [lokaler Fünf-Folgen-Pilot](.scratch/local-five-episode-pilot/spec.md), aufgeteilt in [vier Tickets](.scratch/local-five-episode-pilot/ticket-index.md). Die frühere sekundengenaue Zeitmarken-/Audiohash-Abnahme ist durch den ausdrücklichen Nutzerwunsch ersetzt. Archivverarbeitung und öffentliche Veröffentlichung bleiben spätere Schritte.

- [x] Lokales FP32/GPU als einzigen aktiven ASR-Laufweg festlegen; etwa 25× Echtzeit als Planungswert. Die [Untersuchung](docs/research/asr-investigation.md) bewahrt CPU-/Colab-Messwerte und Hinweise zu FP32 auf Colab.
- [x] Vorherigen Arbeitsstand als `05885c9` committen und den neuen Umfang mit `/to-tickets` festhalten.
- [x] Kompakte Schema-v2-Transkripte, temporäres Audio und normierte Laufzeiten implementieren.
- [x] Oberfläche auf Segmentanfänge mit Werbehinweis und Folgenübersicht mit Laufzeiten umstellen.
- [x] Fünf echte Folgen neu mit derselben lokalen FP32-Konfiguration verarbeiten, analysieren und zum Standard des lokalen Builds machen.
- [x] Wiederaufnahme, Suche, Statistik und Mobil-/Projektpfad prüfen; Review und sauberen Commitstand herstellen.

Die Textqualität des historischen UFO537-FP32-Laufs ist vom Nutzer als ausreichend bestätigt. Technische Prüfungen mit Abfragen aus dem Transkript sind keine unabhängige menschliche Qualitätsprüfung. Vor der gesamten Archivverarbeitung den Suchqualitätsbefund gesondert bewerten.

Der [Pilotbericht](docs/pilot/local-five-episode-pilot.md) enthält echte Messwerte, Browserbefunde und die verbleibende Mobil-Laufzeitgrenze. Nächste gesonderte Entscheidungen: unabhängige Suchqualitätsbewertung, Archivumfang und öffentliche Veröffentlichung.
