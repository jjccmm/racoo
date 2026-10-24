# Lokale Transkription mit FP32 auf der GPU

Aktiver Laufweg: **Parakeet-TDT-0.6B-v3, FP32, lokale GTX 1050 Ti**. Der vollständige UFO537-Test und die Nutzerabnahme begründen ungefähr **25× Echtzeit als Planungswert**. Die [Untersuchung](research/asr-investigation.md) enthält Messwerte, Grenzen und ausschließlich dokumentarische Hinweise zu früheren Laufwegen.

## Einmal einrichten

Am Repositoryroot mit Python 3.12, uv 0.10.9 und vorhandenem FFmpeg:

```powershell
$env:UV_CACHE_DIR = Join-Path $PWD '.uv-cache'
uv sync --locked
uv run --frozen python scripts/setup_local_asr.py
uv run --frozen podcast-words doctor
```

Gesperrt sind onnx-asr 0.12.0 und **ONNX Runtime GPU 1.20.1 aus Microsofts offiziellem CUDA-11-Paketindex**. Die geprüfte Karte benötigt vorhandenes **CUDA 11.8 und cuDNN 8.6**. Ihre DLLs liegen hier unter `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\bin`. Für einen anderen Installationsordner `PODCAST_WORDS_CUDA_BIN` setzen. Das Setupskript installiert keine Treiber und kein System-CUDA: Es lädt ausschließlich das kleine gepinnte zlib-WAPI-Paket, prüft Paket-/DLL-SHA-256 und legt DLL und Lizenz unter `.cache/asr/runtime/bin` ab. DLL-Suchpfade gelten nur im gestarteten Prozess.

`doctor` prüft Python und FFmpeg, lädt aber kein Modell und ist kein GPU-Ausführungsnachweis. Erst ein ausdrücklich gestarteter Transkriptionslauf lädt gegebenenfalls die etwa 2,55 GB FP32-Gewichte. Der Lader verlangt CUDA-fähige Encoder-/Decoder-Sessions; ausschließlich auf CPU geladene ASR wird abgelehnt. VAD und NumPy-Vorverarbeitung laufen bewusst auf CPU. Kleine Nebenoperationen des ASR-Graphen dürfen auf CPU verbleiben.

## Ausgewählte Folgen verarbeiten

```powershell
uv run --frozen podcast-words process --catalog data/podcast-ufo/catalog.json --episode-id ep-5764a1149f18a8f68698fb45bb405264 --output-dir data/podcast-ufo/episodes --run-report .cache/asr/run.json
```

Mit weiteren `--episode-id`-Angaben mehrere ausdrücklich ausgewählte Folgen verarbeiten. Das Modell wird einmal pro Lauf geladen. Jede fertige Folge wird validiert und dauerhaft gespeichert, bevor ihr Katalogstatus `completed` wird. Derselbe Aufruf überspringt fertige Folgen; fehlgeschlagene Arbeit kann erneut gestartet werden. `--retranscribe` ersetzt einen vorhandenen Transkriptstand ausdrücklich. Metadaten- oder Modellabweichungen werden beim Überspringen gemeldet und lösen keine automatische Neutranskription aus.

Für bereits heruntergeladenes Audio `--audio-file <Datei>` verwenden; nur bei genau einer ausgewählten Folge. So wird dieselbe Audiofassung erneut verarbeitet. Alte INT8-Transkripte bleiben bis zur ausdrücklich gewählten FP32-Neuverarbeitung erhalten. Die Veröffentlichung prüft weiterhin kompatible Transkriptionskonfigurationen.

Der Einzelbefehl `transcribe` akzeptiert alternativ explizite Metadaten und einen neuen JSON-Ausgabepfad:

```powershell
uv run --frozen podcast-words transcribe --metadata docs/research/evidence/ufo537-asr-input.json --audio-file .cache/reference.mp3 --output .cache/episode-fp32.json --run-report .cache/asr/single-run.json
```

Das Beispiel setzt eine bewusst gewählte lokale Datei `.cache/reference.mp3` voraus. Ein vorhandenes Einzel-Ausgabeziel wird nicht überschrieben.

## Audiofassung erhalten und prüfen

Die öffentliche Folgen-URL ist eine **Bezugsquelle**, keine feste Audiofassung. Acast liefert clientabhängige Werbefassungen. Neue Verarbeitungen erhalten die tatsächliche Eingabe unter `.cache/asr/audio/<sha256>.<format>`; der Laufbericht nennt `reference_audio_file`, Hash, Dateigröße und decodierte Dauer. Die Datei wird vor und nach der Erkennung geprüft. Eine später geladene andere Fassung überschreibt diese Referenz nicht.

Bei einer Abweichung von mehr als einer Sekunde zwischen Online- und Transkriptdauer stoppt der Player automatische Sprünge und erklärt die andere Audiofassung. Unter **„Transkribierte Audiodatei öffnen“** kann die lokale Referenz gewählt werden. Ihr SHA-256 wird im Browser geprüft; nur die passende Datei bestätigt die Zeitachse. Die Datei wird nicht hochgeladen. Gleiche Online-Länge allein beweist keine identischen Bytes. Eine dauerhaft garantierte Online-Referenz bietet der geprüfte Acast-Link nicht.

Audio, Modelle und Laufcaches bleiben außerhalb von Git. Referenzdateien erst bewusst löschen, wenn Hörprüfung und Wiederverarbeitung sie nicht mehr benötigen. Die bestätigte UFO537-Hörreferenz bleibt zusätzlich unter `.cache/local-gpu-fp32-full-ufo537-2026-10-24/source.mp3`; die unveränderten TXT-Ausgaben sind im [Untersuchungsbericht](research/asr-investigation.md) verlinkt.

## Messungen und Prüfung

`--run-report` erfasst Download, Modell-/VAD-Aufbau, Decodierung, Erkennung und Ergebnisprüfung/Speicherung getrennt. Die Erkennung enthält VAD und Vorverarbeitung und ist keine isolierte GPU-Kernelzeit. Modellsetup und Unterzeiten nicht doppelt addieren; Cachezustand, Eingabehash und Runtime gehören zum Vergleich. Die aktive Pipeline enthält keine Profilierungs- oder Benchmarkmodi.

Routineprüfungen laufen mit kleinen Modelldoubles und echter FFmpeg-Decodierung ohne GPU und Downloads. Runtimeänderungen zusätzlich durch einen kurzen echten GPU-Lauf prüfen. Such- und Zeitmarkenreferenzen für den gesamten Pilotbestand bleiben unabhängig von der akzeptierten einzelnen Transkriptqualität zu erbringen.
