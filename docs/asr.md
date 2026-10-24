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

Der Einzelbefehl `transcribe` akzeptiert alternativ Metadaten und einen neuen JSON-Ausgabepfad. Die Audioquelle wird aus den Metadaten geladen; ein vorhandenes Einzel-Ausgabeziel wird nicht überschrieben:

```powershell
uv run --frozen podcast-words transcribe --metadata docs/research/evidence/ufo537-asr-input.json --output .cache/episode-fp32.json --run-report .cache/asr/single-run.json
```

## Audio und grobe Segmente

Der Ablauf lautet: Feed-/Katalogeintrag → temporärer Download → FFmpeg → CPU-VAD und Parakeet FP32/CUDA → grobe Textsegmente → validiertes Episoden-JSON → Audio löschen. Auch bei Fehlern werden temporäre MP3-/WAV-Dateien entfernt. Modellgewichte bleiben im Cache. Fertige Transkripte werden bei Wiederaufnahme ohne Download, Hashprüfung oder Abgleich mit der Online-MP3 verwendet.

Etwa fünfminütige Segmente enthalten nur ID, Text, Start und Ende. Der Lader fordert keine Wortzeitpunkte an. Sprachabschnitte werden zusammengefasst, bevor eine gemeinsame Zeitspanne von 300 Sekunden überschritten würde; der erkannte Text bleibt in Reihenfolge erhalten. Pagefind braucht Text und Segmentanker, spaCy nur die Texte.

Der Player springt zum Segmentanfang. Die öffentliche Acast-Quelle darf inzwischen andere Werbung enthalten. Ein sichtbarer Hinweis unmittelbar bei jedem Sprungknopf erklärt diese Ungenauigkeit. Es gibt weder Dateiauswahl noch Fassungsprüfung oder Wiedergabesperre wegen anderer Dauer.

## Laufzeiten

Jede gespeicherte Episode enthält `timings.download_seconds`, `transcription_seconds` und `total_seconds`. Der Download umfasst den tatsächlichen Abruf. Die Transkriptionszeit ist die Erkennung einschließlich CPU-VAD und NumPy-Vorverarbeitung; FFmpeg ist separat im Laufbericht messbar. Die Gesamtzeit umfasst Download, Decodierung, Erkennung, Audio-Cleanup und Validierung. Abschließende Transkript-/Berichtserialisierung liegt außerhalb und wird separat protokolliert. Das einmalige Modell-/VAD-Setup wird separat für den Lauf ausgewiesen und nicht erneut zu jeder Folge addiert.

Für jede fertig verarbeitete Folge geht eine lesbare Statuszeile nach stderr: Audiogesamtdauer, Verarbeitungsgesamtdauer, Downloadsekunden je Audiominute und Transkriptionssekunden je Audiominute. stdout bleibt maschinenlesbares JSON. Die Webseite zeigt Dauer und gemessene Download-/Transkriptionszeiten in der Folgenübersicht. Synthetische Testwerte sind keine Leistungsnachweise.

`--run-report` hält zusätzliche Stufen und Runtime fest. Unterzeiten nicht doppelt addieren; Modellcache und Umgebung beim Vergleich angeben. Die aktive Pipeline enthält keine Profilierungs- oder Benchmarkmodi. Frühere CPU-/Colab-Ergebnisse und Hinweise für FP32 auf Colab stehen ausschließlich in der [Untersuchung](research/asr-investigation.md).

Routineprüfungen laufen mit kontrollierten Modellantworten und echter FFmpeg-Decodierung ohne GPU/Downloads. Der [lokale Pilot](pilot/local-five-episode-pilot.md) dokumentiert die tatsächlichen fünf GPU-Verarbeitungen, Suche und Statistik.
