# Colab-Laufzeit: UFO537-Benchmark vom 24.10.2026

Der Bericht zeigt einen langsamen Erkennungsschritt trotz aktiver CUDA-Ausführung. Die stärkste belegte Spur sind teure INT8-Operationen auf der CPU neben vielen CPU/GPU-Kopien. Ein anderer Modelltyp oder kostenpflichtige Infrastruktur ist aus diesen Daten nicht begründet; zuerst den Ausführungspfad des gewählten Parakeet-Modells kontrolliert vergleichen.

Die [kompakte Evidenz](evidence/colab-gpu-ufo537-runtime-2026-10-24.json) enthält Berichtshash, Herkunft, Konfiguration, Stufendauern und ausgewählte Profilwerte. Der unveränderte Originalbericht liegt beim Operator unter `C:\Users\User\Downloads\ep-5764a1149f18a8f68698fb45bb405264-benchmark.json`; die großen Rohprofile wurden nicht bereitgestellt. Dies ist eine Auswertung des gelieferten Berichts, kein lokal wiederholter GPU-Versuch.

## Gesicherte Messungen

Alle drei Läufe transkribieren tatsächlich dieselben 72.210.096 Audio-Bytes: SHA-256 `ded9df3dbe81fabc8a1859c668ba082b009c25755a3b01bf164fc25fbf1fe43e`, decodierte Länge 4.513,12325 Sekunden (75:13). Code-Commit, Konfigurationsrevision, Modell-/Exportrevision und Laufzeit sind innerhalb der Messreihe gleich. Jeder Modus hat genau einen Messwert; Streuung ist nicht gemessen.

| Stufe (Sekunden) | Kalt, Profil aus | Warm, Profil an | Warm, Profil aus |
| --- | ---: | ---: | ---: |
| CLI-Aufruf mit äußerer Aufrufzeit | 2.069,460 | 2.420,527 | 1.949,370 |
| CLI intern gesamt | 2.067,057 | 2.414,752 | 1.948,647 |
| Modellaufbau gesamt | 14,964 | 6,273 | 6,009 |
| Decodieren | 17,169 | 17,432 | 16,688 |
| Erkennung einschließlich VAD/Vorverarbeitung/Ergebnisaufbau | 2.033,840 | 2.294,275 | 1.924,969 |
| Ergebnisvalidierung und Serialisierung | 0,507 | 0,463 | 0,452 |
| Profil abschließen und auswerten | < 0,001 | 95,813 | < 0,001 |

Die Stufen sind nicht vollständig disjunkt: Modell-Lookups und Session-Aufbau liegen innerhalb des Modellaufbaus, Profil-Parsing innerhalb des Profilabschlusses und die Erkennung umfasst weitere interne Arbeit. Deshalb Unterstufen nicht nochmals zur Gesamtzeit addieren. Zeitgrenzen und Mikrosekundenwerte stehen im Originalbericht bzw. der Evidenzdatei.

Der warme Lauf ohne Profilierung dauert **32:29 Minuten**; 98,8 % seiner internen CLI-Zeit liegen im Erkennungsschritt. Er verarbeitet rund 2,32 Stunden Audio pro Rechenstunde. Das einmalige Bereitstellen des eingefrorenen Audios dauert 2,748 Sekunden außerhalb der drei Aufrufe. Downloads oder Modellaufbau erklären diesen langsamen warmen Lauf nicht.

Der profilierte warme Lauf dauert **40:21 Minuten**, beobachtet 7:51 Minuten bzw. 24,2 % länger. Davon entfallen 95,813 Sekunden auf Profilabschluss/-auswertung, einschließlich 60,904 Sekunden Parsing. Die Erkennungsstufe selbst ist 369,305 Sekunden länger. Bei n=1 je Modus ist das ein beobachteter Unterschied, keine belastbare Schätzung des isolierten Profilierungsaufschlags.

Die drei Rohprofile umfassen zusammen 2.281.348.213 Bytes. Die sechs gemessenen Drive-Kopieraufrufe dauern zusammen 13,501 Sekunden; ein späterer Remote-Flush ist nicht separat gemessen. Die gesamte Benchmarkzelle dauert 1:47:37 Stunden, weil sie **drei vollständige Transkriptionen** ausführt. Die vorherige Abhängigkeitseinrichtung dauert weitere 8,240 Sekunden und liegt außerhalb dieser Zelle.

## Was das Profil erklärt

Im profilierten Lauf sind tatsächliche CUDA- und CPU-Modellknoten belegt. CUDA ist also aktiv; die bloße Provider-Konfiguration war dafür nicht die Beweisgrundlage. Besonders auffällig sind diese aufsummierten Host-Node-Dauern im aufgezeichneten Ausschnitt:

| Session | Operation auf CPU | Host-Dauer im Teilprofil |
| --- | --- | ---: |
| Encoder | `MatMulInteger` | 239,555 s |
| Encoder | `ConvInteger` | 179,618 s |
| Decoder | `DynamicQuantizeLSTM` | 32,532 s |
| Decoder | `MatMulInteger` | 27,665 s |

Auch hunderttausende `MemcpyFromHost`-/`MemcpyToHost`-Ereignisse sind erfasst. Das passt zu einer ungünstigen Aufteilung zwischen CPU und GPU bei diesem dynamisch quantisierten Export. Es beweist weder, dass CUDA grundsätzlich keine INT8-Operationen unterstützt, noch einen bestimmten erreichbaren Beschleunigungsfaktor. Die [ORT-Dokumentation zur Quantisierung](https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html) beschreibt zusätzliche Laufzeitarbeit dynamischer Quantisierung; ob diese Kombination hier ungünstiger als FP32 ist, muss der direkte Versuch zeigen.

**Die Profile sind begrenzt:** Alle drei enthalten exakt 1.000.000 Ereignisse. Dies entspricht dem Standardlimit im [Quellcode von ORT 1.27.0](https://raw.githubusercontent.com/microsoft/onnxruntime/v1.27.0/onnxruntime/core/common/profiler.cc); spätere Ereignisse werden verworfen. Die letzten erfassten Ereignisse liegen bei etwa 708 Sekunden (Encoder), 1.152 Sekunden (Decoder) und 246 Sekunden (VAD) seit jeweiligem Profilstart. Daraus lassen sich keine Anteile über den gesamten Lauf berechnen.

Es gibt außerdem keine aufgezeichneten Geräte-`Kernel`-Ereignisse. Host-Dauern können sich überschneiden und Start-/Wartearbeit enthalten; CUDA-Host-Dauer ist keine gemessene GPU-Kernellaufzeit. Die [ORT-Profilierungsdokumentation](https://onnxruntime.ai/docs/performance/tune-performance/profiling-tools.html) erläutert die gesonderte Geräteprofilierung. Provider-Ereigniszahlen sind ebenfalls keine Zeitanteile. Die `nvidia-smi`-Momentaufnahme stammt vor der Inferenz und sagt nichts über die Auslastung während der Verarbeitung.

## Vergleichsgrenzen

Die neue Messreihe ist intern hinsichtlich Audio, Code und Konfiguration vergleichbar. Die historische Windows-CPU-Referenz ist es nicht: Sie verwendet SHA-256 `d7f924479192f60229b5ba800227f640bb18a73527e360cc909f3657839327cf` und 4.343,222875 Sekunden Audio, also etwa 2:50 Minuten weniger. Der Bericht markiert den Vergleich korrekt als `invalid-different-audio`. Auch Code-/Hostbedingungen sind nicht identisch. Einen CPU/GPU-Geschwindigkeitsfaktor aus diesen Läufen zu behaupten wäre unbegründet. Die Ursache der unterschiedlichen öffentlichen Audio-Bytes ist weiterhin ungeklärt.

Der alte ungefähr 36-minütige Lauf bleibt mangels eigener Stufendauern nicht exakt rekonstruierbar. Die neuen 32 bis 40 Minuten bei überwiegender Erkennungsarbeit erklären die Größenordnung, ohne den historischen Lauf nachträglich als gleichartig zu behandeln.

## Nächster begrenzter Versuch

Die Hypothesen nach Stärke der bisherigen Evidenz:

1. **Dynamischer INT8-Export verursacht einen ungünstigen CPU/GPU-Mix.** Vorhersage: Das unquantisierte FP32-Exportpaar derselben Parakeet-Revision verlagert die teuren Integer-Operationen auf einen anderen Ausführungspfad und senkt die warme Laufzeit. Bleibt diese unverändert, ist diese Erklärung allein unzureichend.
2. **Viele kleine Aufrufe und Transfers dominieren zusätzlich.** Vorhersage: Nach Beseitigen der teuren CPU-Integer-Operationen bleiben viele Kopien bzw. erhebliche Laufzeit bestehen. Eine spätere isolierte Änderung von Batch-/Segmentverarbeitung müsste diese Arbeit und die Laufzeit verringern; zunächst keine zusätzliche Variable ändern.
3. **Der knappe Colab-Host verschärft CPU-Arbeit.** Gemeldet sind zwei logische CPUs bei vier Intra-Op-Threads. Vorhersage: Bei unverändertem INT8-Pfad verbessert ein kontrollierter Vergleich mit zwei statt vier Threads die Laufzeit. Der Bericht misst diese Wirkung noch nicht.

Zuerst einen festen Audioabschnitt von etwa zwei Minuten einmal vorbereiten, hashen und für beide Konfigurationen unverändert verwenden. INT8 und **unquantisiertes FP32 auf CUDA** auf derselben T4, demselben Code und derselben Modell-/VAD-Revision vergleichen; VAD, Threads und Batchgröße zunächst konstant halten. Jedes Modell vorwärmen, dann mindestens drei tatsächliche Wiederholungen ohne Profilierung messen und einzeln ausweisen. Anschließend je einen kurzen profilierten Lauf für die tatsächliche Platzierung der Operationen aufnehmen; kontrollieren, dass die Ereignisgrenze nicht erreicht wurde. Ausgabegültigkeit, Text und Zeitmarken als Qualitätskontrolle prüfen. Erst bei nachgewiesenem Vorteil eine vollständige Folge vergleichen.

Die [bereits gepinnte Exportrevision](https://huggingface.co/istupakov/parakeet-tdt-0.6b-v3-onnx/tree/8f23f0c03c8761650bdb5b40aaf3e40d2c15f1ce) enthält `encoder-model.onnx` mit externer Datendatei und `decoder_joint-model.onnx` zusätzlich zu INT8. Ein fertiger FP16-Export ist dort nicht vorhanden; deshalb kein ungeprüfter FP16-Schalter. Parakeet selbst bleibt unverändert. Optimierung und Notebook-Umbau sind gesonderte Folgearbeit; aus dieser Auswertung wurde keine Laufzeitkonfiguration geändert.

[Ticket 19](../../.scratch/podcast-words-pilot/issues/19-investigate-colab-gpu-runtime.md) bleibt offen: Die Erkennungsstufe und CPU-Integer-Operationen sind jetzt gemessen, ein vergleichbarer CPU/GPU-Lauf und die kontrollierte Bestätigung der Beschleunigungsursache fehlen weiter.

## Kurze Diagnosemessung vom 24.10.2026

Der Operator lieferte die neue Messreihe `8f67d21cde714b1789612f1721face8c` von Commit `1defcf4a4afd4b76fc611d7807248d9961922117`. Die [kompakte Evidenz](evidence/colab-diagnostic-ufo537-2026-10-24.json) identifiziert den unveränderten Originalbericht über SHA-256. Die eingefrorene Originalquelle stimmt mit dem vorigen Colab-Benchmark überein; gemessen wurden identische 120 Sekunden PCM ab Minute fünf, auf derselben T4 und demselben Host mit zwei logischen CPUs.

| Laufweg | n | Median | Min-Max | RTF |
| --- | ---: | ---: | ---: | ---: |
| INT8/CUDA | 3 | 50,669 s | 50,415-50,732 s | 0,422 |
| INT8/CPU | 3 | 54,976 s | 54,847-55,215 s | 0,458 |
| FP32/CUDA | 0 erfolgreiche Inferenzläufe | Modellladen fehlgeschlagen | keine Messung | unbekannt |

INT8/CUDA hat in dieser Stichprobe etwa 7,84 % weniger Erkennungszeit als der CPU-Laufweg (Verhältnis CPU/GPU etwa 1,085). Die automatische Vorverarbeitung unterscheidet sich ebenfalls: NumPy auf CPU, ONNX Conv auf CUDA. Dies ist deshalb ein Vergleich vollständiger Laufwege, kein isolierter Providervergleich und keine allgemeine Leistungsaussage. Die GPU-Messungen verbrauchen etwa 1,92 CPU-Prozesssekunden pro Wandsekunde auf einem Host mit zwei logischen CPUs; das passt zu weiterhin erheblicher CPU-Arbeit, ohne sie vollständig einzelnen Operationen zuzuordnen.

Das separate Achtsekundenprofil enthält 8.842 ausgeführte CUDA-Modellknoten und erreicht keine Ereignisgrenze. Es bestätigt die teuren CPU-INT8-Operationen erneut: Encoder `MatMulInteger` 1,520 Sekunden und `ConvInteger` 1,106 Sekunden aufsummierte Host-Dauer, außerdem CPU-`DynamicQuantizeLSTM` und `MatMulInteger` im Decoder. Geräteseitige `Kernel`-Zeiten fehlen weiterhin. Die Erkennung bleibt innerhalb jeder erfolgreichen Variante textlich und zeitlich stabil; die Texte zwischen CPU und CUDA weichen voneinander ab. Ohne Hörreferenz folgt daraus kein Qualitätsurteil.

**FP32 ist noch nicht verglichen.** Beide Versuche scheitern vor der ersten Inferenz an `External data path escapes model directory`. Modellgraph und externe Gewichte zeigen im Hub-Cache auf verschiedene Blob-Unterordner (`9a` bzw. `79`); die [ORT-1.27-Pfadprüfung](https://raw.githubusercontent.com/microsoft/onnxruntime/v1.27.0/onnxruntime/core/framework/tensorprotoutils.cc) erlaubt die aufgelösten Gewichte dort nicht. Der Fehler wurde mit einem winzigen Modell und der echten lokalen ORT-1.27-CPU-Laufzeit reproduziert. Unveränderte Modelldateien als normale lokale Dateien laden erfolgreich; der Regressionstest führt den Fehler zusätzlich über den tatsächlichen Diagnose-Lader aus. Unter Windows bildet eine Verzeichnis-Junction denselben Pfadprüfungsfall ab, unter Linux die getrennten Blob-Dateisymlinks. Dieser synthetische Test ist kein GPU- oder Parakeet-Leistungsnachweis.

Der Diagnosehelfer fordert FP32 nun mit dem dokumentierten [Hub-Parameter `local_dir`](https://huggingface.co/docs/huggingface_hub/guides/download#download-files-to-a-local-folder) an. Graph und externe Gewichte liegen damit als normale Dateien zusammen in einem revisionsgebundenen lokalen Ordner. Vorhandene Cachebytes können dafür kopiert werden; dieser Aufwand bleibt vor Session-Aufbau und Erkennung. Die Sicherheitsprüfung, Paket-/Modellrevisionen und normalen Produktionsvorgaben werden nicht verändert.

Als Nächstes eine neue Messreihe mit dem korrigierten Helfer durchführen, nach Möglichkeit unter Verwendung der bisherigen eingefrorenen Originaldatei. Der Standardvergleich bleibt INT8/CUDA, FP32/CUDA und CPU-Kontrolle. Alte Ergebnisse bleiben gültige Beobachtungen; Berichte verschiedener Helfer-Codehashes werden nicht zu einem kontrollierten Vergleich vermischt. Der reale FP32-Ladevorgang und dessen GPU-Geschwindigkeit müssen auf Colab noch bestätigt werden.
