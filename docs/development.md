# Entwicklungsumgebung

## Stand der Einrichtung

Der Plan ist gemeinsam bestätigt. Das Repository enthält ein installierbares Python-Paket unter `src/podcast_words/`, eine React/TypeScript/Vite-Site unter `web/`, einen lokalen FP32-GPU-Laufweg und gemeinsame Offline-Prüfungen. Die erste Datenvalidierung ist beschrieben in [data-contracts.md](data-contracts.md). [TASKS.md](../TASKS.md) führt zu den nächsten Funktionsnachweisen.

`AGENTS.md` verweist abhängig von der Aufgabe auf Plan, Fachbegriffe und Recherche. `.editorconfig` und `.gitattributes` vereinheitlichen UTF-8 und Zeilenenden. `.gitignore` hält lokale Umgebungen, Caches und Build-Ergebnisse aus Git heraus; normalisierte Transkripte und Analyseergebnisse werden weiterhin versioniert.

## Installieren und prüfen

Alle folgenden Befehle am Repositoryroot ausführen. Python 3.12 und die Node-Version aus `.node-version` verwenden. uv 0.10.9 wurde lokal geprüft und ist auch im CI festgelegt. `uv.lock` und `web/package-lock.json` sind die reproduzierbaren Abhängigkeitsstände; reguläres Einrichten verändert sie nicht.

PowerShell:

```powershell
$env:UV_CACHE_DIR = Join-Path $PWD '.uv-cache'
uv sync --locked
npm.cmd --prefix web ci --cache .cache/npm
npm.cmd --prefix web run browser:install
uv run --frozen python scripts/check.py
```

Linux:

```bash
export UV_CACHE_DIR="$PWD/.uv-cache"
uv sync --locked
npm --prefix web ci --cache .cache/npm
npm --prefix web run browser:install
uv run --frozen python scripts/check.py
```

Der gemeinsame Check läuft ohne Audio-, Modell- oder GPU-Zugriff. Er prüft Python-Lint und Format, die Datenvertragsgrenzen, die kleinen Beispieldateien, Dokumentationslinks und Notebooksyntax sowie Web-Lint, TypeScript, Produktionsbuilds am Root- und Projektpfad und echte Chromium-Prüfungen beider gebauten Pfade. Dabei werden Suchindex und Datenabrufe, direkte Folgen-/Zeitlinks, Playerzustände und die mobile Kombinationsansicht mit Statistikdiagramm geprüft. Am Ende baut der Check erneut den Root-Pfad für den normalen Preview-Befehl. Die Teilbefehle stehen in `pyproject.toml`, `web/package.json` und `scripts/check.py`.

Installationen benötigen einmalig Zugang zu PyPI, npm und dem Playwright-Browserdownload. `browser:install` installiert den zu Playwright 1.64.1 gehörenden Chromium-Headless-Shell-Browser; die Routineprüfungen verwenden anschließend den installierten Browser offline. Linux-CI installiert dessen Systembibliotheken zusätzlich mit `npx playwright install --with-deps chromium --only-shell`. Nach der ersten Installation wurden `uv sync --locked --offline` und ein npm-CI-Lauf mit lokalem Cache und `--offline` erfolgreich geprüft. Ein frischer Rechner ohne gefüllten Cache benötigt weiterhin Netzwerkzugriff.

## Lokal arbeiten

```powershell
uv run --frozen podcast-words doctor
uv run --frozen podcast-words validate tests/fixtures/synthetic-episode.json
npm.cmd --prefix web run build
npm.cmd --prefix web run preview
```

Der Preview bindet ausschließlich an `127.0.0.1`, standardmäßig Port 4173. Unter Linux `npm` statt `npm.cmd` verwenden. Mit Strg+C beenden. Der normale lokale Build verwendet den echten Fünf-Folgen-Pilot. Routinechecks wählen ihre synthetischen Daten ausdrücklich aus. Passagen öffnen den gemeinsamen Online-Player nach Nutzeraktion mit einem Hinweis auf grobe Zeiten und Werbung. Für die echte Suche den Produktionsbuild mit seinem generierten Index verwenden:

```powershell
npm.cmd --prefix web run build
npm.cmd --prefix web run preview
```

`npm.cmd --prefix web run test:browser` prüft einen bereits erzeugten Build mit Playwright und startet dafür selbst einen lokalen Preview auf Port 4179. `PW_PORT` wählt bei Bedarf einen anderen Port. `PW_BASE_PATH=/podcast_words_v3/` erlaubt dieselben Prüfungen gegen einen zuvor mit diesem Basispfad gebauten Stand. Ein laufender anderer Preview wird nicht stillschweigend wiederverwendet. Der gemeinsame Check führt die Browserprüfungen für beide Basispfade mit Port 4214 aus.

## Ausgewählte Veröffentlichung

Der normale Build bereitet automatisch die gespeicherten fünf Pilotfolgen aus `data/podcast-ufo/pilot-episodes.json` und ihren Analysen vor, ohne Modelle zu laden. Der vollständige Ablauf steht unter [lokaler Pilot](pilot/local-five-episode-pilot.md). Alternativ bereitet die öffentliche CLI aus einer expliziten JSON-Liste relativer Transkriptpfade eine ausgewählte, validierte Veröffentlichungsquelle vor. Katalogänderungen aktualisieren öffentliche Metadaten, ohne erkannten Text oder Zeiten zu ändern; gültige Analysen werden wiederverwendet. Die Vorbereitung liest keine ASR-Modelle:

```powershell
$env:UV_CACHE_DIR = 'C:/Users/User/Code/podcast_words_v3/.uv-cache'
uv run --frozen podcast-words publish --catalog data/podcast-ufo/catalog.json --episodes .cache/selected-episodes.json --analyses data/podcast-ufo/analyses --output .cache/publication
$env:PODCAST_WORDS_PUBLICATION_SOURCE = '.cache/publication'
npm.cmd --prefix web run build
Remove-Item Env:PODCAST_WORDS_PUBLICATION_SOURCE
```

`selected-episodes.json` enthält die vom Operator gewählten Dateipfade relativ zu seiner Ablage. Der Vite-Build verwendet diese eine Quelle für Suchindex, Episodenrecords, Katalog und Statistiken und stoppt bei abweichenden Podcast-, Episoden-, Titel-, Datums- oder Statistikständen. `dist/publication.json` bindet den ausgewählten Pilotstatus, stabile Folgen-IDs, Pagefind-Index und Statistiken; dieselbe Veröffentlichungs-ID steht in Suchzuordnung und Statistikdateien. Der Fixture-Build kennzeichnet sich als `synthetic-fixture`. Ab 800 MB wird gewarnt, über 1 GB der Build abgelehnt. Veröffentlichungsquellen und Build-Ergebnisse bleiben ignoriert.

## Suchindex mit kontrollierten Eingaben

Der Vite-Build validiert die in [search-corpus.json](../tests/fixtures/search-corpus.json) aufgeführten Episodendateien zuerst durch dieselbe Python-CLI. `PODCAST_WORDS_EPISODES` kann auf eine andere JSON-Liste zeigen; deren Dateipfade gelten relativ zur Liste, der Listenpfad relativ zum Repositoryroot. Pro Build ist genau ein Podcast zulässig. Pagefind 1.5.2 erzeugt pro Folge ein virtuelles deutsches Dokument mit Segmentankern und App-URL. Titel und übrige Metadaten bleiben außerhalb des lexikalischen Indexes, weil diese Pagefind-Version auch Metadaten durchsucht.

Unter `dist/search/manifest.json` steht der Indexstand. Ein SHA-256-Verzeichnis bindet Pagefind-Dateien, kompakte Such-ID→Episoden-ID/Datum-Zuordnung und ursprüngliche Episodendateien zusammen. Der Browser liest die Zuordnung vor den Ergebnisdetails; weder der Seitenstart noch eine erfolglose Suche lädt Episodenfragmente oder Transkripte. Der Buildadapter liest die von der gesperrten Pagefind-Version erzeugten Fragmentdateien und prüft deren Signatur sowie die vollständige Zuordnung. Ein Paketwechsel benötigt einen erneuten Browsernachweis dieses Formats.

Die Suche läuft in einem eigenen Worker. Er meldet auch von Pagefind intern abgefangene Abruffehler, statt sie als Nulltreffer auszugeben. Ein bewusster neuer Suchlauf verwendet einen frischen Worker und kann dadurch nach einem fehlgeschlagenen Chunk erneut laden. Automatische Wiederholungen gibt es nicht. Fundstellen verwenden kopierte Rohpositionen und die Pagefind-Anker, zeigen den Originalsegmenttext und dessen Beginn auf der Episodenzeitachse.

Die sichtbare Anwendung wählt bis zu fünf veröffentlichte Grundformen in einem Autocomplete. Ihre Schema-v2-Zählungen bestimmen die gestapelten absoluten Balken und die zehn Folgenkarten: Summe absteigend, Veröffentlichungszeitpunkt absteigend, stabile ID aufsteigend. Die Diagrammansicht „Alle“ wechselt allein die Balken auf chronologische Reihenfolge mit Nullfolgen. Katalog, Vokabular und UI dürfen beim Start laden; Zählshards, Suchfragmente und Transkripte laden erst nach einer Auswahl. Metadaten und Wortentwicklung sind untergeordnet aufklappbar.

Die erhaltene öffentliche `searchEpisodes`-Modulschnittstelle unterstützt unabhängig von der Oberfläche lexikalische Mehrwortsuche, Suchabdeckung und seitenweises Nachladen. Der Build veröffentlicht sie als eigenen Einstieg, dessen Datei unter `src/search.ts` im Vite-Manifest `.vite/manifest.json` steht. So können Diagnosewerkzeuge und Browser-Vertragsprüfungen die echte Worker-/Pagefind-Sitzung nutzen, ohne eine zweite Suchoberfläche einzubauen. Minimale andere Buildroots ohne dieses Modul behalten ihren normalen HTML-Einstieg. Stichwörter werden nach NFC und deutscher Kleinschreibung vereinheitlicht und einzeln gesucht. Die unbeschränkte Schnittstelle ordnet nach Suchabdeckung, nativer Rangsumme, Veröffentlichungszeitpunkt und Folgen-ID; nachgeladene Seiten enthalten höchstens zehn Folgen.

Der Explorer übergibt `targetEpisodeIds` mit seinen bereits festgelegten statistischen Top 10. Der Worker filtert die Rohresultate anhand der kompakten Identitätszuordnung **vor** Vereinigung, Seitenauswahl und Fragment-/Transkriptabruf. Eine ausdrücklich leere Liste lädt keine Details. Ergebnisse werden anhand der stabilen ID wieder an die Statistikreihenfolge gebunden; ein fehlender lexikalischer Treffer entfernt keine gezählte Karte. Auswahlwechsel brechen alte Workerarbeit ab, und jede Passageantwort bleibt an ihre Auswahlgeneration gebunden. Zählfehler und Textfehler sind getrennt, keine Nullwerte und nur manuell wiederholbar.

Markierungen verwenden kopierte native Wortpositionen und Segmentanker. Originale Leerraum-Tokens liefern UTF-16-Spannen; Tokenzahl und Originalwortlaut werden einmal je betroffenem Segment gegen den geladenen Suchtext geprüft. Lediglich der nachgewiesene zusätzliche abschließende Punkt wird toleriert. Inflektionen und zusammengesetzte Wörter werden als tatsächlich indiziertes Oberflächenwort markiert. Doppelte Spannen behalten sämtliche passenden Begriffe; React rendert Originaltext und Markierungen als Textknoten. Widersprüchliche Positionen erzeugen einen Textfehler statt erfundener Markierungen. Lange Segmente zeigen einen Ausschnitt um echte Treffer und bleiben vollständig aufklappbar. Die [Positionsuntersuchung](research/word-explorer-highlights.md) beschreibt den gesperrten Paketbefund und Unicode-/Kompositagrenzen.

Der [separate Suchprüfkorpus](../tests/fixtures/search-coverage/README.md) enthält 15 zusätzliche Kandidaten mit unabhängig ausgearbeiteter Suchrangfolge, Datums-/Identitätsgleichständen und deutschen Wortformen. Die Browserprüfungen erhalten diese API-Verträge und prüfen zusätzlich das eine Eingabefeld, Tastatur-/Touchauswahl, Farbzuordnung, Summenrangfolge, chronologische Nullen, gezielte Detailabrufe, Unicode-Markierungen, Fehler, überholte Antworten und den gemeinsamen Player an beiden Basispfaden. Die kontrollierten Texttests erzeugen einen echten kleinen Pagefind-Index an der HTTP-Grenze; sie ersetzen weder Engine noch Worker durch Mocks. Echte Pilotqualität und mobiles Zeit-/Übertragungsmessen bleiben gesonderte Nachweise.

`doctor` kontrolliert Python und ein ausführbares FFmpeg. Bei fehlendem oder nicht ausführbarem FFmpeg liefert er einen Fehlerstatus. Ein erfolgreicher Aufruf ist kein ASR- oder GPU-Nachweis. Seit dem CPU-ASR-Adapter benötigt auch der Offline-Check FFmpeg: Kleine erzeugte PCM-Prüfdaten durchlaufen die echte Decodierung, während nur der externe Modelloutput ersetzt wird. CI verwendet dafür das über `uv.lock` gesperrte Dev-Wheel `imageio-ffmpeg==0.6.0`; `scripts/prepare_ci_ffmpeg.py` kopiert dessen enthaltene Binärdatei unter dem Befehlsnamen `ffmpeg` in `.cache/ci-ffmpeg` und ergänzt ausschließlich den CI-Pfad. Das Skript lädt selbst nichts herunter und verändert keine globalen Einstellungen. Auf einem frischen lokalen Rechner kann derselbe vorbereitete Ordner dem Shell-Pfad hinzugefügt werden. Große Audio- oder Modelldownloads bleiben ausdrücklich gestarteten Integrationsläufen vorbehalten. Der echte Windows-ASR-Lauf verwendete separat protokolliertes Host-FFmpeg 7.1.1; siehe [ASR](asr.md).

Die [ASR-Anleitung](asr.md) beschreibt die lokale GPU-Einrichtung, temporäres Audio, grobe Textsegmente und die Verarbeitung. Die [Untersuchung](research/asr-investigation.md) bewahrt frühere Laufwege ausschließlich als Dokumentation.

## CI und Prüfstand

[GitHub Actions](../.github/workflows/ci.yml) installiert die gesperrten Abhängigkeiten auf Windows und Linux und führt denselben gemeinsamen Check aus. Der Workflow veröffentlicht nichts. Ohne Remote wurde noch kein gehosteter Actions-Lauf ausgelöst; die Prüfungen wurden lokal unter Windows ausgeführt.

Der Entwicklungsserver, das durch Vite kompilierte React-Modul und der gemeinsame Prüfdatenimport wurden lokal über HTTP geprüft. Die Produktions-Browserprüfungen laufen nun auf Root- und Projektpfad-Builds und umfassen eine synthetische 390-Pixel-Ansicht mit Suche, Player, Diagramm und Wortentwicklung. Diese Layoutprüfung misst keine realen Pilotlaufzeiten, Übertragungsbytes oder Speichergrenzen. Der Gesamtcheck baut zuletzt den Root-Pfad mit ausdrücklich synthetischen Fixtures. Für den echten Pilot danach `npm.cmd --prefix web run build` ausführen; erst dann zeigt der Preview wieder die fünf echten Folgen.

## Besonderheiten dieses Windows-Arbeitsplatzes

Beim schreibgeschützten Audit am 16. Oktober 2026 waren uv 0.10.9, Node 22.19.0, npm 10.9.3, Git 2.38.1, GitHub CLI 2.88.1 und FFmpeg 7.1.1 vorhanden. Diese Angaben sind ein datierter Befund, keine Versionsvorgabe für das Projekt.

- `python` zeigt hier auf den Windows-Store-Alias; `py` findet keine registrierten Interpreter. Trotzdem ist unter uv ein funktionsfähiges Python 3.12.9 installiert. Python 3.11.0, 3.13.1 und 3.9.13 wurden ebenfalls über ihre konkreten Programmpfade nachgewiesen. Eine Python-Neuinstallation ist für den vorgesehenen Start nicht erforderlich.
- In PowerShell `npm.cmd` verwenden. Der unqualifizierte Aufruf `npm` wählt hier `npm.ps1`, das durch die Ausführungsrichtlinie blockiert wird.
- Der globale uv-Cache war in der eingeschränkten Agentumgebung nicht zugänglich. Für Projektbefehle kann ein ignorierter Cache im Repository verwendet werden:

  ```powershell
  $env:UV_CACHE_DIR = Join-Path $PWD '.uv-cache'
  ```

- Playwright 1.64.1 verwendet unter Windows `taskkill`, um seinen Preview-Prozessbaum zu beenden. Browserchecks in dieser Agentumgebung benötigen die passenden Prozessberechtigungen; der gemeinsame Check kann Port 4214 über `PW_PORT` erhalten. Am 17. Oktober 2026 bestanden alle 35 Chromium-Fälle auf dem gebauten Root-Pfad sowie erneut auf dem Projektpfad. Der vollständige Offline-Check umfasste außerdem 67 Python-Tests.
- Die vorhandene GTX 1050 Ti hat 4 GiB Speicher und Treiber 576.02. FP32 wurde mit dem gepinnten CUDA-11-Build von ORT 1.20.1 nachgewiesen; siehe [ASR](asr.md).
- Das lokale Git-Repository ist auf `main` initialisiert. Es wurde kein Remote angelegt oder konfiguriert. Der eingeschränkte Agent läuft unter einer anderen Windows-SID als der Ordnerbesitzer. Falls Git deshalb „dubious ownership“ meldet, nur für den konkreten Aufruf den geprüften Repositorypfad übergeben, ohne globale Einstellungen zu ändern:

  ```powershell
  $repoPath = (Get-Location).Path
  git -c "safe.directory=$repoPath" status --short
  ```

## Abhängigkeiten und nächste Arbeiten

Die öffentlichen Befehle für Feedimport, Quellenlücken und geprüfte GUID-Aliase stehen in der [Kataloganleitung](catalog.md). Der [datierte Inventarbericht](research/catalog-inventory-2026-10-17.md) trennt den Live-Quellennachweis von den Offline-Prüfungen und einer späteren Transkription.

Die [Grundformanalyse](analysis.md) beschreibt das optionale spaCy-Extra, die getrennte Installation des festgelegten deutschen Modells und den expliziten Modellnachweis. Normale Webbuilds verwenden validierte gespeicherte Analysen und laden kein Modell. Eigene Korpora werden für Suche und Statistik gemeinsam über `PODCAST_WORDS_EPISODES` ausgewählt; `PODCAST_WORDS_ANALYSES` verweist auf ihre gespeicherten Analysen.

Bei einer beabsichtigten Abhängigkeitsänderung Manifest und Lockfile gemeinsam aktualisieren und den relevanten Check ausführen. onnx-asr und der CUDA-11-GPU-Anbieter sind gesperrt installiert; die Modellgewichte werden erst beim ausdrücklich gestarteten Transkriptionsbefehl geladen. Pagefind ist in der Suche integriert und Recharts im Statistikvergleich. spaCy ist als optionales Extra gesperrt; sein Sprachmodell wird ausdrücklich getrennt installiert. Es gibt keine versteckten Modelldownloads. Die nächsten Aufgaben stehen in `TASKS.md`.
