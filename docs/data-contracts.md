# Episodendaten und Analyse

Das Python-Modell in `src/podcast_words/contracts.py` ist die ausführbare Quelle für Episode **Schema 2**. Der strukturelle Export liegt unter `schemas/episode-v2.schema.json`; Python prüft zusätzlich Beziehungen wie Reihenfolge, eindeutige IDs und Grenzen der Audiodauer. Historische Forschungsergebnisse sind keine aktiven Episode-Eingaben.

Eine Episode enthält ihre stabile Podcast-/Folgenidentität, Quellenmetadaten, Modell-/Exportrevision und Laufzeitkonfiguration. `audio` enthält ausschließlich `url` und `duration_seconds`. Die öffentliche URL kann später eine andere Werbung enthalten; es gibt keinen gespeicherten Audiohash und keinen erneuten Abgleich.

`segments` enthält ausschließlich `id`, `text`, `start_seconds` und `end_seconds`. Zeitwerte sind Sekunden auf der beim Transkribieren verarbeiteten Folge. Sprachabschnitte werden in Reihenfolge verbunden, solange ihre gemeinsame Zeitspanne höchstens 300 Sekunden bleibt. Der gesamte erkannte Text bleibt erhalten; feine Wort-/Tokenzeitpunkte werden weder angefordert noch gespeichert. Suche verwendet Segmentanker, Wortzählung nur die Texte.

`timings` enthält gemessene, endliche und nichtnegative `download_seconds`, `transcription_seconds` und `total_seconds`. Die genauen Messgrenzen stehen in [ASR](asr.md). Im kompakten öffentlichen Statistikkatalog heißen die Felder `durationSeconds` sowie `timings.downloadSeconds`, `timings.transcriptionSeconds`, `timings.totalSeconds`. Dadurch kann die Folgenübersicht ihre Zeiten anzeigen, ohne alle Transkripte zu laden.

`configuration_revision` beschreibt die festgehaltene Transkriptionskonfiguration, `transcript_revision` den gespeicherten Text-/Segmentstand samt Konfiguration. Es gibt keine an Audio-Bytes gebundene `input_revision`. Analyse- und Buildhashes bleiben sinnvoll: Sie erkennen veraltete Ableitungen des gespeicherten Textes, ohne MP3s zu behalten oder abzurufen.

Die Herkunft unterscheidet RSS, einzeln geprüfte Ergänzungen und synthetische Prüfdaten. RSS benötigt eine GUID. Der separate [Folgenkatalog](catalog.md) hält Identitäten und belegte Aliase fest. Ein Katalogeintrag ersetzt kein validiertes Transkript.

Die kontrollierten Sucheingaben stehen in [der Korpusliste](../tests/fixtures/search-corpus.json). Sie sind ausdrücklich synthetisch; ihre Zeiten sind Testwerte. Routinechecks laden weder Audio noch Modelle. Modell, Schema, Produzenten, Verbraucher und aktive Prüfdaten bei Vertragsänderungen gemeinsam aktualisieren:

```powershell
uv run --frozen podcast-words schema --output schemas/episode-v2.schema.json
```

Die getrennte [Grundformanalyse](analysis.md) verwendet weiterhin den Vertrag `Analysis` in `src/podcast_words/analysis.py`. Konsumierte Segmenttexte und Analysekonfiguration bestimmen ihre Gültigkeit. Den strukturellen Analyseexport über `podcast-words schema --kind analysis --output schemas/analysis-v1.schema.json` aktualisieren.

Die daraus veröffentlichten Statistikdateien haben unabhängig davon `schemaVersion: 2`. Sparse Häufigkeiten verwenden `[episodeIndex, Anzahl]` statt wiederholter Episoden-IDs. Der Index ist die nullbasierte Position im chronologisch geordneten `episodes`-Array desselben Statistikkatalogs; dort bleibt die stabile `episodeId` erhalten. Katalog und Zähldateien müssen dieselbe Veröffentlichungs-ID tragen. Das genaue Zahlenformat und seine Fehlergrenzen stehen in [der Analyseanleitung](analysis.md#veröffentlichte-dateien-und-browser).

Vokabular und Häufigkeitsdateien schließen spaCy-Stoppwortlemmata aus allen ausgewählten Analysen sowie die [gepflegte Zusatzliste](../src/podcast_words/ignored_lemmas.txt) aus. Der Katalog und die gespeicherte Analysis behalten alle alphabetischen Wörter. `manifest.json` enthält die effektive Regel unter `frequencyExclusions`; ihre normalisierte manuelle Liste ist Bestandteil der Statistik-ID, auch bei im Bestand nicht vorkommenden Einträgen. Die vollständige Stichwortsuche wird davon nicht gefiltert. Pflege, Override und erneute Veröffentlichung ohne Neuanalyse stehen in [der Anleitung](analysis.md#zusätzliche-ignorierte-grundformen-pflegen).
