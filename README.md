# Racoo

**Die Podcast Wort Suche** findet Podcastfolgen anhand erinnerter Stichwörter. Parakeet-TDT-0.6B-v3 transkribiert lokal mit FP32 auf der GPU; Pagefind durchsucht die gespeicherten Texte im Browser. Statische Veröffentlichung auf GitHub Pages, ohne eigenes Backend.

Aktuell sind 106 Folgen von DAS PODCAST UFO gespeichert. Weitere Podcasts lassen sich über [`podcasts.json`](podcasts.json) hinzufügen.

```powershell
uv run --frozen --inexact podcast-words update --podcast podcast-ufo --limit 10 --run-report .cache/asr/latest-run.json
npm.cmd --prefix web run build
npm.cmd --prefix web run preview -- --port 4174 --strictPort
```

Die lokale Seite ist unter <http://127.0.0.1:4174/> erreichbar. Auf der Startseite die Freitextdemo ausprobieren und einen Podcast auswählen. In der Podcastsuche bis zu fünf Stichwörter eingeben, Enter drücken und die Suchwort-Treffer je Folge vergleichen. „Top 10“ zeigt die höchsten Summen; „Alle“ enthält auch Nullfolgen in chronologischer Reihenfolge. Jede Trefferfolge zeigt direkt eine vollständige Transkriptkarte mit allen Angaben und heller vertikaler Minimap. Der Text springt zur ersten passenden Fundstelle. Diagramme passen ohne horizontales Scrollen in die verfügbare Breite.

Pagefind berücksichtigt Wortformen und Wortanfänge. Die Zahlen sind Suchtreffer, keine exakten Grundformzählungen. Überschneidende Suchbegriffe können dieselbe Textposition zu mehreren Balkenserien beitragen lassen. Die Navigation zählt dagegen eindeutige Stellen. Stoppwörter und die [gepflegte Zusatzliste](config/search-rules.json) werden in der Anfrage ignoriert. spaCy, Sprachmodellinstallation, Vokabular und Zählshards sind nicht erforderlich.

Audio wird nach der lokalen Transkription gelöscht. Zeitknöpfe starten am Beginn des jeweiligen Textabschnitts, der Headerknopf bei 0:00; Werbung kann die aktuelle Online-Audiozeit verschieben. Der gemeinsame Player lässt sich schließen. Maschinelle Transkripte können Fehler enthalten.

- [Betrieb und weitere Podcasts](docs/updates.md)
- [Lokale FP32-/GPU-Einrichtung](docs/asr.md)
- [Entwickeln und lokal prüfen](docs/development.md)
- [Suchverhalten und Minimap](docs/search.md)
- [Datenverträge](docs/data-contracts.md)
- [GitHub Pages](docs/github-pages.md): Der einzige Workflow baut/deployt nach Push/Merge auf `main`; Tests laufen lokal.
- [Projektplan](PLAN.md), [Fachbegriffe](GLOSSARY.md), [Tickets](.scratch/pagefind-minimap/spec.md)
- [ASR-Untersuchung](docs/research/asr-investigation.md) und [historischer Fünf-Folgen-Pilot](docs/pilot/local-five-episode-pilot.md)
