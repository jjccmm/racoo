# Transkription auf Windows-CPU

`podcast-words transcribe` verarbeitet eine ausdrücklich identifizierte Audiofassung. Die Folgenidentität wird unverändert übernommen. Der Befehl berechnet keine Identität aus Titel, Nummer oder Audioadresse.

## Eingabe und Aufruf

Die Metadatendatei enthält `podcast_id`, `episode_id`, `source`, `title`, `published_at`, `audio_url` sowie optional `episode_number` und `webpage_url`. `source` entspricht dem [Episodenvertrag](data-contracts.md). Die Identität und Quelle kommen aus dem Katalog oder einer ausdrücklich geprüften Quellenzuordnung.

```powershell
$env:UV_CACHE_DIR = Join-Path $PWD '.uv-cache'
uv sync --locked
uv run --frozen podcast-words transcribe --metadata .cache/episode-input.json --output data/podcast-ufo/episodes/EPISODEN-ID.json
uv run --frozen podcast-words validate data/podcast-ufo/episodes/EPISODEN-ID.json
```

`--audio-file PFAD` verwendet bereits heruntergeladene Originalbytes derselben Quelle. Damit lassen sich dieselbe Werbefassung und Prüfsumme wiederverwenden. Der Operator muss die Zuordnung zur angegebenen Quelle sicherstellen. Ausschnitte sind keine vollständigen Folgen. `--cache-dir` liegt standardmäßig unter `.cache/asr`; Audio, Modelle und temporäre WAV-Dateien bleiben untracked. Die WAV-Dateien werden nach dem Lauf entfernt.

Ohne lokale Datei lädt der Befehl Audio mit höchstens drei Versuchen, 30 Sekunden Socket-Timeout und 600 Sekunden Gesamtdauer je Versuch. FFmpeg decodiert die gesamte Timeline zu mono PCM16 mit 16 kHz; sein Timeout beträgt 900 Sekunden. SHA-256 bezieht sich auf die unveränderten Eingabebytes, die Dauer auf die decodierte Timeline. Ein vorhandenes Ausgabeziel wird mit Fehler erhalten. Das Schreiben unterbruchsicherer Checkpoints und die Wiederaufnahme mehrerer Folgen gehören zum nachfolgenden Workflow-Ticket 09.

Erfolg und Fehler liefern JSON-Diagnostik und einen passenden Exitstatus. Das Ergebnis wird erst nach vollständiger semantischer Episodenvalidierung geschrieben. `Transcriber` hält ein Modell für mehrere Aufrufe im selben Prozess geladen. Der normale Offline-Check lädt keine Modellgewichte oder Audios und verwendet ausschließlich externe Modellfixtures.

## Gesperrte Konfiguration

- Python 3.12, `onnx-asr==0.12.0`, `onnxruntime==1.27.0`; alle transitiven Paketstände stehen in `uv.lock`.
- Modell: [NVIDIA Parakeet-TDT-0.6B-v3](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3/tree/541d1f99c6b0c3cd0b11a95167540bb8edefd82b), ausgewählte Upstream-Metadatenrevision `541d1f99c6b0c3cd0b11a95167540bb8edefd82b`.
- Tatsächlich verwendeter [ONNX-Export](https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx/tree/8f23f0c03c8761650bdb5b40aaf3e40d2c15f1ce): `8f23f0c03c8761650bdb5b40aaf3e40d2c15f1ce`, `encoder-model.int8.onnx`, `decoder_joint-model.int8.onnx`, `config.json`, `vocab.txt`.
- [Silero-Export](https://huggingface.co/istupakov/silero-vad-onnx/tree/b3e3ee3cce4c11ceb63b1a0b229d916069c1ddf6): `b3e3ee3cce4c11ceb63b1a0b229d916069c1ddf6`, `silero_vad.onnx`, `config.json`.
- VAD: Batchgröße 1, höchstens 20 Sekunden Sprache, mindestens 250 ms Sprache, 100 ms Pause, Padding 0 ms, Schwellwert 0,5. Padding 0 verhindert überlappende Segmentgrenzen. Vier ORT-Intra-Op-Threads; CPU-only für Encoder, Decoder und VAD.

Die Exportmodellkarte benennt das NVIDIA-Modell, attestiert aber keinen genauen Upstream-Commit des Exportvorgangs. `model_revision` bezeichnet hier die ausgewählte immutable Upstream-Metadatenrevision; `export_revision` bezeichnet den nachweislich geladenen Export. Eine kryptografisch oder vom Exporteur bestätigte Verbindung zwischen diesen beiden Commits ist damit **nicht** nachgewiesen. Die tatsächlichen Inferenzartefakte sind durch die Exportrevision festgelegt.

Die Ausgabe protokolliert die Anbieter der tatsächlichen ORT-Sessions über `get_providers()`. Eine Liste verfügbarer Anbieter allein würde keine Inferenz belegen. Die Erkennung liest dafür beim gesperrten onnx-asr-Stand die Encoder-, Decoder- und VAD-Sessions aus; ein Versionswechsel muss diese Integration erneut prüfen. Colab-GPU ist ein eigener, noch ausstehender Nachweis.

## Zeitvertrag

Der [gesperrte Decoder](https://github.com/istupakov/onnx-asr/blob/v0.12.0/src/onnx_asr/asr.py) multipliziert Frameindizes bereits mit `window_step=0.01` und dem Subsamplingfaktor des Modells (hier 8). Native Tokenpunkte sind somit Sekunden ab dem Anfang des erkannten Sprachabschnitts. Der [gesperrte VAD](https://github.com/istupakov/onnx-asr/blob/v0.12.0/src/onnx_asr/vad.py) teilt seine Samplegrenzen durch die Samplerate und übernimmt die Tokenpunkte unverändert.

Der Adapter addiert deshalb **einmal** den Segmentbeginn zu jedem nativen Tokenpunkt. Beispiel: VAD-Start 60 Sekunden plus nativer Punkt 4 Sekunden ergibt 64 Episodensekunden. Er skaliert die bereits umgerechneten Sekunden nicht erneut. Tokenpunkte bleiben native Tokens; sie sind keine zugesicherten Wortanfangs-/Wortendeintervalle. Ungültige Zeiten, Überlappung, doppelte Segment-IDs, uneinheitliche Token-/Zeitlisten oder eine vollständig leere Erkennung ergeben kein erfolgreich gespeichertes Transkript.

Der Offline-Test führt diese Beispiele über den öffentlichen Befehl, echtes FFmpeg-Decoding und den vollständigen Episodenvalidator. Er belegt die Adapterumrechnung, aber keine Erkennungsqualität oder zeitliche Übereinstimmung mit unabhängig abgehörtem Audio. Der echte Lauf und seine verbleibenden Qualitätsgrenzen stehen im [CPU-Laufbericht](research/windows-cpu-asr-proof.md).

Ein separat gestarteter realer Zeitversuch steht unter `scripts/prove_asr_offset.py`: Er erkennt einen kurzen Ausschnitt sowie dieselben PCM-Bytes mit 60 Sekunden Stille davor und speichert ausdrücklich synthetische Prüfergebnisse im angegebenen Cacheordner. `--reuse` validiert und vergleicht vorhandene Ergebnisse ohne erneute Inferenz. Rekurrente VAD-Zustände können die Segmentierung ändern; ein nicht vergleichbarer Versuch darf deshalb nicht als bestandener Qualitätsnachweis gelten. Dieser Befehl gehört nicht zu `scripts/check.py`.
