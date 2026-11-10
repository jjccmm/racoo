# Transkriptbasierte Pipeline und Veröffentlichung

Status: resolved
Blocked by: 01

## Acceptance criteria

- [x] Update/prepare-site/publish benötigen keine Analyse oder Sprachmodelle; ASR-Log und Wiederaufnahme erhalten.
- [x] Kompakter Metadatenkatalog mit Dauer/Laufzeiten, Suchregeln und versionierter Bindung an Index/Publikation.
- [x] Kein Vokabular/Zählshards im Build; spaCy-Code, Analysen und Abhängigkeiten nach erfolgreichem Nachweis entfernen.
- [x] Python-Verträge, Fixturegenerator und sinnvolle Pipeline-/Publikationstests gemeinsam aktualisieren.

## Comments

- 2026-11-10: Aus dem bestätigten Pagefind-/Minimap-Plan erstellt.

- 2026-11-10: Transkriptbasierter echter 106er-Build erfolgreich (17,2 MB), 30 gezielte Python-Fälle bestanden. Freitext/Minimap mit echtem UFO070 auf Desktop und 390 px geprüft; 45 Browserfälle im ersten Durchlauf bestanden, zwei überholte Fixture-Erwartungen werden im Integrationsticket berichtigt.
