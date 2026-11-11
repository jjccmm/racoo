# Episodendaten und statische Veröffentlichung

## Gespeicherte Episode

Das Python-Modell `Episode` in [`contracts.py`](../src/podcast_words/contracts.py) ist die ausführbare Quelle für Episode **Schema 2**; [`schemas/episode-v2.schema.json`](../schemas/episode-v2.schema.json) ist sein struktureller Export. Python prüft zusätzlich Reihenfolge, eindeutige IDs, Segment-/Audiodauergrenzen und endliche Laufzeiten.

Eine Episode enthält stabile Podcast-/Folgenidentität, Herkunft, Titel/Datum, Modell-/Exportrevision, Verarbeitungszeitpunkt und Laufzeitkonfiguration. `audio` hat `url` und `duration_seconds`. Die öffentliche URL darf später andere Werbung liefern; ein Audiohash oder erneuter Abgleich gehört nicht zum Vertrag.

`segments` enthält ausschließlich `id`, `text`, `start_seconds`, `end_seconds`. Chronologische grobe Abschnitte mit höchstens 300 Sekunden, vollständiger Originaltext, keine Wort-/Tokenzeitpunkte. Der Text bleibt Datenbasis für Suche, Highlightbereiche und Minimap.

`timings` speichert gemessene nichtnegative `download_seconds`, `transcription_seconds`, `total_seconds`. Gemeinsames Modellsetup steht im ASR-Bericht. [Messgrenzen](asr.md)

`configuration_revision` bindet die ASR-Einstellungen, `transcript_revision` den Text-/Segmentstand samt Konfiguration. Sie und die Buildhashes bleiben sinnvoll, unabhängig von Online-Audioänderungen. [Identität](adr/0001-stabile-folgenidentitaet.md)

```powershell
uv run --frozen podcast-words schema --output schemas/episode-v2.schema.json
```

## Konfiguration und vorbereitete Quellen

[`podcasts.json`](../podcasts.json) verwendet `Podcasts` aus [`podcasts.py`](../src/podcast_words/podcasts.py): Schema 1, eindeutige IDs und sichere getrennte Datenordner. Je Podcast Katalog, RSS-Snapshots und `episodes/`. Die frühere Analysis und ihre Schema-/Cachedateien sind entfernt; für einen fertigen durchsuchbaren Bestand genügt ein validiertes Transkript mit passendem Katalogstatus.

`prepare-site` validiert alle abgeschlossenen Episoden, aktualisiert öffentliche Feedmetadaten und erzeugt `episodes.json`, Episodenkopien, `catalog.json` und `manifest.json` unter `.cache/site-publication/<id>/source`. Vorbereitungsschema 2, `generatedBy: podcast-words publish`, `state: published-corpus`, `preparationId`, IDs und Transkriptionsrevisionen. Weder ein Sprachmodell noch alte Analysen werden geladen. Unbekannte Ausgabeverzeichnisse nicht überschreiben; erkennbare generierte Quellen atomar ersetzen.

## Öffentliche Dateien

- Root `podcasts.json`, Schema 1: `id`, `name`, `speakers`, `cover`, `dataPath`, `knownEpisodeCount`, `episodeCount`, `lastCheckedAt`, `episodeIds`. Interne Cachepfade werden nicht veröffentlicht.
- Root `publication.json`, Schema 2: Gesamtstatus `published-corpus` oder `synthetic-fixture`, `episodeCount`, `podcastCount`. Der Pages-Schutz veröffentlicht nur echte nichtleere Korpora.
- Je `podcasts/<id>/publication.json`, **Schema 3**: `publicationId`, `podcastId`, `state`, `archiveComplete:false`, `episodeCount`, `episodeIds`, `searchIndexId`, `catalogId`, `preparationId`.
- Je Podcast `catalog.json`, Schema 2: Veröffentlichung/Hash, Podcast-ID, optionale Quellensnapshotdaten und `episodes` mit stabiler `episodeId`, Titel, Datum, Audiodauer und `timings.downloadSeconds`, `transcriptionSeconds`, `totalSeconds`. Kein Gesamtwort-/Lemmafeld.
- `search/manifest.json` und `search/<indexId>/episodes.json` binden Index und stabile IDs an dieselbe `publicationId`. Unter dem Index liegen die nativen Pagefind-Dateien und lazy Original-Episoden-JSONs.

`publicationId` bindet Suchindex, Metadatenkatalog und Vorbereitungsstand gemeinsam. ID-/Metadaten-/Schemaabweichungen sind Fehler. Es gibt keine öffentlichen Suchregellisten, `stats/`, Vokabulare oder Zählpakete. Stoppwörter und manuelle Ausschlüsse werden nicht gefiltert. Der Browser berechnet die [Suchwort-Treffer](search.md) pro Anfrage aus den Indexpositionen.

Der sichtbare Nenner umfasst alle bekannten Katalogfolgen einschließlich Quellenlücken; der Zähler ausschließlich die veröffentlichten gültigen Transkripte. `lastCheckedAt` ist der letzte erfolgreiche gespeicherte Feedimport, kein Build-/Transkriptionsdatum. Alte `?episode=…&t=…`-Links werden über die podcastübergreifend eindeutigen IDs aufgelöst.

Explizite Prüfkorpora über `PODCAST_WORDS_EPISODES` behalten eine einzelne synthetische Veröffentlichung am Root; konfigurierte Tests kennzeichnen ihren Gesamtbestand mit `synthetic_fixture:true`. Die gewöhnliche Webseite lädt nur den ausgewählten Podcast.
