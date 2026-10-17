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

Ohne lokale Datei lädt der Befehl Audio mit höchstens drei Versuchen, 30 Sekunden Socket-Timeout und 600 Sekunden Gesamtdauer je Versuch. FFmpeg decodiert die gesamte Timeline zu mono PCM16 mit 16 kHz; sein Timeout beträgt 900 Sekunden. SHA-256 bezieht sich auf die unveränderten Eingabebytes, die Dauer auf die decodierte Timeline. Ein vorhandenes Ausgabeziel wird mit Fehler erhalten. Mehrfolgen- und Fortsetzungsabläufe verwenden den unten beschriebenen `process`-Befehl.

Erfolg und Fehler liefern JSON-Diagnostik und einen passenden Exitstatus. Das Ergebnis wird erst nach vollständiger semantischer Episodenvalidierung geschrieben. `Transcriber` hält ein Modell für mehrere Aufrufe im selben Prozess geladen. Der normale Offline-Check lädt keine Modellgewichte oder Audios und verwendet ausschließlich externe Modellfixtures.

## Messläufe und ORT-Profile

`process --run-report PFAD` schreibt getrennte maschinenlesbare Laufzeitdaten. Der Bericht enthält Audio- und Modellcachezustand, Audiohash/-bytes, Modell-/VAD-Ladegrenzen, Encoder-/Decoder- und VAD-Sitzungsaufbau, Decode, Inferenz, Validierung/Serialisierung, Profilabschluss/-analyse und die Gesamtlaufzeit des CLI-Aufrufs. Hugging-Face-Cachedateibytes bezeichnen materialisierte Modellgewichte; die übertragenen Netzwerkbytes bleiben unbekannt. Audioübertragungsbytes sind separat messbar. Laufberichte sind Benchmarkartefakte und gehören in `.cache/`, nicht in die Episodenablage.

`--audio-file` ist bei `process` auf genau eine Folgen-ID begrenzt. Zusammen mit `--retranscribe` erzwingt es einen neuen Lauf mit denselben verifizierten Bytes, auch wenn bereits ein gültiges Ergebnis existiert. Das Ausgabeverzeichnis sollte dafür getrennt bleiben, damit Messläufe bestehende Transkripte nicht ersetzen.

Die GPU-Voreinstellung profiliert weiterhin automatisch und verlangt mindestens einen tatsächlich ausgeführten CUDA-Modellknoten. `--profile` erzwingt Profilierung für einen Kontrolllauf; `--no-profile` misst den Aufwand ohne Profilierung. Ein solcher GPU-Lauf erhält ausdrücklich keinen Ausführungsnachweis. Ein Profil-on-Lauf muss denselben Eingang, Modell-/VAD-Stand, Commit und Cachezustand wie der Kontrolllauf verwenden.

Bereits vorhandene Rohprofile lassen sich ohne erneute Inferenz streamend auswerten:

```powershell
uv run --frozen podcast-words profile-summary `
  --profile encoder=.cache/asr/profiles/encoder-trace.json `
  --profile decoder_joint=.cache/asr/profiles/decoder-trace.json `
  --profile vad=.cache/asr/profiles/vad-trace.json `
  --output .cache/asr/profile-summary.json
```

Die Zusammenfassung meldet Dateibytes, `Node`-Ereignisse und Host-Operator-Dauersummen nach Anbieter, vorhandene `Kernel`-Ereignisse, erkennbare Übertragungs-/Synchronisationsereignisse und den beobachteten Ereigniszeitraum. Node-Dauern sind Hostzeiten und können sich durch parallele Ausführung überlappen. GPU-Kernzeiten werden nur bei vorhandenen `Kernel`-Ereignissen ausgewiesen; laut [ONNX-Runtime-Profilingdokumentation](https://onnxruntime.ai/docs/performance/tune-performance/profiling-tools.html) benötigen sie CUPTI und einen entsprechend gebauten ORT. Rohereignisdauern sind keine Wandzeit.

## Ausgewählte Folgen verarbeiten und fortsetzen

Der gemeinsame Katalogbefehl verarbeitet nur die ausdrücklich genannten stabilen Folgen-IDs. Er liest Titel, Quelle, Datum und erste Audio-Enclosure aus dem Katalog und speichert pro Folge eine validierte Datei:

```powershell
uv run --frozen podcast-words process --catalog data/podcast-ufo/catalog.json --episode-id ep-ERSTE_ID --episode-id ep-ZWEITE_ID --output-dir data/podcast-ufo/episodes
```

Ein erneuter Aufruf mit derselben Auswahl ist die Fortsetzung. Vollständig validierte vorhandene Dateien werden übersprungen; unvollständige oder ungültige Dateien bleiben retrybar. Das Modell wird nur geladen, wenn mindestens eine ausgewählte Folge wirklich transkribiert werden muss, und eine Modellinstanz verarbeitet dann die ganze Auswahl. Audio-Downloads verwenden weiterhin höchstens drei begrenzte Versuche. Fehler werden je Folge ausgegeben; der Befehl liefert Exitstatus 1 bei Verarbeitungsfehlern und 130 bei einer Unterbrechung.

Die Episodendatei wird zuerst in eine temporäre Datei im Zielordner geschrieben, erneut vollständig validiert und atomar eingesetzt. Erst danach erhält der Katalog den Zustand `completed`. Ein Abbruch oder Fehler lässt keine Teil-Ausgabe als fertig gelten. Bei einem erneuten Lauf wird die erhaltene vollständige Datei erkannt und nicht noch einmal transkribiert.

Katalog-Metadaten- und Konfigurationsabweichungen eines gespeicherten Ergebnisses erscheinen in der JSON-Diagnose. Sie lösen keine neue Erkennung aus; erkannter Text und Zeiten bleiben wie transkribiert erhalten. Eine Folge wird nur mit ihrer expliziten ID und `--retranscribe` neu erkannt. Auch dann ersetzt die neue Datei eine vorhandene gültige Datei erst nach erfolgreicher Erkennung und Validierung.

`transcription.input_revision` enthält die SHA-256-Prüfsumme der verarbeiteten Audio-Bytes. `configuration_revision` bindet Modell-, Export-, VAD-, Quantisierungs-, Anbieter-, Laufzeit- und Dekodiereinstellungen. `transcript_revision` bindet geordnete Segmente, Audio-Prüfsumme und Konfigurationsrevision. Diese Werte erlauben nachfolgenden Analyse- und Veröffentlichungsschritten, verbrauchte Inhalte zu vergleichen. Metadatenänderungen sind davon getrennt.

## Übertragene Ergebnisse sicher importieren

Ergebnisse aus einem anderen Lauf, etwa aus einer Colab-Sitzung, lassen sich ohne erneute ASR-Verarbeitung übernehmen. Das Notebook legt die Folgen-JSONs unter `/content/drive/MyDrive/podcast-words-v3/episodes` ab. Nach dem Lauf diese JSON-Dateien in das lokale Transferverzeichnis herunterladen oder kopieren; `--catalog` verweist auf den lokal verifizierten Katalog. Der Import gleicht nicht automatisch zwei Katalogdateien zusammen.

```powershell
uv run --frozen podcast-words import-results --catalog data/podcast-ufo/catalog.json --input-dir .cache/transfer/episodes --output-dir data/podcast-ufo/episodes
```

Der Import prüft jede Episodendatei gegen den lokalen Katalog, einschließlich stabiler ID und ausschließlich dort verifizierter GUID-Aliase. Er verlangt ein semantisch gültiges, abgeschlossenes Ergebnis mit Audio-Prüfsumme, Modell-, Export- und Laufzeitangaben. Gleiche vorhandene Erkennungsergebnisse werden übersprungen. Ein abweichender Transkripttext, Audioinhalt oder eine abweichende Verarbeitungskonfiguration wird als Konflikt ausgegeben; die gespeicherte Datei bleibt erhalten. Abweichende Titel- und Folgemetadaten werden gesondert gemeldet und ersetzen keine Erkennung.

Die JSON-Ausgabe nennt für jede Eingabedatei den Status und die verbrauchten Audio-, Konfigurations- und Transkriptfingerabdrücke. Bei Fehlern oder Konflikten ist der Exitstatus 1. Schema-v1-Ergebnisse ohne die optionalen Revisionsfelder älterer Verarbeitungsstände bleiben importierbar, wenn ihre vollständigen ASR-Provenienzfelder vorliegen; der Bericht kennzeichnet diese Legacy-Provenienz ausdrücklich. Teilweise vorhandene oder widersprüchliche Revisionen werden abgewiesen. Der Befehl lädt weder Audio noch Modelle und startet keine Erkennung.
## Gesperrte Konfiguration

- Python 3.12, `onnx-asr==0.12.0`, `onnxruntime==1.27.0`; alle transitiven Paketstände stehen in `uv.lock`.
- Modell: [NVIDIA Parakeet-TDT-0.6B-v3](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3/tree/541d1f99c6b0c3cd0b11a95167540bb8edefd82b), ausgewählte Upstream-Metadatenrevision `541d1f99c6b0c3cd0b11a95167540bb8edefd82b`.
- Tatsächlich verwendeter [ONNX-Export](https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx/tree/8f23f0c03c8761650bdb5b40aaf3e40d2c15f1ce): `8f23f0c03c8761650bdb5b40aaf3e40d2c15f1ce`, `encoder-model.int8.onnx`, `decoder_joint-model.int8.onnx`, `config.json`, `vocab.txt`.
- [Silero-Export](https://huggingface.co/istupakov/silero-vad-onnx/tree/b3e3ee3cce4c11ceb63b1a0b229d916069c1ddf6): `b3e3ee3cce4c11ceb63b1a0b229d916069c1ddf6`, `silero_vad.onnx`, `config.json`.
- VAD: Batchgröße 1, höchstens 20 Sekunden Sprache, mindestens 250 ms Sprache, 100 ms Pause, Padding 0 ms, Schwellwert 0,5. Padding 0 verhindert überlappende Segmentgrenzen. Vier ORT-Intra-Op-Threads; CPU-only für Encoder, Decoder und VAD.

Die Exportmodellkarte benennt das NVIDIA-Modell, attestiert aber keinen genauen Upstream-Commit des Exportvorgangs. `model_revision` bezeichnet hier die ausgewählte immutable Upstream-Metadatenrevision; `export_revision` bezeichnet den nachweislich geladenen Export. Eine kryptografisch oder vom Exporteur bestätigte Verbindung zwischen diesen beiden Commits ist damit **nicht** nachgewiesen. Die tatsächlichen Inferenzartefakte sind durch die Exportrevision festgelegt.

Die Ausgabe protokolliert die Anbieter der tatsächlichen ORT-Sessions über `get_providers()`. Eine Liste verfügbarer Anbieter allein würde keine Inferenz belegen. Die Erkennung liest dafür beim gesperrten onnx-asr-Stand die Encoder-, Decoder- und VAD-Sessions aus; ein Versionswechsel muss diese Integration erneut prüfen. Colab-GPU ist ein eigener, noch ausstehender Nachweis.

## Colab-GPU und Fortsetzung über Drive

Die normale `uv sync --locked`-Umgebung enthält die CPU-Gruppe. GPU-Abhängigkeiten sind als gegenseitig ausgeschlossene Gruppe gesperrt und werden nur im Colab-Laufzeitordner aktiviert:

```bash
uv sync --locked --no-default-groups --group gpu --python 3.12
PODCAST_WORDS_EXECUTION_PROVIDER=CUDAExecutionProvider uv run --frozen --no-default-groups --group gpu podcast-words process --catalog /content/catalog.json --episode-id EPISODEN-ID --output-dir /content/episodes --cache-dir /content/podcast-words-cache
```

Der Notebookeinstieg mountet Drive, kopiert vor einem Aufruf dort vorhandene Episodendateien in einen VM-Arbeitsordner und ruft anschließend denselben `process`-Befehl mit genau einer ID auf. Eine neue gültige Ausgabe wird nach Ende des Befehls atomar mit Katalog und Laufbericht nach Drive kopiert, bevor die nächste Folge beginnt. Audio, decodierte WAV-Dateien, Modellgewichte und ORT-Profile beginnen im temporären `/content`-Bereich; die Notebookzelle kopiert die vollständigen Profilberichte gesondert nach Drive. Nach einem neuen Colab-Backend werden vorhandene Drive-Ergebnisse wieder in den VM-Ordner gelegt und von der CLI geprüft und übersprungen. Fehlt zu einem solchen Ergebnis der frühere Profilbericht, muss die Folge gezielt mit `--retranscribe` erneut verarbeitet werden, bevor ein GPU-Nachweis beansprucht werden kann.

Die gesperrte Colab-Gruppe verwendet `onnxruntime-gpu==1.27.0`; die aktuelle ORT-Dokumentation ordnet die PyPI-GPU-Wheels ab 1.27 CUDA 13 und cuDNN 9 zu. CUDA 13 verlangt mindestens Treiberzweig 580 und passende CUDA-/cuDNN-Bibliotheken. Diese Systembibliotheken kommen von der Colab-VM und sind nicht durch `uv.lock` festgeschrieben; das Notebook prüft Treiber, ORT-DLL-Diagnose und echte Session-Erstellung vor dem Audioabruf und bricht bei fehlenden oder inkompatiblen Bibliotheken mit Diagnose ab. Deshalb hält das Notebook GPU-Typ, Treiber, CUDA-/ORT-Buildfakten sowie verfügbare Anbieter vor jeder Inferenz fest und stoppt ohne NVIDIA-GPU oder CUDA-Provider. Diese Laufzeitbeobachtung kann die tatsächliche Ausführung dennoch nicht belegen: Beim GPU-Aufruf schaltet die CLI ORT-Profiling ein, beendet nach der Transkription die Encoder-, Decoder- und VAD-Sessions, zählt ausgeführte `Node`-Ereignisse je Anbieter. ONNX Runtime 1.27 versieht Profilnamen beim Sessionstart mit einem Zeitstempel in Millisekunden; die CLI benennt die zurückgegebenen Dateien zusätzlich nach Sessionrolle und bricht bei kollidierenden Profilpfaden ab. Der Lauf schlägt fehl, wenn in den ASR-Modellsessions kein CUDA-Knoten ausgeführt wurde. CPU-Knoten bleiben sichtbar und werden als mögliche gemischte Ausführung ausgewiesen, insbesondere bei int8-Operatoren.

Die Abhängigkeiten und Pinninghinweise stützen sich auf die [Installationsanleitung von onnx-asr 0.12.0](https://istupakov.github.io/onnx-asr/installation/), die [CUDA-Anforderungen und GPU-Pakete von ONNX Runtime](https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html), die [Profiling-Ausgabe von ONNX Runtime](https://onnxruntime.ai/docs/performance/tune-performance/profiling-tools.html) und die [Profilnamenbildung im gepinnten ONNX-Runtime-1.27-Code](https://github.com/microsoft/onnxruntime/blob/v1.27.0/onnxruntime/core/session/inference_session.cc) und die [NVIDIA-Treibermatrix](https://docs.nvidia.com/deploy/cuda-compatibility/minor-version-compatibility.html). Colab-Ressourcen sind [nicht garantiert](https://research.google.com/colaboratory/faq.html). Eine aktuelle Laufzeit muss deshalb separat geprüft werden; das reproduzierbare Offline-Testset fordert weder GPU, Audio- noch Modell-Downloads an.

## Zeitvertrag

Der [gesperrte Decoder](https://github.com/istupakov/onnx-asr/blob/v0.12.0/src/onnx_asr/asr.py) multipliziert Frameindizes bereits mit `window_step=0.01` und dem Subsamplingfaktor des Modells (hier 8). Native Tokenpunkte sind somit Sekunden ab dem Anfang des erkannten Sprachabschnitts. Der [gesperrte VAD](https://github.com/istupakov/onnx-asr/blob/v0.12.0/src/onnx_asr/vad.py) teilt seine Samplegrenzen durch die Samplerate und übernimmt die Tokenpunkte unverändert.

Der Adapter addiert deshalb **einmal** den Segmentbeginn zu jedem nativen Tokenpunkt. Beispiel: VAD-Start 60 Sekunden plus nativer Punkt 4 Sekunden ergibt 64 Episodensekunden. Er skaliert die bereits umgerechneten Sekunden nicht erneut. Tokenpunkte bleiben native Tokens; sie sind keine zugesicherten Wortanfangs-/Wortendeintervalle. Ungültige Zeiten, Überlappung, doppelte Segment-IDs, uneinheitliche Token-/Zeitlisten oder eine vollständig leere Erkennung ergeben kein erfolgreich gespeichertes Transkript.

Der Offline-Test führt diese Beispiele über den öffentlichen Befehl, echtes FFmpeg-Decoding und den vollständigen Episodenvalidator. Er belegt die Adapterumrechnung, aber keine Erkennungsqualität oder zeitliche Übereinstimmung mit unabhängig abgehörtem Audio. Der echte Lauf und seine verbleibenden Qualitätsgrenzen stehen im [CPU-Laufbericht](research/windows-cpu-asr-proof.md).

Ein separat gestarteter realer Zeitversuch steht unter `scripts/prove_asr_offset.py`: Er erkennt einen kurzen Ausschnitt sowie dieselben PCM-Bytes mit 60 Sekunden Stille davor und speichert ausdrücklich synthetische Prüfergebnisse im angegebenen Cacheordner. `--reuse` validiert und vergleicht vorhandene Ergebnisse ohne erneute Inferenz. Rekurrente VAD-Zustände können die Segmentierung ändern; ein nicht vergleichbarer Versuch darf deshalb nicht als bestandener Qualitätsnachweis gelten. Dieser Befehl gehört nicht zu `scripts/check.py`.
