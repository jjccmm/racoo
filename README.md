# Podcast Words V3

Statische Podcast-Suche und Wortstatistik, zunächst für **DAS PODCAST UFO**. Alle Folgen werden mit **Parakeet-TDT-0.6B-v3** neu transkribiert. Die Verarbeitung läuft lokal oder in Google Colab; die Webseite wird auf GitHub Pages veröffentlicht.

- [Projektplan](PLAN.md): Entscheidungen, Datenfluss, Umsetzung und Abnahme.
- [Recherche zu Feed und Suche](docs/research/v3-feed-and-search.md): geprüfte Quellen und technische Grenzen, Stand 16. Oktober 2026.
- [Fachbegriffe](GLOSSARY.md): gemeinsame Sprache für Suche, Transkripte und Statistik.
- [Planverfeinerung](docs/planning/refinement.md): abgeschlossene Interviewentscheidungen.
- [Einrichtungsumfang](docs/planning/workspace-setup.md): konkret vorgesehene Starterpakete und Fertigkriterien.
- [Entwicklungsumgebung](docs/development.md): Einrichtung und Besonderheiten des Windows-Arbeitsplatzes.
- [Runtime und Suchverträge](docs/research/runtime-and-search-contracts.md): Quellenprüfung für die ersten Funktionsnachweise.
- [Nächste Aufgaben](TASKS.md): Umsetzungsreihenfolge und noch ausstehende Nachweise.

Der Plan ist gemeinsam bestätigt, die Arbeitsumgebung eingerichtet. Das Python-Paket validiert versionierte Episodendaten; die statische Web-App verbindet Suche, Fundstellen, Audioplayer und Wortstatistiken anhand ausdrücklich synthetischer Prüfdaten. Installation, gemeinsamer Check und Entwicklungsstart sind in der [Entwicklungsanleitung](docs/development.md) beschrieben.

Der gebaute Such- und Statistikstand wird am Root-Pfad und unter `/podcast_words_v3/` mit Chromium geprüft. Der fünfteilige Pilot, echte ASR-Verarbeitung, manuelle Qualitäts- und Laufzeitabnahme sowie eine Veröffentlichungsentscheidung stehen noch aus. Erst nach bestandener Pilotabnahme wird das verfügbare Archiv verarbeitet.
