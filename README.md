# Racoo

**Die Podcast Wort Suche** – statische Podcast-Suche und Wortstatistik, zunächst für **DAS PODCAST UFO**. Alle Folgen werden mit **Parakeet-TDT-0.6B-v3** neu transkribiert. Die Verarbeitung läuft lokal mit FP32 auf der GPU (Planungswert etwa 25× Echtzeit); die Webseite ist statisch für GitHub Pages geeignet. Der aktuelle Datenbestand umfasst fünf vollständig verarbeitete Folgen. Der einzige GitHub-Workflow baut und veröffentlicht gespeicherte Daten nach einem Merge/Push auf `main`.

- [Podcasts aktualisieren](docs/updates.md): ein lokaler Befehl mit Limit, weitere Podcasts und automatische Veröffentlichungsauswahl.
- [GitHub Pages einrichten](docs/github-pages.md): Racoo-Repository, Veröffentlichung und einmalige Einstellungen.
- [Projektplan](PLAN.md): Entscheidungen, Datenfluss, Umsetzung und Abnahme.
- [Recherche zu Feed und Suche](docs/research/v3-feed-and-search.md): geprüfte Quellen und technische Grenzen, Stand 16. Oktober 2026.
- [Fachbegriffe](GLOSSARY.md): gemeinsame Sprache für Suche, Transkripte und Statistik.
- [Planverfeinerung](docs/planning/refinement.md): abgeschlossene Interviewentscheidungen.
- [Einrichtungsumfang](docs/planning/workspace-setup.md): konkret vorgesehene Starterpakete und Fertigkriterien.
- [Entwicklungsumgebung](docs/development.md): Einrichtung und Besonderheiten des Windows-Arbeitsplatzes.
- [Runtime und Suchverträge](docs/research/runtime-and-search-contracts.md): Quellenprüfung für die ersten Funktionsnachweise.
- [Nächste Aufgaben](TASKS.md): Umsetzungsreihenfolge und noch ausstehende Nachweise.

Der lokale Pilot enthält fünf echte, frisch mit FP32/GPU verarbeitete Folgen samt spaCy-Wortanalysen. Der normale Build verwendet alle vollständig gespeicherten Folgen aus der Podcastkonfiguration und lädt weder Audio noch Modelle:

```powershell
npm.cmd --prefix web run build
npm.cmd --prefix web run preview -- --port 4173 --strictPort
```

Öffnen: <http://127.0.0.1:4173/>. Der interaktive Einstieg erklärt die Idee mit farbigen Wortchips: Im kleinen Beispieltext etwa „Folge“ ergänzen und passende Formen hervorheben. Danach den Podcast mit Cover und Sprechern auswählen. Die Suchansicht startet mit „haus“ als ausgewähltem Wort und ist auch direkt unter `?podcast=podcast-ufo` erreichbar: Bis zu fünf Grundformen im Autocomplete wählen, ihre absoluten Vorkommen als gestapelte Balken vergleichen und in den zehn Folgen mit der höchsten Summe markierte Originalpassagen anhören. „Top 10“ sortiert nach Summe, „Alle“ zeigt sämtliche Folgen chronologisch einschließlich Nullen. Pro Folge sind zunächst zwei kurze Originalpassagen sichtbar; weitere Stellen und vollständige Segmente sind aufklappbar. Gesamtzahlen und gemessene Verarbeitungszeiten stehen in den aufklappbaren Abschnitten darunter. Grobe Segmente ersetzen Wortzeitstempel. Der gemeinsame Hinweis bei den Fundstellen erklärt die mögliche Verschiebung durch Werbung. Audio wird nach der Transkription gelöscht.

- [Designrecherche](docs/research/minimal-podcast-design.md): Primärquellen, Farbpalette und kompakte Fundstellen.
- [Fünf-Folgen-Pilot](docs/pilot/local-five-episode-pilot.md): Auswahl, Befehle, tatsächliche Laufzeiten und Grenzen der Prüfung.
- [Lokale FP32-Verarbeitung](docs/asr.md): GPU-Einrichtung, temporäres Audio, Wiederaufnahme und Messgrenzen.
- [ASR-Untersuchung und Laufzeitvergleich](docs/research/asr-investigation.md): historische CPU-/Colab-Ergebnisse und Hinweise zu FP32 auf Colab.

Routinechecks wählen ausdrücklich synthetische Fixtures und benötigen keine GPU oder Modelle. Die Textqualität von UFO537 wurde vom Nutzer als ausreichend bestätigt; technische Suchchecks aus dem Transkript ersetzen keine unabhängige menschliche Suchqualitätsabnahme. Die Freigabe zur Verarbeitung des gesamten Archivs bleibt eine gesonderte Entscheidung.
