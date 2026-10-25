# Nächste Arbeiten

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
