# Entwicklungsumgebung

## Stand der Einrichtung

Der Plan ist gemeinsam bestätigt. Das Repository enthält ein installierbares Python-Paket unter `src/podcast_words/`, eine React/TypeScript/Vite-Site unter `web/`, einen lokalen FP32-GPU-Laufweg und gemeinsame Offline-Prüfungen. Die erste Datenvalidierung ist beschrieben in [data-contracts.md](data-contracts.md). [TASKS.md](../TASKS.md) führt zu den nächsten Funktionsnachweisen.

`AGENTS.md` verweist abhängig von der Aufgabe auf Plan, Fachbegriffe und Recherche. `.editorconfig` und `.gitattributes` vereinheitlichen UTF-8 und Zeilenenden. `.gitignore` hält lokale Umgebungen, Caches und Build-Ergebnisse aus Git heraus; normalisierte Transkripte und Katalogdaten werden weiterhin versioniert.

## Installieren und prüfen

Alle folgenden Befehle am Repositoryroot ausführen. Python 3.12 und die Node-Version aus `.node-version` verwenden. uv 0.10.9 wurde lokal geprüft und ist auch im Veröffentlichungsworkflow festgelegt. `uv.lock` und `web/package-lock.json` sind die reproduzierbaren Abhängigkeitsstände; reguläres Einrichten verändert sie nicht.

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

Der gemeinsame Check läuft ohne Audio-, Modell- oder GPU-Zugriff. Er prüft Python-Lint und Format, die Datenvertragsgrenzen, die kleinen Beispieldateien, Dokumentationslinks sowie Web-Lint, TypeScript, Produktionsbuilds am Root- und Projektpfad und echte Chromium-Prüfungen beider gebauten Pfade sowie einen konfigurierten Zwei-Podcast-Bestand mit zusätzlichem Leerzustand. Dabei werden Suchindex und Datenabrufe, direkte Folgen-/Zeitlinks, Playerzustände und die mobile Kombinationsansicht mit Trefferdiagramm geprüft. Am Ende baut der Check erneut den Root-Pfad für den normalen Preview-Befehl. Die Teilbefehle stehen in `pyproject.toml`, `web/package.json` und `scripts/check.py`.

Installationen benötigen einmalig Zugang zu PyPI, npm und dem Playwright-Browserdownload. `browser:install` installiert den zu Playwright 1.64.1 gehörenden Chromium-Headless-Shell-Browser; die Routineprüfungen verwenden anschließend den installierten Browser offline. Unter Linux können dessen Systembibliotheken zusätzlich installiert werden mit `npx playwright install --with-deps chromium --only-shell`. Nach der ersten Installation wurden `uv sync --locked --offline` und ein npm-CI-Lauf mit lokalem Cache und `--offline` erfolgreich geprüft. Ein frischer Rechner ohne gefüllten Cache benötigt weiterhin Netzwerkzugriff.

## Lokal arbeiten

```powershell
uv run --frozen podcast-words doctor
uv run --frozen podcast-words validate tests/fixtures/synthetic-episode.json
npm.cmd --prefix web run build
npm.cmd --prefix web run preview
```

Der Preview bindet ausschließlich an `127.0.0.1`, standardmäßig Port 4173. Unter Linux `npm` statt `npm.cmd` verwenden. Mit Strg+C beenden. Der normale lokale Build verwendet alle gespeicherten abgeschlossenen Folgen. Routinechecks wählen ihre synthetischen Daten ausdrücklich aus. Passagen öffnen den gemeinsamen Online-Player nach Nutzeraktion mit einem Hinweis auf grobe Zeiten und Werbung. Für die echte Suche den Produktionsbuild mit seinem generierten Index verwenden:

```powershell
npm.cmd --prefix web run build
npm.cmd --prefix web run preview
```

`npm.cmd --prefix web run test:browser` prüft einen bereits erzeugten Build mit Playwright und startet dafür selbst einen lokalen Preview auf Port 4179. `PW_PORT` wählt bei Bedarf einen anderen Port. `PW_BASE_PATH=/racoo/` erlaubt dieselben Prüfungen gegen einen zuvor mit diesem Basispfad gebauten Stand. Ein laufender anderer Preview wird nicht stillschweigend wiederverwendet. Der gemeinsame Check führt die Browserprüfungen für beide Basispfade mit Port 4214 aus.

## Gespeicherte Veröffentlichung und Prüfkorpora

Der normale Build veröffentlicht alle validierten abgeschlossenen Transkripte aus der Podcastkonfiguration. Pagefind und Metadaten werden ohne Audio-/NLP-/Modellabruf gebaut. [Betrieb](updates.md) und [Suchvertrag](search.md) beschreiben die Dateien.

Explizite kleine Prüfkorpora wählen `PODCAST_WORDS_EPISODES=tests/fixtures/search-corpus.json`; vorbereitete Quellen wählt `PODCAST_WORDS_PUBLICATION_SOURCE`. `PODCAST_WORDS_CONFIG` wählt eine andere Podcastkonfiguration. Weder Analyseordner noch `PODCAST_WORDS_ANALYSES` sind nötig. Diese Einstellungen für den anschließenden echten Build entfernen.

## Lokale Prüfungen und Veröffentlichung

Tests laufen lokal während der Entwicklung. Vor einem Push die zur Änderung passenden Prüfungen ausführen; `uv run --frozen python scripts/check.py` bleibt der vollständige lokale Offline-Check mit Python, Web-Lint, Builds und Chromium-Prüfungen beider Basispfade. Echte GPU-Inferenz bleibt eine separat gestartete lokale Integrationsprüfung.

[Deploy Racoo](../.github/workflows/pages.yml) ist der einzige GitHub-Actions-Workflow. Er baut und veröffentlicht bei Pushes auf `main` oder manuell auf `main`, wenn `PAGES_ENABLED=true` gesetzt ist. Pull Requests starten keinen Workflow. Der Veröffentlichungsworkflow installiert Python-Abhängigkeiten mit `uv sync --locked --no-dev`, installiert keine Testbrowser und startet keine Python- oder Browser-Tests. Build und Prüfung auf echte, nicht leere Veröffentlichungsdaten bleiben verpflichtend; ein Fehler stoppt den Upload. Die TypeScript-Prüfung bleibt Bestandteil des normalen Webbuilds.

Die [Pages-Anleitung](github-pages.md) beschreibt die einmalige Einrichtung und manuellen Starts. Die Remote-Adresse ist `https://github.com/jjccmm/racoo.git`.

Der Entwicklungsserver, das durch Vite kompilierte React-Modul und der gemeinsame Prüfdatenimport wurden lokal über HTTP geprüft. Die Produktions-Browserprüfungen laufen nun auf Root- und Projektpfad-Builds und umfassen eine synthetische 390-Pixel-Ansicht mit Suche, Player, Diagramm und Minimap. Diese Layoutprüfung misst keine realen Pilotlaufzeiten, Übertragungsbytes oder Speichergrenzen. Der Gesamtcheck baut zuletzt den Root-Pfad mit ausdrücklich synthetischen Fixtures. Für den echten Pilot danach `npm.cmd --prefix web run build` ausführen; erst dann zeigt der Preview wieder alle echten Folgen.

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
- Der aktuelle Integrationsstand liegt auf `main`; `origin` zeigt auf `https://github.com/jjccmm/racoo.git`. Der eingeschränkte Agent läuft unter einer anderen Windows-SID als der Ordnerbesitzer. Falls Git deshalb „dubious ownership“ meldet, nur für den konkreten Aufruf den geprüften Repositorypfad übergeben, ohne globale Einstellungen zu ändern:

  ```powershell
  $repoPath = (Get-Location).Path
  git -c "safe.directory=$repoPath" status --short
  ```

## Abhängigkeiten und nächste Arbeiten

Die öffentlichen Befehle für Feedimport, Quellenlücken und geprüfte GUID-Aliase stehen in der [Kataloganleitung](catalog.md). Der [datierte Inventarbericht](research/catalog-inventory-2026-10-17.md) trennt den Live-Quellennachweis von den Offline-Prüfungen und einer späteren Transkription.

Der aktive [Suchvertrag](search.md) benötigt nur gespeicherte Transkripte und Pagefind; keine Sprachmodellinstallation. Eigene Prüfkorpora über `PODCAST_WORDS_EPISODES` auswählen. Bei einer beabsichtigten Abhängigkeitsänderung Manifest und Lockfile gemeinsam aktualisieren und relevante lokale Checks ausführen. Die ASR-Modellgewichte werden erst beim ausdrücklich gestarteten Transkriptionsbefehl geladen.

## Aktuelle Suchgestaltung

[Freitext und helle Minimap](search.md): bis fünf Stichwörter, Pagefind-Positionen als Zählbasis, Top10/Alle, ein vollständiger Leser und gemeinsame Audioaktionen. Auf der Startseite steht eine lokale Freitextdemo. Die frühere Lemmaauswahl, automatische haus-Auswahl und Wortschatzstatistik sind abgelöst.
