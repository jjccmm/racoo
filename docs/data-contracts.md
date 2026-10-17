# Erste Episodendaten

Das Python-Modell in `src/podcast_words/contracts.py` ist die ausführbare Quelle für den ersten Episodenvertrag. Alle gespeicherten Segment- und Tokenzeiten beziehen sich auf Sekunden in der ursprünglichen Folge. Tokenpunkte sind keine Wortintervalle.

`schemas/episode-v1.schema.json` wird daraus erzeugt. Das JSON-Schema beschreibt die strukturellen Anforderungen; die zusätzliche Python-Validierung prüft auch Beziehungen wie chronologische, nicht überlappende Segmente, Grenzen der Audiodauer und eindeutige Segment-IDs. Vor einer Übernahme oder Veröffentlichung immer den vollständigen Validator verwenden.

Die Herkunft unterscheidet RSS, einzeln geprüfte Ergänzungen und synthetische Prüfdaten. RSS benötigt eine GUID. Bereits zugeordnete zusätzliche GUIDs stehen in der Aliasliste; der separate Katalog führt dazu geprüfte Identitätsbegründungen. Eine Aliasliste allein bestätigt keine Quellenidentität.

Die einzige enthaltene Episode ist [die synthetische Prüfdatenfolge](../tests/fixtures/synthetic-episode.json). Ihre Audioadresse und Prüfsumme sind Platzhalter; weder Dateiinhalt noch Modellherkunft sind real. Die Validierung prüft das Datenformat, lädt aber kein Audio und verifiziert keine Prüfsumme gegen einen Download. Die Web-App importiert dieselbe Datei, ohne eine zweite Kopie des Beispiels zu führen.

Bei einer Vertragsänderung Modell, Schema, Produzenten/Verbraucher und relevante Prüfdaten gemeinsam aktualisieren. Abwärtsinkompatible Änderungen benötigen eine neue Schemaversion und einen bewusst geplanten Übergang. Den Schemaexport über `podcast-words schema --output schemas/episode-v1.schema.json` aktualisieren; der Test auf Übereinstimmung erkennt einen veralteten Export.

Der separate [Folgenkatalog](catalog.md) in `src/podcast_words/catalog.py` speichert Quellen, Metadaten und ausdrückliche Quellenlücken. Sein struktureller Export ist [catalog-v1.schema.json](../schemas/catalog-v1.schema.json). `catalog show` prüft zusätzlich eindeutige Folgen-/Quellenidentitäten, katalogweit eindeutige GUIDs und belegte GUID-Aliase. Ein Katalogeintrag ersetzt kein validiertes Episoden-JSON und keine Transkription.
