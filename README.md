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

Der Plan ist gemeinsam bestätigt, die Arbeitsumgebung eingerichtet. Der Python-Starter validiert versionierte Episodendaten; der Web-Starter zeigt ausdrücklich synthetische Beispieldaten. Installation, gemeinsamer Check und Entwicklungsstart sind in der [Entwicklungsanleitung](docs/development.md) beschrieben.

Als Nächstes folgen die ASR- und Such-Funktionsnachweise, danach ein durchgängiger Pilot mit fünf repräsentativen Folgen. Erst nach bestandener Pilotabnahme wird das verfügbare Archiv verarbeitet. Echte Transkription, Archivsuche und öffentliche Bereitstellung sind noch nicht implementiert.
