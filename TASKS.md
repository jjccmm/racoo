# Nächste Arbeiten

Die Reihenfolge setzt [PLAN.md](PLAN.md) um. Ein Haken bedeutet einen erbrachten Nachweis; ein vorhandener Entwurf allein genügt nicht.

Der [Fünf-Folgen-Pilot](.scratch/podcast-words-pilot/spec.md) ist als `ready-for-agent` spezifiziert; die beiden öffentlichen Testgrenzen sind bestätigt. Die [18 Einzeltickets](.scratch/podcast-words-pilot/ticket-index.md) enthalten die bestätigten Arbeitspakete und Abhängigkeiten. Der aktuelle Ausführungsstand steht jeweils im Ticket.

## Workspace

- [x] Python-CLI, Episodenvalidator, gesperrte Abhängigkeiten und gezielte Offline-Prüfungen lokal nachweisen.
- [x] React/TypeScript/Vite-Entwicklungsstart sowie Produktionsbuild am Root- und Projektpfad nachweisen.
- [x] Colab-Einstieg, Windows/Linux-CI und Agentdokumentation mit tatsächlich geprüften Befehlen hinterlegen. Gehosteter CI-Lauf und echte Colab-Ausführung stehen weiterhin aus.

## Erste Funktionsnachweise

- [ ] **Audio und ASR:** CPU-Installation unter Windows sowie GPU-Installation unter Colab gegen konkrete Paketstände und Modellrevision prüfen. Eine vollständige Folge mit mehreren Pausen verarbeiten; native Tokenpunkte korrekt auf Episodenzeit bringen. Ergebnisse und Kosten in Laufzeit dokumentieren. Audio und Modellgewichte bleiben untracked.
- [ ] **Suchvertrag:** Mit einem kleinen echten Pagefind-Index die Zuordnung Such-ID → Episoden-ID/Datum, die 3/3-vor-2/3-Rangfolge, Wortformen, Positionen mehrerer Abfragen und Segmentanker nachweisen, ohne alle Fragmente nachzuladen.
- [x] **Katalog:** RSS-Snapshot und dauerhafte IDs/Quellenaliase implementieren. Sondertitel erhalten; Folge 37 gezielt prüfen und offene Quellenlücken getrennt von Verarbeitungsfehlern ausweisen.

## Durchgängiger Pilot

- [ ] Fünf repräsentative Folgen auswählen, Auswahl begründen und vollständig verarbeiten. Start/Wiederaufnahme und die konfliktbewusste Übernahme von Colab-Ergebnissen implementieren.
- [ ] spaCy-Analyse, Statistikartefakte und einen gemeinsamen Veröffentlichungsstand implementieren.
- [ ] Suche, Fundstellen, Player und teilbare Links implementieren; danach Diagramme und Gesamtstatistiken.
- [ ] Zehn manuell geprüfte Passagensuchen und je drei Referenzzeitmarken pro Folge dokumentieren; die bestätigten Qualitätsgrenzen erfüllen.
- [ ] Mobiles Messprofil festhalten und die bestätigten Zeit-/Übertragungsgrenzen sowie einen Pages-Projektpfad-Build prüfen.

Erst nach bestandener Pilotabnahme den gesamten verfügbaren Bestand verarbeiten. Archivabnahme und öffentliche Bereitstellung folgen den weiteren Etappen im Plan.
