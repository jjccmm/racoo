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
uv run --frozen python scripts/check.py
```

Linux:

```bash
export UV_CACHE_DIR="$PWD/.uv-cache"
uv sync --locked
npm --prefix web ci --cache .cache/npm
uv run --frozen python scripts/check.py
```

Der gemeinsame Check läuft ohne Audio-, Modell- oder GPU-Zugriff. Er prüft Python-Lint und Format, die Datenvertragsgrenzen, die kleine Beispieldatei, Dokumentationslinks und Notebooksyntax sowie Web-Lint, TypeScript und Produktionsbuilds am Root- und Projektpfad. Die Teilbefehle stehen in `pyproject.toml`, `web/package.json` und `scripts/check.py`.

Installationen benötigen einmalig Zugang zu PyPI und npm. Nach der ersten Installation wurden `uv sync --locked --offline` und ein npm-CI-Lauf mit lokalem Cache und `--offline` erfolgreich geprüft. Ein frischer Rechner ohne gefüllten Cache benötigt weiterhin Netzwerkzugriff.

## Lokal arbeiten

```powershell
uv run --frozen podcast-words doctor
uv run --frozen podcast-words validate tests/fixtures/synthetic-episode.json
npm.cmd --prefix web run dev
```

Der Entwicklungsserver bindet ausschließlich an `127.0.0.1`, standardmäßig Port 5173. Unter Linux `npm` statt `npm.cmd` verwenden. Mit Strg+C beenden. Die App zeigt ausdrücklich synthetische Daten; sie enthält noch keine echte Suche oder Audiowiedergabe.

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

- Die vorhandene GTX 1050 Ti hat 4 GiB Speicher und Treiber 576.02. Das ist kein Nachweis für Kompatibilität mit aktuellen ONNX-GPU-Paketen; siehe [Runtime-Recherche](research/runtime-and-search-contracts.md).
- Das lokale Git-Repository ist auf `main` initialisiert. Es wurde kein Remote angelegt oder konfiguriert. Der eingeschränkte Agent läuft unter einer anderen Windows-SID als der Ordnerbesitzer. Falls Git deshalb „dubious ownership“ meldet, nur für den konkreten Aufruf den geprüften Repositorypfad übergeben, ohne globale Einstellungen zu ändern:

  ```powershell
  $repoPath = (Get-Location).Path
  git -c "safe.directory=$repoPath" status --short
  ```

## Abhängigkeiten und nächste Arbeiten

Bei einer beabsichtigten Abhängigkeitsänderung Manifest und Lockfile gemeinsam aktualisieren und den relevanten Check ausführen. onnx-asr und der CPU-Anbieter sind gesperrt installiert; die Modellgewichte werden erst beim ausdrücklich gestarteten Transkriptionsbefehl geladen. spaCy, dessen Sprachmodell, Recharts und Pagefind werden mit dem jeweils zugehörigen Funktionsnachweis integriert und validiert. Sie sind keine versteckten Downloads des Starters. Die nächsten Aufgaben stehen in `TASKS.md`.
