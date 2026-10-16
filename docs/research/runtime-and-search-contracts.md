# Runtime und Suchverträge: offene Funktionsnachweise

Stand: 16. Oktober 2026. Quellenprüfung zur Planverfeinerung; keine Installation, kein Modelllauf und kein Leistungsnachweis. Aussagen über aktuelle Pakete gelten nur für den Prüfstand und müssen gegen die später gesperrten Versionen geprüft werden.

## Python und GPU

Die [onnx-asr-Installation](https://istupakov.github.io/onnx-asr/installation/) dokumentiert Windows, CPU-/GPU-Pakete und Python 3.10–3.14. Python 3.12 liegt in diesem Bereich und ist auf dem Arbeitsplatz vorhanden; seine Eignung für die gesamte Kombination einschließlich spaCy muss bei der Abhängigkeitsauflösung nachgewiesen werden.

Aktuelle Standardpakete von `onnxruntime-gpu` ab 1.27 verwenden laut [ONNX Runtime](https://onnxruntime.ai/docs/execution-providers/CUDA-ExecutionProvider.html) CUDA 13. Die [NVIDIA-Treibermatrix](https://docs.nvidia.com/deploy/cuda-compatibility/minor-version-compatibility.html) nennt dafür mindestens Treiber 580; auf diesem Arbeitsplatz wurde 576.02 festgestellt. Außerdem entfällt mit CUDA 13 die Bibliotheks- und Offline-Kompilierungsunterstützung für Pascal, die Architektur der GTX 1050 Ti. Siehe [CUDA-13-Änderungen](https://docs.nvidia.com/cuda/archive/13.0.1/cuda-toolkit-release-notes/index.html). Auch die aktuelle [cuDNN-Matrix](https://docs.nvidia.com/deeplearning/cudnn/backend/latest/reference/support-matrix.html) schließt Pascal aus.

Folgerung: Aus der vorhandenen NVIDIA-Karte darf keine funktionierende lokale Beschleunigung abgeleitet werden. Ein älterer kompatibler Paketstand wäre ein eigener Funktionsnachweis. Colab benötigt vor jedem Integrationslauf eine Prüfung von zugeteilter GPU, Treiber, CUDA/cuDNN und tatsächlich verwendetem ONNX-Ausführungsanbieter. Ein ungesperrtes GPU-Extra reicht dafür nicht.

## Audio und Zeitmarken

Die [Nutzungshinweise](https://istupakov.github.io/onnx-asr/usage/) unterstützen die Verkettung `model.with_vad(vad).with_timestamps()`. Die eingebaute Audioübergabe verwendet PCM-WAV oder Arrays; Feed-MP3s müssen ausdrücklich decodiert und passend aufbereitet werden.

In der geprüften [VAD-Implementierung](https://github.com/istupakov/onnx-asr/blob/main/src/onnx_asr/vad.py) stehen Segmentbeginn und -ende auf der Audiozeitachse, während die vom Erkenner gelieferten Tokenzeitmarken unverändert weitergereicht werden. Daraus ergibt sich die zu prüfende Annahme, dass Tokenpunkte segmentrelativ sind. Der Adapter muss die tatsächliche Einheit und Bezugszeit des gesperrten Paketstands nachweisen, genau einmal auf die ursprüngliche Folge umrechnen und dies insbesondere nach Pausen prüfen. Native Tokenpunkte sind keine garantierten Wortintervalle. Siehe auch [Adapterquellcode](https://github.com/istupakov/onnx-asr/blob/main/src/onnx_asr/adapters.py).

## Pagefind: Identität und Ergebnisdaten

Die geprüften [Typen von Pagefind v1.5.2](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/types/index.d.ts) und der [Suchquellcode](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web_js/lib/coupled_search.ts) verwenden einen Dokumentfragment-Hash als Ergebnis-ID. Er ermöglicht die Zusammenführung getrennter Stichwortsuchen innerhalb desselben Indexstands. Er ersetzt keine dauerhafte Episoden-ID.

Die [Such-API](https://pagefind.app/docs/api/#loading-a-result) lädt URL und Metadaten erst über `.data()`. Für die geplanten globalen Gleichstandsentscheide nach Veröffentlichungsdatum und Episoden-ID wird deshalb vor dem Laden der ersten zehn Ergebnisdetails eine kompakte Zuordnung von Pagefind-ID zu Episodenmetadaten benötigt. Die Erstellung dieser Zuordnung oder ein gleichwertiger Weg ist im kleinen Indexierungsnachweis zu klären; die Roh-Ergebnisliste allein belegt die vollständige geplante Sortierung noch nicht.

Die [Anker-API](https://pagefind.app/docs/sub-results/#calculating-custom-sub-results-using-the-javascript-api) erlaubt die Zuordnung von Positionen zu Elementen mit IDs und damit zu Transkriptsegmenten. Der geprüfte Suchquellcode zwischenspeichert und verändert Fragmentobjekte über mehrere Abfragen hinweg. Trefferpositionen je Suchbegriff müssen deshalb gesichert oder aus geeigneten Roh-Ergebnispositionen gewonnen werden; `.data()` darf nicht ungeprüft als unveränderliche Kopie pro Anfrage behandelt werden.

## Nachweise vor Archivverarbeitung

- CPU-Transkription unter Windows und ein nachweislich verwendeter GPU-Anbieter unter Colab.
- Richtige Episodenzeiten nach mehreren Sprachabschnitten und Pausen.
- Indexstandgebundene Zuordnung von Such-ID, Episoden-ID und Datum ohne Nachladen sämtlicher Ergebnisfragmente.
- Zusammenführen mehrerer Suchbegriffe mit erhaltenen Positionen und richtigen Segmentankern.

Ein erfolgreiches Lesen dieser Quellen ersetzt keinen dieser Integrationsnachweise.
