# Konkreter Umfang der Workspace-Einrichtung

Dieser Umfang wurde zusammen mit dem verfeinerten Projektplan ausdrücklich bestätigt. Die ausgeführten Befehle und Prüfungen stehen in `docs/development.md`; spätere Produktetappen stehen in `PLAN.md` und `TASKS.md`.

## Struktur und Werkzeuge

- Ein Python-Projekt am Repositoryroot mit `pyproject.toml`, `uv.lock`, `.python-version`, einem installierbaren Paket unter `src/podcast_words/` und kleinen Offline-Prüfdaten.
- Ein Web-Paket unter `web/` mit React, TypeScript, Vite und npm-Lockfile. Recharts und Pagefind gehören zur geplanten Anwendung; ihre Integration wird mit dem ersten entsprechenden Funktionsnachweis geprüft.
- Ein dünner Colab-Einstieg unter `notebooks/`, der dasselbe Python-Paket verwendet. Reale GPU-Verfügbarkeit und Modelllauf werden erst im nachfolgenden Integrationsschritt nachgewiesen.
- Ein lokal initialisiertes Git-Repository mit Standardbranch `main`. Ein Remote oder eine öffentliche Veröffentlichung ist kein Bestandteil dieser Einrichtung.
- Die vorhandenen Agentanweisungen sowie Editor-, Ignore- und Zeilenendenregeln werden auf die tatsächlich eingerichteten Pakete abgestimmt.

## Lauffähiger Anfang

Das Python-Paket erhält einen ausführbaren CLI-Einstieg mit einer Umgebungskontrolle und einer ersten Validierung kleiner Episodendaten. Die Umgebungsprüfung zeigt insbesondere Python und FFmpeg an, ohne Modelle oder Audiodateien herunterzuladen. Die Datenvalidierung prüft die zentralen Grenzen für Identität, Provenienz und chronologische Zeitmarken anhand kleiner, ausdrücklich synthetischer Prüfdaten.

Die Web-App erhält einen lokal startbaren und produktiv baubaren Einstieg. Entwicklungsdaten werden ausdrücklich als synthetisch bezeichnet; ein noch nicht umgesetzter Such- oder Transkriptionsablauf wird als ausstehend angezeigt. Die Einrichtung behauptet weder eine funktionierende Archivsuche noch eine bestandene Pilotabnahme.

## Gezielte Prüfungen und CI

- Python: Format-/Lintprüfung und gezielte Tests an den ersten Datenvertragsgrenzen, ohne Audio, Modellgewichte oder GPU.
- Web: TypeScript-Prüfung, Lintprüfung und Produktionsbuild; zusätzliche Verhaltenstests dort, wo bereits tatsächliches Verhalten vorhanden ist.
- GitHub Actions: dieselben Offline-Prüfungen auf Windows und Linux mit Python 3.12 und einer mit dem lokalen Node-22-Werkzeug kompatiblen Version. Gesperrte Abhängigkeiten werden unverändert installiert.
- Dokumentation: lokale Links sowie die tatsächlich ausgeführten Installations-, Entwicklungs- und Prüfabläufe kontrollieren und in `docs/development.md` dokumentieren.

## Fertigkriterien

Ein neuer Agent findet in `AGENTS.md` die relevanten Dokumente und aus den Paketmanifesten die verfügbaren Befehle. Python-CLI und Web-Entwicklungsserver starten; die gezielten Offline-Prüfungen und der Produktionsbuild laufen erfolgreich. Abhängigkeiten sind gesperrt, Caches und Build-Ergebnisse bleiben untracked. Die Dokumentation benennt die noch ausstehenden Modell-, Colab-, Feed-, Such- und Pilotnachweise präzise.

Die spätere ASR-/spaCy-Installation, vollständige Feed-Erfassung, echte Transkription, vollständige Suche und öffentliche Bereitstellung sind getrennte, bereits im Projektplan beschriebene Implementierungsaufgaben.
