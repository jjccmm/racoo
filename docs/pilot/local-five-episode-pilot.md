# Lokaler Fünf-Folgen-Pilot

Fünf echte Folgen wurden am 25. Oktober 2026 neu mit Parakeet-TDT-0.6B-v3 **FP32 auf der lokalen GTX 1050 Ti** verarbeitet und mit spaCy 3.8.16 / de_core_news_lg 3.8.0 analysiert. Die [Auswahlliste](../../data/podcast-ufo/pilot-episodes.json) ist die gemeinsame Quelle für Suche und Statistik. [Maschinenlesbare Messwerte](evidence/local-five-episode-processing.json) halten Laufzeit und Grenzen fest.

## Starten

Vom Repositoryroot mit eingerichteter [Entwicklungsumgebung](../development.md):

```powershell
npm.cmd --prefix web run build
npm.cmd --prefix web run preview -- --port 4173 --strictPort
```

Der normale Build verwendet die gespeicherten echten Pilottranskripte und Analysen. Er erzeugt `.cache/pilot-publication` cache-only, lädt kein ASR-/spaCy-Modell und kein Audio. Fehlende oder veraltete Analysen führen zu einem Fehler statt einem Wechsel auf Beispieldaten. Aufrufen: <http://127.0.0.1:4173/>. Unter „Wortstatistik öffnen“ stehen die fünf Folgen und ihre gemessenen Zeiten.

## Neu verarbeiten

Das [Auswahlmanifest](../../data/podcast-ufo/pilot-candidates.json) nennt die fünf stabilen IDs. Der folgende Aufruf verarbeitet die Auswahl mit einem gemeinsamen Modell; ohne `--retranscribe` verwendet er bereits gespeicherte Transkripte:

```powershell
uv run --frozen --inexact podcast-words process --catalog data/podcast-ufo/catalog.json --episode-id ep-9fc90dc95a4e7c5633f4c62489665cf2 --episode-id ep-8c3cf057f4cd494721dc22b56ae5ddfc --episode-id ep-4e22f6d5c692e3e62564621fdcd8bcb2 --episode-id ep-5f478c2c998d108b9c1a08d27898a417 --episode-id ep-5764a1149f18a8f68698fb45bb405264 --output-dir data/podcast-ufo/episodes --run-report .cache/asr/pilot-run.json
uv run --frozen --inexact --extra analysis podcast-words analyze --episodes data/podcast-ufo/pilot-episodes.json --output data/podcast-ufo/analyses
npm.cmd --prefix web run build
```

Einmalige GPU- und spaCy-Einrichtung stehen unter [ASR](../asr.md) und [Analyse](../analysis.md). Der tatsächliche Analyse-Nachweis nutzte die bereits vorhandene lokale Analyseumgebung `.cache/spacy-preflight`; ihre Paket-/Modellstände stimmen mit den gesperrten Vorgaben überein. Die normale Einrichtung benötigt nur die dokumentierte Projektumgebung mit Analyse-Extra und Modell.

## Gemessene Verarbeitung

| Folge | Audio min | Download s | Erkennung s | Gesamt s | Erkennung | Segmente | JSON Byte | Gesamtwörter |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| UFO001 Prolog | 61.94 | 3.203 | 127.688 | 136.047 | 29.11× | 13 | 73,924 | 11,529 |
| UGO081 Freestyle Karate | 50.90 | 2.609 | 114.390 | 121.547 | 26.70× | 11 | 63,013 | 9,879 |
| UFO300 Moll | 68.72 | 3.687 | 149.219 | 158.172 | 27.63× | 14 | 76,228 | 11,885 |
| UFO Experiment (KI-generiert) | 25.27 | 0.953 | 49.516 | 52.859 | 30.63× | 5 | 28,565 | 4,198 |
| UFO537 Festival | 72.44 | 2.250 | 148.078 | 155.719 | 29.35× | 15 | 77,954 | 12,174 |

Gemeinsames Modellsetup: **4.984 s**. Gesamter Batch ab öffentlichem Verarbeitungseinstieg: **629.906 s**. Modellgewichte waren vorhanden; deren erstmaliger Download und Paketinstallation liegen außerhalb. Erkennung enthält VAD und NumPy-Vorverarbeitung. Episodengesamtzeit umfasst Download bis Cleanup und Validierung; gemeinsames Modellsetup und finale JSON-/Berichtserialisierung liegen außerhalb. Unterzeiten nicht zusätzlich zum Gesamtwert addieren.

Konsole und gespeicherte Daten nennen Download-/Transkriptionszeit. Zusätzlich erscheinen Audio- und Gesamtdauer sowie **Sekunden je Audiominute**. Kein Modellsetup wird fünffach gezählt. Die tatsächliche Audiolänge darf wegen Werbung von früheren Messungen abweichen.

Alle temporären MP3-/WAV-Daten wurden entfernt. Die Wiederaufnahme übersprang **5/5 Folgen**, initialisierte kein Modell und änderte keine Transkriptbytes. HTTP-freie Wiederaufnahme sowie Cleanup nach Downloadfehlern, Inferenzfehlern und Abbruch werden zusätzlich an der öffentlichen CLI geprüft.

## Daten und Grenzen

Episode Schema 2 speichert nur Text, Segment-ID, Start und Ende; die Segmente umfassen höchstens 300 Sekunden. Es gibt keine Wortzeitpunkte, Audiohashes, lokale Dateiverifikation oder späteren Online-Abgleich. Wortzählung konsumiert die Texte, Pagefind die Texte und Segmentanker. Sprungknöpfe starten am Segmentanfang und erklären unmittelbar daneben die mögliche Werbeverschiebung. Lange Segmente bleiben vollständig aufklappbar.

„UFO Experiment (KI-generiert)“ bleibt als veröffentlichte Sonderfolge ausdrücklich so benannt. Die technische Prüfung verwendet aus dem Transkript abgeleitete Abfragen und ist **keine unabhängige menschliche Qualitätsabnahme**. Die frühere Vorgabe sekundengenauer Hörreferenzen wurde ausdrücklich aufgehoben. Ganze Archivverarbeitung und öffentliche Veröffentlichung sind hier nicht freigegeben.

## Browser und Abschlussprüfung

Die technischen Such-, Statistik- und Mobilbefunde werden nach der vollständigen Prüfung ergänzt.
