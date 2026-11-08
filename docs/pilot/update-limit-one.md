# Echter Update-Test mit Limit 1

Am 8. November 2026 einmal auf dem lokalen Windows-Rechner ausgeführt, Ausgangscode `5093671`, Branch `test/update-limit-one`. [Maschineller Nachweis](evidence/update-limit-one.json).

## Gestarteter Befehl

Im Repositoryroot `C:/Users/User/Code/podcast_words_v3` mit lokalem uv-Cache:

```powershell
uv run --frozen --inexact --extra analysis podcast-words update --podcast podcast-ufo --limit 1 --run-report .cache/asr/limit-one-run.json
```

Vor dem Aufruf wurde die dokumentierte einmalige Analyse-Einrichtung in der Projektumgebung ergänzt: spaCy 3.8.16 und de_core_news_lg 3.8.0 lagen bisher nur in der getrennten Preflight-Umgebung. Das Modell wurde aus dem vorhandenen lokalen Cache installiert. GPU-/FP32-Gewichte und CUDA-Laufzeit waren bereits vorhanden. Der gemessene einzelne Update-Aufruf hat Feedimport, Auswahl, Download, Transkription und Wortanalyse selbst ausgeführt; keine manuelle Episodenauswahl oder Veröffentlichungsliste wurde ergänzt.

## Ergebnis

Exitstatus 0. Genau eine neue Folge: **UFO002 Fehlkäufe/Unwichtiges**, `ep-160703518cd26df69fda431ae0604fab`, älteste fehlende verarbeitbare Folge. Eine neue Transkriptdatei, eine neue Analyse, genau ein Inferenzlauf. Alle fünf vorhandenen Transkripte und Analysen blieben bytegleich; ihre Analysen wurden wiederverwendet. Der Feed war bereits aktuell (null neue Feed-Einträge, 541 aktualisierte Metadatensätze). Einschließlich Archivfolge 37 sind weiterhin 542 Folgen bekannt, nun sechs fertig verarbeitet.

| Messung | Wert |
| --- | ---: |
| Audiolänge | 68 min 44,66 s |
| Gemeinsames FP32-Modellsetup | 17,797 s |
| Download | 3,422 s |
| Transkription einschließlich VAD/Vorverarbeitung | 142,079 s |
| Verarbeitungsgesamtzeit der Folge | 151,453 s |
| Vollständiger Update-Befehl einschließlich Analyse/Steuerung | 176,173 s |

Die Transkription erreichte rund 29,03× Echtzeit. Die Folge enthält 14 grobe Segmente und 13.415 Gesamtwörter. CUDAExecutionProvider und `quantization: fp32` sind im Laufbericht bestätigt. Die Konsole meldete 0,050 Downloadsekunden und 2,067 Transkriptionssekunden je Audiominute. Gesamtzeit enthält Unterzeiten; Modellsetup nicht erneut pro Folge addieren. Temporäres Audio ist vollständig entfernt.

## Veröffentlichungsnachweis

Der normale lokale Build nahm die neue Folge automatisch auf: sechs Pagefind-Dokumente, konsistente Statistikdateien und **6/542 Folgen durchsuchbar (Stand 8.11.2026)**. Ein echter Chromium-Test bestätigte die neue Folge bei **kaufen = 21**, einschließlich markierter Originalpassage und ohne JavaScriptfehler. Die bestehende lokale Vorschau auf Port 4174 liefert den Sechserbestand aus.

Der zusätzliche lokale Build diente der Prüfung. Für den normalen Betrieb genügt nach dem Update das Einchecken und Veröffentlichen der Daten: Ein Merge/Push auf main startet den Pages-Build automatisch. Der Teststand wird zunächst auf seinem eigenen Branch gesichert. Eine erneute Ausführung von `update --limit 1` würde die nächste fehlende Folge verarbeiten; sie ist kein reiner Wiederholungstest derselben Folge.
