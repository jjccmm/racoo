# Erste Episodendaten

Das Python-Modell in `src/podcast_words/contracts.py` ist die ausführbare Quelle für den ersten Episodenvertrag. Alle gespeicherten Segment- und Tokenzeiten beziehen sich auf Sekunden in der ursprünglichen Folge. Tokenpunkte sind keine Wortintervalle.

`schemas/episode-v1.schema.json` wird daraus erzeugt. Das JSON-Schema beschreibt die strukturellen Anforderungen; die zusätzliche Python-Validierung prüft auch Beziehungen wie chronologische, nicht überlappende Segmente, Grenzen der Audiodauer und eindeutige Segment-IDs. Vor einer Übernahme oder Veröffentlichung immer den vollständigen Validator verwenden.

Die Herkunft unterscheidet RSS, einzeln geprüfte Ergänzungen und synthetische Prüfdaten. RSS benötigt eine GUID. Bereits zugeordnete zusätzliche GUIDs stehen in der Aliasliste; der separate Katalog führt dazu geprüfte Identitätsbegründungen. Eine Aliasliste allein bestätigt keine Quellenidentität.

Die kontrollierten Sucheingaben stehen in [der Korpusliste](../tests/fixtures/search-corpus.json): [die ursprüngliche synthetische Prüfdatenfolge](../tests/fixtures/synthetic-episode.json) und [eine zweite Suchfolge](../tests/fixtures/search/second-episode.json). Ihre Audioadressen und Prüfsummen sind Platzhalter; weder Dateiinhalt noch Modellherkunft sind real. Die Validierung prüft das Datenformat, lädt aber kein Audio und verifiziert keine Prüfsumme gegen einen Download. Der Web-Build validiert und veröffentlicht dieselben Dateien gezielt als bedarfsgerecht geladene Episodendaten.

Bei einer Vertragsänderung Modell, Schema, Produzenten/Verbraucher und relevante Prüfdaten gemeinsam aktualisieren. Abwärtsinkompatible Änderungen benötigen eine neue Schemaversion und einen bewusst geplanten Übergang. Den Schemaexport über `podcast-words schema --output schemas/episode-v1.schema.json` aktualisieren; der Test auf Übereinstimmung erkennt einen veralteten Export.

Die getrennte [Grundformanalyse](analysis.md) verwendet den Python-Vertrag `Analysis` in `src/podcast_words/analysis.py`. Den strukturellen Export mit `podcast-words schema --kind analysis --output schemas/analysis-v1.schema.json` aktualisieren. Gespeicherte Analysen werden vor Wiederverwendung vollständig validiert; konsumierte Segmenttexte und Analysekonfiguration bestimmen ihre Gültigkeit. Episoden-JSON und sein Schema bleiben davon unabhängig.

Der CPU-Produzent ergänzt abwärtskompatibel `export_id`, `execution_providers` (tatsächliche Anbieter je ORT-Session) und `configuration` (Quantisierung, VAD, Decodierung und Zeitbezug) in `transcription`. Bestehende V1-Prüfdaten bleiben gültig; echte neue ASR-Ergebnisse füllen diese Felder. `runtime_versions` enthält weiterhin Paketstände. [ASR](asr.md) dokumentiert die gesperrte Konfiguration und die ausdrücklich nicht attestierte genaue Export-zu-Upstream-Commitzuordnung.

Der ausgewählte Verarbeitungsbefehl ergänzt `input_revision` (SHA-256 der gelesenen Audio-Bytes), `configuration_revision` (Modell-, Export-, VAD-, Quantisierungs-, Anbieter-, Laufzeit- und Dekodiereinstellungen) und `transcript_revision` (geordnete Segmente zusammen mit Audio- und Konfigurationsrevision). Die drei optionalen Felder halten vorhandene V1-Daten gültig und geben nachfolgenden Analysen und Veröffentlichungen stabile Inhaltsstände an.

Native Tokenpunkte dürfen nichtleeren Whitespace als Tokentext enthalten: Der gepinnte Parakeet-Decoder gibt solche Tokens tatsächlich aus. Sie werden unverändert erhalten. Segmenttexte benötigen weiterhin mindestens ein Nicht-Whitespace-Zeichen. Die synthetische Prüfdatenfolge enthält zur Darstellung dieser Unterscheidung einen Whitespace-Tokenpunkt.

Der separate [Folgenkatalog](catalog.md) in `src/podcast_words/catalog.py` speichert Quellen, Metadaten und ausdrückliche Quellenlücken. Sein struktureller Export ist [catalog-v1.schema.json](../schemas/catalog-v1.schema.json). `catalog show` prüft zusätzlich eindeutige Folgen-/Quellenidentitäten, katalogweit eindeutige GUIDs und belegte GUID-Aliase. Ein Katalogeintrag ersetzt kein validiertes Episoden-JSON und keine Transkription.

## Audiofassung und öffentliche Quelle

`audio.url` ist die öffentliche Bezugsquelle und kann clientabhängige Werbung liefern. `audio.sha256` bezeichnet ausschließlich die tatsächlich transkribierten Bytes; `duration_seconds` und alle Zeitmarken gehören zu dieser Fassung. Neue lokale Verarbeitungen erhalten diese Bytes in einer nach SHA-256 benannten Referenzdatei und nennen den privaten Pfad im Laufbericht. Der Pfad wird nicht in öffentliche Episodendaten übernommen. Bei abweichender Online-Dauer stoppt der Player automatische Zeitsprünge; eine lokal ausgewählte Datei wird vollständig gegen den gespeicherten SHA-256 geprüft. Keine Schemaänderung erforderlich.
