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

Der gemeinsame Offline-Check bestand mit **68 Python-Tests**, Ruff-Lint/-Format, Dokumentationslinks, Validator, Web-Lint/TypeScript und **je 37 Chromium-Fällen** am Root- und Projektpfad. Nach dem Review wurde der separate echte spaCy-Modellnachweis erneut erfolgreich ausgeführt: sechs Wörter, `hund: 2`, `laufen: 2` ([Nachweis](evidence/spacy-model-smoke.json)). Die zwei Reviewbefunde und ihre Korrekturen stehen im [Reviewbericht](review.md).

Die tatsächliche Fünf-Folgen-Webseite wurde an `/` und `/podcast_words_v3/` separat geprüft: **10/10 technische Abfragen je Pfad**, erwartete Folge jeweils auf Platz 1, fünf Timingzeilen, dieselben Grundformzahlen wie in den gespeicherten Analysen, Wortentwicklung, Segmentaktionen, teilbare Zeitparameter und 390-Pixel-Layout ohne Seitenüberlauf. [Root-Befund](evidence/browser-root.json) und [Projektpfad-Befund](evidence/browser-project.json) enthalten Anfragen, erwartete Quellsegmente, Ergebnis-IDs und Datenstand. Online-Audioabrufe wurden im technischen Browsercheck abgebrochen; geprüft wurden Steuerelemente und Zielzeiten, keine weitere Audioidentität oder menschliche Hörqualität.

Die Abfragen sind aus dem ASR-Text abgeleitet. Fünf prüfen jeweils drei vorhandene Stichwörter, fünf jeweils zwei vorhandene Begriffe plus den vorab nativ bestätigten Nulltreffer-Kontrollbegriff `ψξωζψξωζ`. Beispiele für reale Wörter sind „massagesessel hotline massage“, „beatles rettungsequipment songtexte“ und „wunder bezeugen fettarm“. Das ist kein unabhängiger Erinnerungs-/Qualitätsdatensatz.

Pagefind 1.5.2 berücksichtigt neben deutschen Wortformen auch Präfix-/Teilworttreffer. Ein zunächst verwendetes künstliches Fehlwort traf dadurch ein reales kurzes Wort in „QX-Schaum“. Der [native Diagnosebeleg](evidence/pagefind-prefix-diagnosis.json) bestätigt das ohne App-Zustand und hält die Entscheidung fest, die gewünschte Suchsemantik beizubehalten. Suchabdeckung ist entsprechend keine exakte Wort- oder Lemmazählung; letztere liefert die Statistik.

Der Root-Build umfasst **2.797.724 Byte**, der Projektpfad-Build **2.797.955 Byte**. Root-Veröffentlichung: `6f5e43eba992e77076e7e147fbd2abc9645f8c890b3fe25f084fb519552356d6`; Projektpfad: `0f46d3a3e80f` (vollständige ID im Befund). Beide enthalten genau fünf Folgen und `archiveComplete=false`. Es wird vor Suche oder Statistik kein Transkriptarchiv geladen.

## Laufzeitgrenze des Mobilprofils

Im lokalen Chromium-Prüfprofil mit 390×844 Pixeln, vierfacher CPU-Verlangsamung, 150 ms Latenz und 200.000 Byte/s Download dauerte die erste Suche mit normalem HTTP-Cache **2.983 ms**, die nächste **2.495 ms** und die Wiederholung der ersten **1.932 ms** ([Messung](evidence/mobile-cache.json)). Gemessen wurde vom Suchklick bis zum sichtbaren fertigen Ergebnisstatus. Die erste Suche bleibt unter dem früheren Fünf-Sekunden-Ziel; das frühere **Ein-Sekunden-Ziel für Folgesuchen wurde in diesem Profil nicht erreicht**. Der lokale Pilot wird damit als bedienbarer technischer Stand ausgeliefert; eine umfassende Performance-/Archivfreigabe wird nicht behauptet.

Der Browserkontext war zu Beginn leer. Ein zusätzlicher Lauf mit ausdrücklich deaktiviertem HTTP-Cache ergab 3.039/2.455 ms. Die CDP-Bytezählung in diesem Lauf betrifft den Seitentarget und kann Worker-Transfers auslassen; sie ist kein vollständiger Übertragungsnachweis. Die vollständige statische Buildgröße ist oben separat ausgewiesen. Diese lokale Emulation ist weder eine Messung eines gehosteten GitHub-Pages-Standes noch eines echten Mobilgeräts.

Alle vier Implementierungsarbeitskopien sind entfernt. Der integrierte Branch heißt `codex/local-five-episode-pilot`; Build und temporäre Messdateien bleiben ignoriert. Der lokale Preview auf Port 4173 zeigt den echten Pilotstand.
