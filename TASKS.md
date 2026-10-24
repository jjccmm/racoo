# Nächste Arbeiten

Aktueller Umfang: [lokaler Fünf-Folgen-Pilot](.scratch/local-five-episode-pilot/spec.md), aufgeteilt in [vier Tickets](.scratch/local-five-episode-pilot/ticket-index.md). Die frühere sekundengenaue Zeitmarken-/Audiohash-Abnahme ist durch den ausdrücklichen Nutzerwunsch ersetzt. Archivverarbeitung und öffentliche Veröffentlichung bleiben spätere Schritte.

- [x] Lokales FP32/GPU als einzigen aktiven ASR-Laufweg festlegen; etwa 25× Echtzeit als Planungswert. Die [Untersuchung](docs/research/asr-investigation.md) bewahrt CPU-/Colab-Messwerte und Hinweise zu FP32 auf Colab.
- [x] Vorherigen Arbeitsstand als `05885c9` committen und den neuen Umfang mit `/to-tickets` festhalten.
- [ ] Kompakte Schema-v2-Transkripte, temporäres Audio und normierte Laufzeiten implementieren.
- [ ] Oberfläche auf Segmentanfänge mit Werbehinweis und Folgenübersicht mit Laufzeiten umstellen.
- [ ] Fünf echte Folgen neu mit derselben lokalen FP32-Konfiguration verarbeiten, analysieren und zum Standard des lokalen Builds machen.
- [ ] Wiederaufnahme, Suche, Statistik und Mobil-/Projektpfad prüfen; Review und sauberen Commitstand herstellen.

Die Textqualität des historischen UFO537-FP32-Laufs ist vom Nutzer als ausreichend bestätigt. Technische Prüfungen mit Abfragen aus dem Transkript sind keine unabhängige menschliche Qualitätsprüfung. Vor der gesamten Archivverarbeitung den Suchqualitätsbefund gesondert bewerten.
