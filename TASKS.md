# Nächste Arbeiten

Die Reihenfolge setzt [PLAN.md](PLAN.md) um. Ein Haken bedeutet einen erbrachten Nachweis; ein vorhandener Entwurf allein genügt nicht.

Der [Fünf-Folgen-Pilot](.scratch/podcast-words-pilot/spec.md) wartet als `ready-for-human` auf den echten Colab-/Drive-Nachweis und die unabhängigen Pilotreferenzen; die beiden öffentlichen Testgrenzen sind bestätigt. Die [Ticketübersicht](.scratch/podcast-words-pilot/ticket-index.md) enthält die 18 bestätigten Pilotarbeitspakete und die ergänzende Laufzeituntersuchung in Ticket 19. Der aktuelle Ausführungsstand und die Abhängigkeiten stehen jeweils im Ticket.

Für [Ticket 19](.scratch/podcast-words-pilot/issues/19-investigate-colab-gpu-runtime.md) liegt jetzt die [Auswertung des neuen Colab-Benchmarks](docs/research/colab-gpu-runtime-analysis.md) vor: Die Erkennung dominiert, teure INT8-Operationen laufen im Teilprofil auf der CPU neben aktiver CUDA-Ausführung. Das neue [Diagnose-Notebook](notebooks/colab_diagnostics.ipynb) führt als nächsten begrenzten Versuch einen festen kurzen Audioabschnitt durch INT8 und unquantisiertes FP32 auf derselben GPU, ergänzt um eine CPU-Kontrolle und optionale Einzeltests. Die kurze Diagnosemessung zeigt für identisches Audio auf derselben Colab-VM 50,669 Sekunden mit INT8/CUDA gegenüber 54,976 Sekunden mit INT8/CPU. FP32 scheiterte am externen Gewichtsdateipfad im Hub-Cache; der Helfer lädt FP32 jetzt in einen normalen lokalen Ordner. Nächster Schritt ist eine neue Messreihe mit dem korrigierten Helfer, um FP32 auf Colab tatsächlich zu messen. Die historische Windows-CPU-Referenz verwendet weiterhin andere Audio-Bytes; die kontrollierte Bestätigung der Beschleunigungsursache bleibt offen. Das Ticket ist `ready-for-human`.

## Workspace

- [x] Python-CLI, Episodenvalidator, gesperrte Abhängigkeiten und gezielte Offline-Prüfungen lokal nachweisen.
- [x] React/TypeScript/Vite-Entwicklungsstart sowie Produktionsbuild am Root- und Projektpfad nachweisen.
- [x] Colab-Einstieg, Windows/Linux-CI und Agentdokumentation mit tatsächlich geprüften Befehlen hinterlegen. Gehosteter CI-Lauf und echte Colab-Ausführung stehen weiterhin aus.

## Erste Funktionsnachweise

- [ ] **Audio und ASR:** CPU-Installation unter Windows sowie GPU-Installation unter Colab gegen konkrete Paketstände und Modellrevision prüfen. Eine vollständige Folge mit mehreren Pausen verarbeiten; native Tokenpunkte korrekt auf Episodenzeit bringen. Ergebnisse und Kosten in Laufzeit dokumentieren. Audio und Modellgewichte bleiben untracked.
- [x] **Suchvertrag:** Mit einem kleinen echten Pagefind-Index die Zuordnung Such-ID → Episoden-ID/Datum, die 3/3-vor-2/3-Rangfolge, Wortformen, Positionen mehrerer Abfragen und Segmentanker nachweisen, ohne alle Fragmente nachzuladen.
- [x] **Katalog:** RSS-Snapshot und dauerhafte IDs/Quellenaliase implementieren. Sondertitel erhalten; Folge 37 gezielt prüfen und offene Quellenlücken getrennt von Verarbeitungsfehlern ausweisen.

## Durchgängiger Pilot

- [ ] Fünf repräsentative Folgen auswählen, Auswahl begründen und vollständig verarbeiten. Start/Wiederaufnahme und die konfliktbewusste Übernahme von Colab-Ergebnissen implementieren.
- [x] spaCy-Analyse, Statistikartefakte und einen gemeinsamen Veröffentlichungsstand implementieren und mit kontrollierten Daten prüfen. Die echte Fünf-Folgen-Veröffentlichung bleibt ausstehend.
- [x] Suche, Fundstellen, Player, teilbare Links, Diagramme und Gesamtstatistiken als statische Site verbinden und mit synthetischen Prüfdaten am Root- und Projektpfad im Browser prüfen.
- [ ] Zehn manuell geprüfte Passagensuchen und je drei Referenzzeitmarken pro Folge dokumentieren; die bestätigten Qualitätsgrenzen erfüllen.
- [ ] Mobiles Messprofil festhalten und die bestätigten Zeit-/Übertragungsgrenzen sowie einen Pages-Projektpfad-Build prüfen.

Erst nach bestandener Pilotabnahme den gesamten verfügbaren Bestand verarbeiten. Archivabnahme und öffentliche Bereitstellung folgen den weiteren Etappen im Plan.
