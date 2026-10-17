# Entwicklungsumgebung

## Stand der Einrichtung

Der Plan ist gemeinsam bestätigt. Das Repository enthält ein installierbares Python-Paket unter `src/podcast_words/`, einen React/TypeScript/Vite-Starter unter `web/`, einen dünnen [Colab-Einstieg](../notebooks/colab.ipynb) und gemeinsame Offline-Prüfungen. Die erste Datenvalidierung ist beschrieben in [data-contracts.md](data-contracts.md). [TASKS.md](../TASKS.md) führt zu den nächsten Funktionsnachweisen.

`AGENTS.md` verweist abhängig von der Aufgabe auf Plan, Fachbegriffe und Recherche. `.editorconfig` und `.gitattributes` vereinheitlichen UTF-8 und Zeilenenden. `.gitignore` hält lokale Umgebungen, Caches und Build-Ergebnisse aus Git heraus; normalisierte Transkripte und Analyseergebnisse werden weiterhin versioniert.

## Installieren und prüfen

Alle folgenden Befehle am Repositoryroot ausführen. Python 3.12 und die Node-Version aus `.node-version` verwenden. uv 0.10.9 wurde lokal geprüft und ist auch im CI- und Colab-Einstieg festgelegt. `uv.lock` und `web/package-lock.json` sind die reproduzierbaren Abhängigkeitsstände; reguläres Einrichten verändert sie nicht.

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

Der gemeinsame Check läuft ohne Audio-, Modell- oder GPU-Zugriff. Er prüft Python-Lint und Format, die Datenvertragsgrenzen, die kleinen Beispieldateien, Dokumentationslinks und Notebooksyntax sowie Web-Lint, TypeScript, Produktionsbuilds am Root- und Projektpfad und echte Chromium-Suchen am gebauten Root-Pfad. Die Teilbefehle stehen in `pyproject.toml`, `web/package.json` und `scripts/check.py`.

Installationen benötigen einmalig Zugang zu PyPI, npm und dem Playwright-Browserdownload. `browser:install` installiert den zu Playwright 1.64.1 gehörenden Chromium-Headless-Shell-Browser; die Routineprüfungen verwenden anschließend den installierten Browser offline. Linux-CI installiert dessen Systembibliotheken zusätzlich mit `npx playwright install --with-deps chromium --only-shell`. Nach der ersten Installation wurden `uv sync --locked --offline` und ein npm-CI-Lauf mit lokalem Cache und `--offline` erfolgreich geprüft. Ein frischer Rechner ohne gefüllten Cache benötigt weiterhin Netzwerkzugriff.

## Lokal arbeiten

```powershell
uv run --frozen podcast-words doctor
uv run --frozen podcast-words validate tests/fixtures/synthetic-episode.json
npm.cmd --prefix web run dev
```

Der Entwicklungsserver bindet ausschließlich an `127.0.0.1`, standardmäßig Port 5173. Unter Linux `npm` statt `npm.cmd` verwenden. Mit Strg+C beenden. Die App zeigt ausdrücklich synthetische Daten; Audiowiedergabe folgt später. Für die echte Suche den Produktionsbuild mit seinem generierten Index verwenden:

```powershell
npm.cmd --prefix web run build
npm.cmd --prefix web run preview
```

`npm.cmd --prefix web run test:browser` prüft einen bereits erzeugten Build mit Playwright und startet dafür selbst einen lokalen Preview auf Port 4179. `PW_PORT` wählt bei Bedarf einen anderen Port. Der Web-Check baut zuerst neu und führt diese Browserprüfungen aus. `PW_BASE_PATH=/podcast_words_v3/` erlaubt dieselben Prüfungen gegen einen zuvor mit diesem Basispfad gebauten Stand. Ein laufender anderer Preview wird nicht stillschweigend wiederverwendet.

## Suchindex mit kontrollierten Eingaben

Der Vite-Build validiert die in [search-corpus.json](../tests/fixtures/search-corpus.json) aufgeführten Episodendateien zuerst durch dieselbe Python-CLI. `PODCAST_WORDS_EPISODES` kann auf eine andere JSON-Liste zeigen; deren Dateipfade gelten relativ zur Liste, der Listenpfad relativ zum Repositoryroot. Pro Build ist genau ein Podcast zulässig. Pagefind 1.5.2 erzeugt pro Folge ein virtuelles deutsches Dokument mit Segmentankern und App-URL. Titel und übrige Metadaten bleiben außerhalb des lexikalischen Indexes, weil diese Pagefind-Version auch Metadaten durchsucht.

Unter `dist/search/manifest.json` steht der Indexstand. Ein SHA-256-Verzeichnis bindet Pagefind-Dateien, kompakte Such-ID→Episoden-ID/Datum-Zuordnung und ursprüngliche Episodendateien zusammen. Der Browser liest die Zuordnung vor den Ergebnisdetails; weder der Seitenstart noch eine erfolglose Suche lädt Episodenfragmente oder Transkripte. Der Buildadapter liest die von der gesperrten Pagefind-Version erzeugten Fragmentdateien und prüft deren Signatur sowie die vollständige Zuordnung. Ein Paketwechsel benötigt einen erneuten Browsernachweis dieses Formats.

Die Suche läuft in einem eigenen Worker. Er meldet auch von Pagefind intern abgefangene Abruffehler, statt sie als Nulltreffer auszugeben. Ein bewusster neuer Suchlauf verwendet einen frischen Worker und kann dadurch nach einem fehlgeschlagenen Chunk erneut laden. Automatische Wiederholungen gibt es nicht. Fundstellen verwenden kopierte Rohpositionen und die Pagefind-Anker, zeigen den Originalsegmenttext und dessen Beginn auf der Episodenzeitachse. Die Browserprüfungen belegen Wortformen, Zeitmarken, Metadatenabgrenzung, separate Abfragepositionen und Fehler/Wiederholung. Mehrwort-Rangfolge, zusätzliche Ergebnisladungen, Wiedergabe und die echte Pilotqualität sind spätere Nachweise.

`doctor` kontrolliert Python und ein ausführbares FFmpeg. Bei fehlendem oder nicht ausführbarem FFmpeg liefert er einen Fehlerstatus. Ein erfolgreicher Aufruf ist kein ASR- oder GPU-Nachweis. Seit dem CPU-ASR-Adapter benötigt auch der Offline-Check FFmpeg: Kleine erzeugte PCM-Prüfdaten durchlaufen die echte Decodierung, während nur der externe Modelloutput ersetzt wird. CI verwendet dafür das über `uv.lock` gesperrte Dev-Wheel `imageio-ffmpeg==0.6.0`; `scripts/prepare_ci_ffmpeg.py` kopiert dessen enthaltene Binärdatei unter dem Befehlsnamen `ffmpeg` in `.cache/ci-ffmpeg` und ergänzt ausschließlich den CI-Pfad. Das Skript lädt selbst nichts herunter und verändert keine globalen Einstellungen. Auf einem frischen lokalen Rechner kann derselbe vorbereitete Ordner dem Shell-Pfad hinzugefügt werden. Große Audio- oder Modelldownloads bleiben ausdrücklich gestarteten Integrationsläufen vorbehalten. Der echte Windows-ASR-Lauf verwendete separat protokolliertes Host-FFmpeg 7.1.1; siehe [ASR](asr.md).

Das Notebook installiert das gesperrte Paket aus einem bereitgestellten Checkout und ruft dieselbe CLI auf. Es enthält keine zweite Pipeline. Der Notebook-Code wurde lokal auf Syntax und fehlende gespeicherte Ausgaben geprüft; ein echter Colab-/Drive-/GPU-Lauf steht noch aus.

## CI und Prüfstand

[GitHub Actions](../.github/workflows/ci.yml) installiert die gesperrten Abhängigkeiten auf Windows und Linux und führt denselben gemeinsamen Check aus. Der Workflow veröffentlicht nichts. Ohne Remote wurde noch kein gehosteter Actions-Lauf ausgelöst; die Prüfungen wurden lokal unter Windows ausgeführt.

Der Entwicklungsserver, das durch Vite kompilierte React-Modul und der gemeinsame Prüfdatenimport wurden lokal über HTTP geprüft. Auch Produktions-HTML sowie JavaScript und CSS unter `/podcast_words_v3/` antworteten im lokalen Preview mit HTTP 200. Der Gesamtcheck baut zuletzt den Root-Pfad, sodass anschließend auch der normale Preview-Befehl aus `web/package.json` funktioniert. Die spätere Pilotabnahme enthält echte Browser-, Mobil-, Such- und Playerprüfungen; diese sind durch einen Starter-Build nicht erbracht.

## Besonderheiten dieses Windows-Arbeitsplatzes

Beim schreibgeschützten Audit am 16. Oktober 2026 waren uv 0.10.9, Node 22.19.0, npm 10.9.3, Git 2.38.1, GitHub CLI 2.88.1 und FFmpeg 7.1.1 vorhanden. Diese Angaben sind ein datierter Befund, keine Versionsvorgabe für das Projekt.

- `python` zeigt hier auf den Windows-Store-Alias; `py` findet keine registrierten Interpreter. Trotzdem ist unter uv ein funktionsfähiges Python 3.12.9 installiert. Python 3.11.0, 3.13.1 und 3.9.13 wurden ebenfalls über ihre konkreten Programmpfade nachgewiesen. Eine Python-Neuinstallation ist für den vorgesehenen Start nicht erforderlich.
- In PowerShell `npm.cmd` verwenden. Der unqualifizierte Aufruf `npm` wählt hier `npm.ps1`, das durch die Ausführungsrichtlinie blockiert wird.
- Der globale uv-Cache war in der eingeschränkten Agentumgebung nicht zugänglich. Für Projektbefehle kann ein ignorierter Cache im Repository verwendet werden:

  ```powershell
  $env:UV_CACHE_DIR = Join-Path $PWD '.uv-cache'
  ```

- Die eingeschränkte Agentumgebung verweigert unter Umständen auch für eigene Prozesse `taskkill`. Playwright 1.64.1 verwendet dieses Windows-Werkzeug zum Beenden seines Preview-Prozessbaums und wartet nach bestandenen Tests weiter, wenn die Berechtigung fehlt. Beim integrierten Check am 17. Oktober 2026 wurden alle zwölf Browserfälle bestanden; nach einer gezielten freigegebenen Bereinigung ausschließlich des anhand PID, Eltern-PID und Port geprüften Preview-Baums endete derselbe Gesamtcheck mit Status 0. Browserchecks in dieser Agentumgebung benötigen daher passende Prozessberechtigungen.
- Die vorhandene GTX 1050 Ti hat 4 GiB Speicher und Treiber 576.02. Das ist kein Nachweis für Kompatibilität mit aktuellen ONNX-GPU-Paketen; siehe [Runtime-Recherche](research/runtime-and-search-contracts.md).
- Das lokale Git-Repository ist auf `main` initialisiert. Es wurde kein Remote angelegt oder konfiguriert. Der eingeschränkte Agent läuft unter einer anderen Windows-SID als der Ordnerbesitzer. Falls Git deshalb „dubious ownership“ meldet, nur für den konkreten Aufruf den geprüften Repositorypfad übergeben, ohne globale Einstellungen zu ändern:

  ```powershell
  $repoPath = (Get-Location).Path
  git -c "safe.directory=$repoPath" status --short
  ```

## Abhängigkeiten und nächste Arbeiten

Die öffentlichen Befehle für Feedimport, Quellenlücken und geprüfte GUID-Aliase stehen in der [Kataloganleitung](catalog.md). Der [datierte Inventarbericht](research/catalog-inventory-2026-10-17.md) trennt den Live-Quellennachweis von den Offline-Prüfungen und einer späteren Transkription.

Die [Grundformanalyse](analysis.md) beschreibt das optionale spaCy-Extra, die getrennte Installation des festgelegten deutschen Modells und den expliziten Modellnachweis. Normale Webbuilds verwenden validierte gespeicherte Analysen und laden kein Modell. Eigene Korpora werden für Suche und Statistik gemeinsam über `PODCAST_WORDS_EPISODES` ausgewählt; `PODCAST_WORDS_ANALYSES` verweist auf ihre gespeicherten Analysen.

Bei einer beabsichtigten Abhängigkeitsänderung Manifest und Lockfile gemeinsam aktualisieren und den relevanten Check ausführen. onnx-asr und der CPU-Anbieter sind gesperrt installiert; die Modellgewichte werden erst beim ausdrücklich gestarteten Transkriptionsbefehl geladen. Pagefind ist im kontrollierten Suchnachweis integriert. spaCy ist als optionales Extra gesperrt; sein Sprachmodell wird ausdrücklich getrennt installiert. Recharts folgt mit dem Statistikvergleich. Es gibt keine versteckten Modelldownloads des Starters. Die nächsten Aufgaben stehen in `TASKS.md`.
