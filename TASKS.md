# Nächste Arbeiten

Die Reihenfolge setzt [PLAN.md](PLAN.md) um. Seit 24.10.2026 ist ausschließlich **lokales FP32 auf GPU** freigegeben. Planungswert etwa **25× Echtzeit**. Der [Untersuchungsbericht](docs/research/asr-investigation.md) dokumentiert alle früheren Laufwege, die vollständige lokale Messung und die Nutzerabnahme der Textqualität.

- [x] Vollständige UFO537-Folge mit lokaler GPU/FP32 verarbeiten: 147,562 Sekunden Erkennung, 161,007 Sekunden gesamter Worker bei 72:26,49 Minuten Audio.
- [x] Nutzerprüfung: Text passt zur lokalen Referenzdatei, Qualität ausreichend.
- [x] Ursache des abweichenden Online-Audios reproduzieren: clientabhängige Acast-Werbefassungen. Inhaltshash-Referenzen erhalten und abweichende Wiedergabezeitachsen erkennen.
- [x] Aktive Verarbeitung auf FP32/GPU vereinfachen; Notebooks, Ergebnisimport, Vergleichs-/Profilauswertung und INT8-Laufwege entfernen. Hintergrundwissen bleibt in der Dokumentation.
- [x] Lokale Pipeline, Datenvalidierung, Katalog, statische Suche/Statistik und Builds an beiden Basispfaden implementieren.

## Verbleibender Pilot

Die [Ticketübersicht](.scratch/podcast-words-pilot/ticket-index.md) beschreibt die weiteren Arbeiten. Die Nutzerabnahme der einzelnen Transkriptqualität ersetzt nicht die formalen Such-/Zeitmarken- und Mobilprüfungen.

- [ ] Fünf repräsentative Folgen lokal mit derselben FP32-Konfiguration verarbeiten und Wiederaufnahme prüfen.
- [ ] Je drei Referenzzeitmarken pro Folge und zehn manuell geprüfte Passagensuchen dokumentieren; veröffentlichte Audiofassungen korrekt kennzeichnen.
- [ ] Analysen und Suchindex für den gewählten echten Pilotbestand gemeinsam bauen.
- [ ] Mobiles Messprofil und Laufzeit-/Übertragungsgrenzen prüfen; Pages-Projektpfad-Build und Veröffentlichung gesondert abnehmen.

Erst nach bestandener Pilotabnahme den gesamten verfügbaren Bestand verarbeiten. Historische CPU-Ergebnisse bleiben als Daten erhalten und werden für den neuen FP32-Bestand ausdrücklich neu verarbeitet.
