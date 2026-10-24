# Review des lokalen Fünf-Folgen-Piloten

Fester Vergleichspunkt: vorheriger Arbeitsstand `05885c90772e0dc3f96203cc122cd66aba93927b`. Zwei getrennte Subagents prüften `git diff 05885c9...HEAD` bis zum integrierten Stand `906ac80`. Der anschließende Korrekturcommit `4b5bcb5` wurde als `92a9aa0` integriert.

## Standards

Zwei Befunde, beide korrigiert:

- **P2, Modellnachweis:** `scripts/check_analysis_model.py` enthielt ein beschädigtes „läuft“. Mit dem tatsächlichen festgehaltenen spaCy-Modell schlug der öffentliche Nachweis zunächst fehl (fünf Wörter, `laufen: 1`). Korrektur auf das richtige Wort ergab sechs Wörter und `laufen: 2`. Es handelte sich um falschen Textinhalt bei gültiger UTF-8-Codierung.
- **P3, Dokumentation:** `docs/analysis.md` nannte synthetische Fixtures als normalen Buildstandard. Die Beschreibung nennt jetzt die gespeicherten echten Pilotfolgen, cache-only Veröffentlichung und ausdrücklich ausgewählte Prüfdaten.

Keine weiteren wesentlichen Verstöße gegen dokumentierte Projektregeln oder zusätzliche relevante Fowler-Code-Smells. Verträge, Produzenten, Verbraucher und aktive Fixtures wurden gemeinsam geändert; normalisierte Daten und Analysen sind versioniert, Audio/Modelle/Builds bleiben außerhalb des versionierten Datensatzes. Shared Build-Eingaben vermeiden getrennte Defaults.

## Spec

Keine wesentlichen Befunde. Schema 2 mit groben Segmenten, temporäres Audio, Wiederaufnahme aus Transkripten, gespeicherte/normierte Laufzeiten, ungefährer Online-Sprung mit Werbehinweis und Standardbuild aus fünf echten lokalen FP32-Transkripten samt Analysen entsprechen dem aktuellen Umfang. Verbleibende Hashes dienen Feed-Snapshots, Abhängigkeiten oder Text-/Buildständen; sie vergleichen keine transkribierte MP3 mit späterem Online-Audio.

## Abschließende Nachweise

Der vollständige Offline-Check bestand mit 68 Pythonfällen und je 37 Chromiumfällen an beiden Basispfaden. Die beiden kleinen Reviewkorrekturen bestanden zusätzlich gezieltes Ruff/Format, Dokumentationslinks und den [echten Modellnachweis](evidence/spacy-model-smoke.json). Anschließend bestanden alle zehn echten technischen Suchfälle pro Pfad samt Statistik und Mobilansicht. Die [Pilotdokumentation](local-five-episode-pilot.md) benennt die Grenzen der unabhängigen Qualitätsprüfung und die noch nicht erreichte Ein-Sekunden-Mobilvorgabe ausdrücklich.
