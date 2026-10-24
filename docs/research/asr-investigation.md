# ASR-Untersuchung und Entscheidung: lokal mit FP32

Stand: 24. Oktober 2026. Der Nutzer hat das vollständige lokale FP32-Transkript gegen die tatsächlich verwendete MP3 geprüft und die Qualität als ausreichend bestätigt. **Aktiver Laufweg ist ausschließlich Parakeet-TDT-0.6B-v3 in FP32 auf der lokalen GTX 1050 Ti. Als Planungswert gelten etwa 25× Echtzeit.** Eine Stunde Audio benötigt damit ungefähr 2:24 Minuten Erkennung; dies ist ein Planungswert, keine Garantie für jede Folge.

Die früheren CPU-/Colab-Laufwege sind aus Anwendung, Abhängigkeitsschaltern und CLI entfernt. Diese Dokumentation bewahrt die Ergebnisse und eine Anleitung für einen möglichen späteren Colab-Versuch. Die Pilotabnahme für Suchqualität, Referenzzeitmarken und mobiles Verhalten bleibt separat bestehen.

## Vergleich kurzer Ausschnitte

Jeweils 120 Sekunden Audio ab Minute fünf, vollständiger Aufwärmlauf und anschließend drei Wiederholungen ohne Profilierung. Angegeben ist der Median der tatsächlich ausgeführten Erkennung. Modellladen, Download, FFmpeg und Ergebnisprüfung liegen außerhalb. VAD/Vorverarbeitung und Ergebnisaufbau liegen innerhalb.

| Messreihe | Modell / Laufweg | Median | Bemerkung |
| --- | --- | ---: | --- |
| Erste Colab-Diagnose | INT8 / T4-CUDA | 50,669 s | Gemischte GPU-/CPU-Ausführung |
| Erste Colab-Diagnose | INT8 / Colab-CPU | 54,976 s | Derselbe eingefrorene Ausschnitt |
| Erste Colab-Diagnose | FP32 / T4-CUDA | keine Inferenz | Fehler beim Laden externer Gewichte |
| Erfolgreiche Colab-Diagnose | FP32 / T4-CUDA | **7,076 s** | Drei erfolgreiche Wiederholungen |
| Erfolgreiche Colab-Diagnose | INT8 / T4-CUDA | 53,000 s | Drei erfolgreiche Wiederholungen |
| Erfolgreiche Colab-Diagnose | INT8 / Colab-CPU | 59,757 s | Drei erfolgreiche Wiederholungen |
| Lokal, eigener Kontrollvergleich | FP32 / GTX 1050 Ti | **3,877 s** | Drei erfolgreiche Wiederholungen |
| Lokal, eigener Kontrollvergleich | INT8 / lokale CPU | 12,270 s | Dieselben lokalen Audiodaten |

FP32 ist im kontrollierten Colab-Vergleich etwa **7,49×** schneller als INT8/CUDA. Lokal erreicht GPU-FP32 gegenüber CPU-INT8 etwa **3,16×** Durchsatz; dies vergleicht zwei vollständige Laufwege und isoliert weder Präzision noch Hardware. **Ein direkter Geschwindigkeitsvergleich T4 gegen GTX 1050 Ti ist damit nicht belegt:** Die Audiofassungen, Runtime und Vorverarbeitung unterscheiden sich. Nicht gemessen wurden FP32 auf CPU und INT8 auf der lokalen GPU.

Colab lief mit Python 3.12.3, onnx-asr 0.12.0, ORT GPU 1.27.0, NumPy 2.5.4, Hub 2.2.0, zwei logischen CPUs und vier Intra-Op-Threads. Die T4 hatte 15.360 MiB und Treiber 580.82.07. Lokal liefen Python 3.12.9, onnx-asr 0.12.0, ORT GPU 1.20.1 als CUDA-11-Build, NumPy 2.5.4 und Hub 2.2.0. CPU-Host: Intel Family 6 Model 94 Stepping 3, acht logische CPUs; vier Intra-Op-Threads. Alle Läufe nutzten Batchgröße eins und gepinnte Parakeet-/VAD-Revisionen.

Die [zusammengefasste historische Evidenz](evidence/asr-investigation-2026-10-24.json) bewahrt die ursprünglichen kompakten Berichte samt Herkunfts- und Dateihashes. Der [lokale Kurzvergleich](evidence/windows-gpu-fp32-2026-10-24.json) enthält Einzelwerte, Einstellungen, Ausführungsnachweis und Grenzen.

## Vollständige Folge lokal

UFO537 Festival, frisch geladen, **4.346,4881875 Sekunden = 72:26,49 Minuten**. Ein vollständiger erster Lauf nach dem Modellaufbau, ohne zusätzliche Aufwärmrunde, Wiederholung oder Vollprofilierung:

| Stufe | Gemessene Zeit |
| --- | ---: |
| Audio-Download, 69.543.927 Byte | 2,364 s |
| FFmpeg-Decodierung nach mono PCM16 / 16 kHz | 5,209 s |
| Modell und VAD aus vorhandenen Gewichten initialisieren | 3,701 s |
| Erkennung einschließlich CPU-VAD und NumPy-Vorverarbeitung | **147,562 s = 2:27,56 min** |
| Abschließende Validierung, Integritätsprüfung und Export | 0,822 s |
| Gesamt inklusive Imports, Hashprüfungen und Restarbeit | **161,007 s = 2:41,01 min** |

Das Modellsetup enthält 3,522 Sekunden ASR- und 0,180 Sekunden VAD-Initialisierung; nicht zusätzlich addieren. Runtime-/DLL-Imports dauerten separat 0,644 Sekunden. Die Gewichte und Umgebung waren vorhanden; Paketinstallation und kalter Modelldownload wurden in diesem Lauf nicht gemessen. Die frühere kombinierte FP32-Modell-/Audiovorbereitung dauerte 85,841 Sekunden und ist keine isolierte Modelldownloadmessung.

Gemessener Durchsatz: **29,46× Echtzeit für die Erkennung**, rund **27,00×** für den gesamten Worker. Der konservativere Planungswert von ungefähr 25× ist vom Nutzer bestätigt. Die höchste alle 0,5 Sekunden beobachtete ganze GPU-Belegung lag bei **3,84 von 4 GiB**, einschließlich Desktop und anderer Programme; dies ist weder ein isolierter Prozesswert noch ein garantierter exakter Peak. Im kurzen Versuch waren es 3,58 GiB.

Ausgegeben wurden 977 Abschnitte, davon 966 mit Text und etwa 12.305 durch Leerraum getrennten Wörtern. Originaltext bleibt unverändert. Segment-/Token-/Zeitgrenzen und Eingabe-/Ausgabehashes sind validiert. Die Nutzerabnahme betrifft die Textqualität dieser Folge; daraus folgt noch keine formale Abnahme aller Pilotzeitmarken oder Suchanfragen.

- [Vollständiger Text](evidence/windows-gpu-fp32-full-ufo537-2026-10-24/UFO537-Festival-FP32.txt)
- [Text mit Abschnittszeitmarken](evidence/windows-gpu-fp32-full-ufo537-2026-10-24/UFO537-Festival-FP32-mit-Zeitmarken.txt)
- [Vollständiger Messbericht](evidence/windows-gpu-fp32-full-ufo537-2026-10-24/report.json)

Die exakte Referenz-MP3 bleibt lokal unter `.cache/local-gpu-fp32-full-ufo537-2026-10-24/source.mp3`. SHA-256: `96ed332afdc78f1a71f30c5bc3fd1eb475c3de9a7914707f18f1a14cc081b357`.

## Warum INT8 auf Colab langsam war

Der dynamisch quantisierte Export verteilte die Arbeit ungünstig zwischen CPU und CUDA. Die Profile zeigen auf CPU insbesondere Encoder-`MatMulInteger` und `ConvInteger` sowie Decoder-`DynamicQuantizeLSTM` und `MatMulInteger`, begleitet von vielen Transfers. FP32 verschiebt die teuren Conv-/MatMul-/LSTM-Operationen auf CUDA; kleine Form-/Indexoperationen dürfen auf CPU verbleiben. Das ist ein Befund für diesen Export und diese Runtime, keine allgemeine Aussage, dass GPUs keine INT8-Berechnung beschleunigen könnten.

Die ersten vollständigen Colab-Messungen verwendeten 4.513,12325 Sekunden Audio (75:13). Kalter CLI-Aufruf 2.069,460 Sekunden; warm ohne Profilierung **1.949,370 Sekunden (32:29,37)**, davon 1.924,969 Sekunden Erkennung. Warm mit Profilierung **2.420,527 Sekunden (40:20,53)**; die Erkennung selbst dauerte 2.294,275 Sekunden und Profilabschluss/-auswertung zusätzlich 95,813 Sekunden. Jeder dieser Modi hat n=1. Der beobachtete Unterschied von 24,2 % ist deshalb keine präzise Schätzung eines isolierten Profilierungsaufschlags. Drei vollständige Läufe zusammen erklären die 1:47:37 Stunden der Benchmarkzelle; die separate Abhängigkeitseinrichtung dauerte 8,240 Sekunden.

Die drei großen Rohprofile umfassten 2,281 GB und erreichten jeweils das Limit von einer Million Ereignissen. Späte Ereignisse fehlen; Host-Node-Dauern sind keine GPU-Kernelzeiten und dürfen wegen Überlappung nicht zu Wandzeitanteilen addiert werden. Die späteren separaten Achtsekundenprofile erreichen das Limit nicht und bestätigen die tatsächliche CUDA-Platzierung. Das lokale FP32-Profil enthält 7.624 ausgeführte CUDA-Modellknoten.

Historisch benötigte der erste lokale INT8-CPU-Nachweis 797,015 Sekunden für 4.343,222875 Sekunden Audio. Ein späterer instrumentierter CPU-Lauf derselben alten Bytes benötigte 566,922 Sekunden reine Erkennung, 8,016 Sekunden Modellsetup, 6,140 Sekunden Decodierung und 0,594 Sekunden Validierung/Serialisierung. Diese Eingabe hat SHA-256 `d7f924479192f60229b5ba800227f640bb18a73527e360cc909f3657839327cf`; Colab verwendete `ded9df3dbe81fabc8a1859c668ba082b009c25755a3b01bf164fc25fbf1fe43e`. Der anfangs gemeldete weitere Colab-Hash `e5a07f414b6e04a00da81c999c0a46563dab38be32c34b50d0f13a948101af99` war ebenfalls keine passende Referenz. Aus diesen vollständigen Läufen lässt sich kein sauberer CPU-/GPU-Faktor berechnen.

## Zwei getrennte Ladeprobleme

**FP32-Gewichte im Hub-Cache:** ORT 1.27 verweigerte `External data path escapes model directory`, weil Graph und externe Gewichte über Symlinks in unterschiedliche Blob-Unterverzeichnisse aufgelöst wurden. Unveränderte Dateien als normale Geschwister laden erfolgreich. Der Lader verwendet deshalb `snapshot_download(..., local_dir=...)` für FP32; Graph und `.onnx.data` bleiben zusammen. Eine kleine echte ONNX-Prüfung sichert das Verhalten ohne Modelldownload.

**Lokale Pascal-GPU:** Der normale ORT-1.27-GPU-Build verwendet CUDA 13 und eignet sich nicht für die GTX 1050 Ti. Erfolgreich ist der offizielle **ORT GPU 1.20.1 CUDA-11-Build** mit vorhandenem **CUDA 11.8 / cuDNN 8.6** und Treiber 576.02. Beim ersten echten Conv-/MatMul-/LSTM-Vorversuch fehlte `zlibwapi.dll`. Die geprüfte 89.088-Byte-DLL aus `conda-forge/libzlib-wapi 1.2.13 hcfcfb64_4` wurde ausschließlich lokal ergänzt; Paket- und DLL-SHA sind im lokalen Kurzbericht und Setupskript festgehalten. Treiber und System-CUDA wurden nicht verändert. Die [lokale Betriebsanleitung](../asr.md) beschreibt den jetzt unterstützten Weg.

## Linkfehler: eine Folgen-URL ist keine feste Audiofassung

Der Nutzer meldete, dass der Online-Link nicht zur lokalen MP3 passt. Der Fehler wurde mit unveränderter URL und lediglich anderer Clientkennung reproduziert:

| Abruf | MP3-Bytezahl | FFprobe-Dauer | SHA-256-Anfang |
| --- | ---: | ---: | --- |
| Pipeline-User-Agent | 69.543.927 | 4.346,479313 s | `96ed332a…` |
| Browser-User-Agent | 71.071.479 | 4.441,951313 s | `40b65eea…` |

RSS-GUID, ID3-Titel und Künstler stimmen überein. Der öffentliche RSS-Link und der alternative `open.acast.com`-Audiolink der offiziellen Folgenseite liefern beide dieselbe clientabhängige Abweichung. Der reine beobachtete `livestitches`-Pfad ohne zeitlich begrenzte Signatur liefert HTTP 403 und ist kein dauerhafter Ersatzlink.

Eine Signalprüfung auf drei zwölfsekündigen Ausschnitten bestätigt denselben Podcastinhalt: Referenzpositionen 300 und 1.800 Sekunden finden sich in der Browserfassung jeweils **85,4205 Sekunden später**, Position 4.000 Sekunden **90,3315 Sekunden später** (normierte Korrelation 0,953 / 0,959 / 0,989). Das ist weder eine falsche Folgenzuordnung noch nur eine MP3-Metadatenänderung. Es passt zu Acasts dokumentierter dynamischer Werbeeinfügung nach Listener-/Clientmerkmalen. Die [Acast-Technikbeschreibung](https://medium.com/acast-tech/server-side-podcast-metrics-bf8cf6c7ddec) erklärt unterschiedliche MP3-Längen und die Zuordnung unter anderem anhand von IP und User-Agent. Der [Prüfnachweis](evidence/audio-version-ufo537-2026-10-24.json) bewahrt die Messwerte ohne temporäre Signaturwerte.

**Korrektur:** `audio.url` bezeichnet die öffentliche Bezugsquelle; `audio.sha256` und die gespeicherte lokale Referenzdatei identifizieren die transkribierte Fassung. Neue Verarbeitungen behalten diese Datei unter ihrem Inhaltshash und melden den Pfad im Laufbericht. Der Player stoppt automatische Zeitsprünge, wenn die geladene Dauer um mehr als eine Sekunde abweicht, und zeigt den Fassungsfehler. Eine manuell geöffnete lokale Datei wird gegen den gespeicherten SHA-256 geprüft; erst die passende Datei bestätigt die Zeitachse. Gleiche Laufzeit allein beweist keine identischen Bytes. Die öffentliche Acast-Quelle kann weiterhin Werbung verändern; wir veröffentlichen keinen vorübergehend signierten Link als feste Referenz und betreiben keinen Audio-Proxy. Dauerhaft bytegleiche öffentliche Wiedergabe würde eine vom Publisher bestätigte unveränderliche Quelle oder eine gesonderte Hostingentscheidung brauchen.

## FP32 auf Colab: Anleitung für einen späteren Versuch

Dies ist ausschließlich eine dokumentierte Alternative; es gibt dafür keinen gepflegten Notebook-, Drive-, Vergleichs- oder Importpfad im Repository. Die getestete T4-Konfiguration hatte Treiber 580.82.07 und ORT GPU 1.27.0. Vor einem neuen Versuch GPU, Treiber und CUDA/cuDNN gegen die [ORT-Kompatibilitätstabelle](https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html) prüfen; die lokale Pascal-Konfiguration nicht unverändert auf Colab übertragen.

1. GPU-Laufzeit wählen, `nvidia-smi` prüfen und eine getrennte Umgebung mit Python 3.12, `onnx-asr[hub]==0.12.0` und dem zur VM passenden GPU-ORT installieren. Der erfolgreiche Vergleich verwendete `onnxruntime-gpu==1.27.0`. Ein verfügbarer Provider allein beweist keine tatsächliche GPU-Ausführung.
2. Modell `istupakov/parakeet-tdt-0.6b-v3-onnx` bei Revision `8f23f0c03c8761650bdb5b40aaf3e40d2c15f1ce` mit `snapshot_download(..., local_dir=...)` als normale lokale Dateien laden: `config.json`, `vocab.txt`, `encoder-model.onnx`, `encoder-model.onnx.data`, `decoder_joint-model.onnx`. **Kein `int8` auswählen.** VAD `istupakov/silero-vad-onnx`, Revision `b3e3ee3cce4c11ceb63b1a0b229d916069c1ddf6`, separat laden.
3. Audio einmal einfrieren, hashen und mit FFmpeg nach mono PCM16 / 16 kHz decodieren. Für Vergleiche ausschließlich diese Bytes wiederverwenden.
4. Das folgende eigenständige Muster verwenden; vorbereitete Modell-/VAD-Verzeichnisse und WAV-Pfad einsetzen. Für den damaligen CUDA-Vergleich liefen auch VAD und automatische Vorverarbeitung mit CUDA. CPU-VAD/NumPy ist eine mögliche weitere Variante, die separat zu messen wäre.

```python
import time
import onnx_asr
import onnxruntime as ort

ort.preload_dlls()
options = ort.SessionOptions()
options.intra_op_num_threads = 4
providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
model = onnx_asr.load_model(
    "nemo-parakeet-tdt-0.6b-v3",
    "/content/model-fp32",
    quantization=None,
    providers=providers,
    sess_options=options,
)
vad = onnx_asr.load_vad(
    "silero",
    "/content/vad",
    providers=providers,
    sess_options=options,
)
recognizer = model.with_vad(
    vad,
    batch_size=1,
    max_speech_duration_s=20,
    min_speech_duration_ms=250,
    min_silence_duration_ms=100,
    speech_pad_ms=0,
    threshold=0.5,
).with_timestamps()
start = time.perf_counter()
segments = list(recognizer.recognize("/content/episode.wav"))
elapsed = time.perf_counter() - start
print(elapsed, "seconds")
```

5. Modellsetup und Inferenz getrennt messen. Für einen kurzen Vergleich vollständig aufwärmen und mindestens drei echte Wiederholungen ohne Profilierung messen. Ein separates kurzes ORT-Profil muss CUDA-Conv/MatMul/LSTM nachweisen; Ereignislimit und fehlende Geräte-Kernelzeiten beachten. Eine dauerhafte Kopie fertiger Ergebnisse vor Sitzungsende wäre manuell außerhalb der aktiven Projektpipeline zu organisieren. Kostenlose Colab-Ressourcen sind laut [Colab-FAQ](https://research.google.com/colaboratory/faq.html) nicht garantiert.

## INT8 auf CPU: nur als Hintergrund

Der Parakeet-ONNX-Export enthält auch `encoder-model.int8.onnx` und `decoder_joint-model.int8.onnx`. Für einen CPU-Lauf würde man eine eigene kompatible CPU-ORT-Umgebung verwenden, beim Laden `quantization="int8"` sowie ausschließlich `CPUExecutionProvider` wählen und dieselbe VAD-/Audioaufbereitung beibehalten. INT8 benötigt weniger Modell-/Arbeitsspeicher, kann aber andere Texte und Tokenpunkte liefern. Die Messungen oben beschreiben dieses historische Verfahren; CPU-CLI, Runtime-Auswahl und INT8-Implementierung werden nicht mehr gepflegt. Eine unabhängige Referenz wäre nötig, um Genauigkeitsunterschiede zu quantifizieren; rohe Textähnlichkeit ist keine Wortfehlerrate.

Primärquellen: [ORT CUDA-11-Installation](https://onnxruntime.ai/docs/install/#cuda-11x), [ORT CUDA-Anforderungen](https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html), [CUDA-13-Änderungen](https://docs.nvidia.com/cuda/archive/13.0.1/cuda-toolkit-release-notes/index.html), [Parakeet-Export](https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx/tree/8f23f0c03c8761650bdb5b40aaf3e40d2c15f1ce), [onnx-asr-Nutzung](https://istupakov.github.io/onnx-asr/usage/).

## Prüfung des bereinigten Stands

Der vollständige Offline-Check bestand mit 68 Python-Tests, Ruff-Lint/-Format, Dokumentationslinks, Datenvalidator, Web-Lint/TypeScript und je 36 Chromium-Fällen am Root- und Projektpfad. Der zuvor rote Audiofassungsfall ist grün: andere Länge stoppt den Sprung, falsche lokale Bytes werden abgelehnt, passende Bytes stellen die Zeitachse wieder her. Eine anschließende Windows-DLL-Pfadregression ergänzt die Suite auf 69 Tests.

Die normale Projektumgebung wurde offline auf den gepinnten CUDA-11-GPU-Build umgestellt und der vorhandene FP32-Modellcache wiederverwendet. Ein echter [kurzer Produktions-CLI-Lauf](evidence/local-fp32-cli-integration-2026-10-24.json) mit acht vorhandenen Sekunden Audio bestand: 0,609 Sekunden Erkennung, 5,047 Sekunden Modellsetup einschließlich Imports/Cache-Lookups, validiertes JSON und erhaltene Audio-Referenz. Das ist ein Integrationsnachweis, kein neuer Ganzfolgen- oder Warmvergleich. Der erste Versuch deckte relative Pfade in `os.add_dll_directory` auf; die Runtime löst sie jetzt absolut auf, abgesichert durch eine Windows-DLL-Regression ohne GPU-Bedarf. Temporäre Windows-Rechteprobleme beim globalen pytest-Ordner wurden mit einem eigenen Projekt-Testordner vermieden.

Abschließende Bestätigung in der normalen Projektumgebung: **69 Python-Tests bestanden** (26,19 Sekunden) mit einem expliziten Windows-Temp-Verzeichnis für Prüfdaten; Lint, Format, Lockfile und Dokumentationslinks ebenfalls bestanden. Unter dem Projektcache wurden zuvor sporadische Windows-Zugriffsfehler bei atomarem Ersetzen in unveränderten Analyse-/Publikationsprüfungen beobachtet; der betroffene Einzeltest und die vollständige Suite mit Temp-Prüfdaten bestanden anschließend. Die Webdateien sind identisch zum bereits an beiden Basispfaden geprüften Stand (je 36 Chromium-Fälle).
