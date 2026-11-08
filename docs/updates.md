# Podcasts lokal aktualisieren und veröffentlichen

Die Podcastkonfiguration in [`podcasts.json`](../podcasts.json) ist der Einstieg. Transkription und Tests laufen lokal. GitHub Actions baut ausschließlich die gespeicherten Daten und veröffentlicht nach einem Merge/Push auf `main`; das Öffnen eines PR veröffentlicht noch nichts.

## Einmalige Voraussetzungen

[Python/Node/FFmpeg](development.md), [lokales Parakeet FP32/CUDA](asr.md) und [spaCy mit dem festgelegten deutschen Modell](analysis.md) einrichten. `--inexact --extra analysis` erhält das separat installierte Sprachmodell und aktiviert die gesperrten Analyseabhängigkeiten. Der normale Pages-Build benötigt diese Modelle nicht.

## Ein Befehl für die nächsten zehn Folgen

Im Repositoryroot:

```powershell
$env:UV_CACHE_DIR = Join-Path $PWD '.uv-cache'
uv run --frozen --inexact --extra analysis podcast-words update --podcast podcast-ufo --limit 10 --run-report .cache/asr/latest-run.json
```

Der Befehl:

1. Liest Feed, Podcast-ID und Datenordner aus der Konfiguration und importiert den RSS-Feed mit einem datierten Snapshot.
2. Wählt höchstens zehn fehlende, verarbeitbare Transkripte. Standard ist **älteste zuerst**, bei gleichem Datum stabile ID aufsteigend. `--order newest` wählt zuerst die neuesten fehlenden Folgen. Das Limit ist positiv und zählt Verarbeitungsversuche; fehlgeschlagene Versuche werden nicht durch beliebig viele weitere Folgen ersetzt.
3. Verarbeitet den Batch mit einem gemeinsamen FP32/GPU-Modell. Audio wird temporär geladen und nach Verarbeitung oder Fehler gelöscht. Fertige gültige Transkripte verbrauchen kein Limit und werden erhalten; passende vorhandene Transkripte können einen unterbrochenen Katalogstatus reparieren.
4. Berechnet fehlende/veraltete Wortanalysen aller fertigen Folgen dieses Podcasts und verwendet unveränderte Analysen erneut. Dies kann auch ohne neue Transkription nötig sein.
5. Schreibt einen JSON-Gesamtbericht auf stdout. Normierte Zeiten pro Folge stehen weiterhin auf stderr; `--run-report` speichert den detaillierten ASR-Laufbericht. Feedfehler stoppen vor ASR, Verarbeitungs-/Analysefehler liefern Exitstatus 1, Abbruch 130. Bereits gespeicherte Ergebnisse bleiben erhalten.

Folgen ohne Datum, Audio-Enclosure oder verfügbare Quelle werden mit ID und Grund unter `unprocessable` ausgewiesen. Das trifft aktuell insbesondere auf das unbelegte Veröffentlichungsdatum der Archivfolge 37 zu. Daten werden nicht erfunden. Fehlerhafte Folgen bleiben erneut ausführbar; bei dauerhaft scheiternden alten Folgen kann `--order newest` andere Kandidaten vorziehen.

Nur Metadaten aktualisieren:

```powershell
uv run --frozen podcast-words catalog import --catalog data/podcast-ufo/catalog.json
```

Nur vorhandenen Katalog verarbeiten, ohne Feedabruf oder Wortanalyse:

```powershell
uv run --frozen podcast-words process --catalog data/podcast-ufo/catalog.json --pending --limit 10 --order oldest --output-dir data/podcast-ufo/episodes
```

Die bisherige ausdrückliche Auswahl mit `--episode-id` und die bewusste Neutranskription mit `--retranscribe` bleiben erhalten. `--pending` und `--retranscribe` werden zusammen abgewiesen.

## Gespeicherte Daten und Veröffentlichung

Pro Podcast liegen unter seinem Datenordner `catalog.json`, `snapshots/`, `episodes/` und `analyses/`. Katalog, Transkripte und Analysen einchecken; Caches, Modelle und Audio gehören nicht in Git. Eine manuelle Veröffentlichungsliste ist für den normalen Build nicht erforderlich: Alle Katalogfolgen mit `processing_status: completed` werden aufgenommen, und ihre Transkripte sowie gespeicherten Analysen werden streng geprüft. Fehlende oder ungültige Artefakte stoppen den Build. Nach einem Analysefehler zuerst den Update-/Analysebefehl erneut ausführen.

```powershell
npm.cmd --prefix web run build
npm.cmd --prefix web run preview -- --port 4173 --strictPort
```

Der Build erzeugt eine gemeinsame App, `podcasts.json` als öffentliche Übersicht und getrennte Daten unter `podcasts/<id>/` mit `publication.json`, `catalog.json`, `stats/` und `search/`. Die Root-Datei `publication.json` fasst die Veröffentlichung zusammen (`schemaVersion: 2`, `state: published-corpus`, Gesamtfolgenzahl). Der Pages-Workflow lehnt einen Fixture-Build und einen leeren Gesamtbestand ab. Je Podcast gelten weiterhin die vorhandenen Identitäts-/Revisionsbindungen; das Größenlimit gilt für die gesamte Webseite.

Karten und Suchansicht zeigen **veröffentlichte/durchsuchbare Folgen von allen bekannten Katalogfolgen** und den Zeitpunkt des letzten erfolgreichen gespeicherten Feedimports. Das umfasst auch ergänzte oder aktuell nicht verfügbare bekannte Folgen im Nenner. Ein reiner Audit zählt nicht als Import; ein fehlgeschlagener Import ersetzt das letzte Erfolgsdatum nicht. Die Angaben aktualisieren sich mit der nächsten Veröffentlichung und sind keine Liveabfrage im Besucherbrowser.

Der [echte Ein-Folgen-Test](pilot/update-limit-one.md) belegt den vollständigen Aufruf mit genau einer neuen GPU-Transkription, einer neuen Wortanalyse und automatischer Aufnahme in den Sechserbuild.

## Einen Podcast ergänzen

In `podcasts.json` einen weiteren Eintrag mit eigener `id`, `name`, `speakers`, lokalem `cover`, `feed_url` und `directory` ergänzen. Beispiel:

```json
{
  "id": "weiterer-podcast",
  "name": "Weiterer Podcast",
  "speakers": ["Name"],
  "cover": "images/weiterer-podcast.jpg",
  "feed_url": "https://example.org/feed.xml",
  "directory": "data/weiterer-podcast"
}
```

Das Cover unter `web/public/images/` ablegen. Pfade sind relativ zur Konfigurationsdatei (Cover relativ zu `web/public/`), IDs und Datenordner müssen eindeutig sein. Datenordner dürfen weder ineinander liegen noch den Konfigurationsordner verlassen. Dann `update --podcast weiterer-podcast --limit 10` mit den obigen uv-Analyseoptionen ausführen. Vor der ersten Verarbeitung erscheint der Podcast mit einem Leerzustand; ohne gespeicherten Feedimport steht dort „Stand unbekannt“. Python- oder React-Sondercode ist nicht nötig. Das deutsche Analysemodell gilt zunächst für alle konfigurierten Podcasts.

`?podcast=<id>` öffnet den Suchkontext. Alte Links nur mit `?episode=...&t=...` werden über die veröffentlichte ID-Zuordnung dem richtigen Podcast zugewiesen. Unbekannte Podcasts erhalten einen sichtbaren Fehler; Suchdaten anderer Podcasts werden nicht geladen.

## Lokal prüfen

`uv run --frozen python scripts/check.py` prüft weiterhin die vorhandenen kleinen Korpora an `/` und `/racoo/`, zusätzlich zwei getrennte konfigurierte Testpodcasts und einen leeren Podcast. Die generierten Fixture-Daten bleiben unter `.cache/`. Für kontrollierte Prüfkorpora bleiben `PODCAST_WORDS_EPISODES` und `PODCAST_WORDS_PUBLICATION_SOURCE` als ausdrückliche Einzel-Publikationswege erhalten; `PODCAST_WORDS_CONFIG` wählt eine andere Konfiguration für den konfigurierten Build. Nach dem Check den normalen Build erneut ausführen, bevor die echte lokale Seite beurteilt wird.
