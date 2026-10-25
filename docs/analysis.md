# Grundformanalyse

`podcast-words analyze` verarbeitet validierte Episoden, ohne Audio zu laden oder ASR aufzurufen. Eine Korpusdatei enthält eine JSON-Liste von Episodenpfaden relativ zu dieser Datei, beispielsweise [den synthetischen Suchkorpus](../tests/fixtures/search-corpus.json).

## Modell gezielt installieren

spaCy ist als optionales Extra exakt auf 3.8.16 gesperrt. `de_core_news_lg` ist im Analysevertrag auf 3.8.0 festgelegt. Die [Modellmetadaten](https://raw.githubusercontent.com/explosion/spacy-models/master/meta/de_core_news_lg-3.8.0.json) verlangen spaCy `>=3.8.0,<3.9.0`. Das große Modell wird ausdrücklich separat installiert und gehört weder zu Git noch zum normalen Offline-Check:

```powershell
$env:UV_CACHE_DIR = Join-Path $PWD '.uv-cache'
uv sync --frozen --extra analysis
uv pip install --python .venv/Scripts/python.exe --no-deps https://github.com/explosion/spacy-models/releases/download/de_core_news_lg-3.8.0/de_core_news_lg-3.8.0-py3-none-any.whl
uv run --frozen --inexact --extra analysis python scripts/check_analysis_model.py --output .cache/spacy-model-report.json
```

Unter Linux `.venv/bin/python` verwenden. Nach einem erneuten `uv sync`, das zusätzliche Pakete entfernt, das Modell gegebenenfalls erneut installieren. Es findet kein automatischer Modelldownload statt. Der Adapter weist eine andere spaCy- oder Modellversion zurück.

Der explizite Integrationstest verwendet den öffentlichen Analysebefehl und den unabhängig ausgezählten Text „Die Hunde laufen. Ein Hund läuft!“. Erwartet werden sechs Gesamtwörter: `der: 1`, `hund: 2`, `laufen: 2`, `ein: 1`; `der` und `ein` sind Stoppwörter. Der [aufgezeichnete Nachweis](research/evidence/spacy-analysis-2026-10-17.json) stammt aus einem echten Modelllauf. Die [gespeicherten synthetischen Beispielanalysen](../tests/fixtures/analysis/synthetic-episode-001.json) wurden ebenfalls mit diesem Modell erzeugt. Die zweite Prüffolge enthält genau 256 zusätzliche `Hund`-Tokens als expliziten Überlauf-Prüffall.

## Analysieren und wiederverwenden

```powershell
uv run --frozen --inexact --extra analysis podcast-words analyze --episodes tests/fixtures/search-corpus.json --output data/synthetic-podcast/analyses --publish .cache/statistics
uv run --frozen podcast-words analyze --episodes tests/fixtures/search-corpus.json --output tests/fixtures/analysis --cache-only --publish .cache/statistics
```

`--output` speichert pro stabiler Episoden-ID eine versionierbare Analyse mit Schemaversion, Modell-/spaCy-/Analyseversion, Prüfsumme der tatsächlich konsumierten Segmenttexte, Gesamtwörtern und sparsamen Lemmazahlen samt Stoppwortkennzeichen. Der Python-Vertrag in `src/podcast_words/analysis.py` und [sein Schemaexport](../schemas/analysis-v1.schema.json) prüfen unter anderem positive Ganzzahlen, kleingeschriebene Lemmata und die Summe aller Zählungen. Originalepisoden werden nicht verändert. Alle alphabetischen Tokens einschließlich Stoppwörtern zählen; Satzzeichen und Ziffern zählen nicht. spaCy verarbeitet die Segmenttexte in ihrer gespeicherten Reihenfolge.

Unveränderte konsumierte Texte und Einstellungen verwenden die gespeicherte Analyse. Titel, Datum, Audioherkunft und Zeitmarken verändern die Zählung nicht; die öffentliche Katalogansicht übernimmt dennoch aktuelle Metadaten. Geänderter Segmenttext, `--analysis-version` oder Modellkonfiguration machen die Analyse ungültig. `--cache-only` meldet fehlende, ungültige oder veraltete Analysen als Fehler und lädt niemals spaCy. Ein normaler Analyselauf berechnet ausschließlich betroffene Analysen neu. ASR und vorhandene Transkripte sind davon unabhängig.

## Veröffentlichte Dateien und Browser

`--publish` erzeugt einen Katalog, das Vokabular und genau 64 sparsame Zähldateien unter `counts/00.json` bis `counts/63.json`. Alle öffentlichen Statistikdateien verwenden `schemaVersion: 2`. Jede Vokabularzeile nennt ihre Datei. Ein Lemma wird weiterhin über SHA-256 seines UTF-8-Texts modulo 64 zugeordnet.

Die veröffentlichten Vokabular- und Zähldateien enthalten nur für den Häufigkeitsvergleich zugelassene Grundformen. Sobald eine der ausgewählten gespeicherten Analysen ein Lemma als spaCy-Stoppwort kennzeichnet, wird es im gesamten veröffentlichten Bestand ausgeschlossen. Zusätzlich gilt die unten beschriebene manuelle Liste. Die vollständigen Analysen, Transkripte und der Pagefind-Suchtext bleiben erhalten. Der Katalog berechnet Gesamtwörter, verschiedene und chronologisch neue Wörter weiterhin über **alle** alphabetischen Lemmata, einschließlich ausgeschlossener Wörter.

Die Zähldateien enthalten kompakte Paare `[episodeIndex, Anzahl]`. Der ganzzahlige Index beginnt bei null und verweist auf die Position in `catalog.json` → `episodes`. Der Katalog ist nach Veröffentlichungszeitpunkt und bei Gleichstand nach stabiler Episoden-ID geordnet; die stabile `episodeId` steht weiterhin in jedem Katalogeintrag. Der Index gilt ausschließlich innerhalb dieser Veröffentlichung und ist keine dauerhafte Folgenidentität. Beispiel: `"hund": [[0, 2], [3, 258]]` zählt zwei Vorkommen in der ersten und 258 in der vierten Katalogfolge. Fehlende bekannte Wort-/Folgenpaare bedeuten null.

Anzahlen bleiben positive, in JavaScript exakt darstellbare Ganzzahlen bis 9.007.199.254.740.991; Werte über 255 bleiben erhalten. Build und Browser weisen alte Statistikformate, gemischte Veröffentlichungen sowie negative, nichtganzzahlige, doppelte oder außerhalb des Katalogs liegende Indizes zurück. Ein Paar hat genau zwei Zahlen. Fehler sind keine Nullzählungen. Alle Dateien tragen denselben aus Format und Datenstand abgeleiteten `publicationId`; der Webbuild bindet sie anschließend zusammen mit dem Suchindex an seine Veröffentlichungs-ID. Gespeicherte Episode- und Analysis-Dateien behalten ihre bisherigen Verträge.

Der normale Vite-Build bereitet die gespeicherten fünf Pilotfolgen aus `data/podcast-ufo/pilot-episodes.json` mit `publish --cache-only` und ihren versionierten Analysen vor, ohne spaCy zu laden. Der [lokale Pilotablauf](pilot/local-five-episode-pilot.md) beschreibt diese Auswahl. Routinechecks wählen die synthetischen Prüfdaten ausdrücklich mit `PODCAST_WORDS_EPISODES=tests/fixtures/search-corpus.json` und `PODCAST_WORDS_ANALYSES=tests/fixtures/analysis`; Suche und Statistik verwenden damit denselben Korpus. Ein veralteter Cache bricht den Build ab. Die erzeugten Dateien unter `web/dist/stats/` werden nicht versioniert.

Die Wortstatistik lädt zunächst nur Katalog und gefiltertes Vokabular und zeigt höchstens zehn Vorschläge. Ein sichtbarer Hinweis bei der Auswahl erklärt den Ausschluss automatischer Stoppwörter und manuell gepflegter Zusatzwörter; ein Schalter zum Einschließen dieser Wörter entfällt. Nach Auswahl wird die zuständige Zähldatei geladen. Nicht erfolgreiche Abrufe und widersprüchliche Datenstände sind sichtbare Fehler, keine Nullzählungen. Alle Datenpfade berücksichtigen Vites Basispfad. Die Wortentwicklung zeigt zusätzlich die drei Gesamtwerte im Pilot und chronologische Werte je Folge. Die Vergleichsansicht erlaubt bis zu fünf Grundformen mit höchstens zehn Vorschlägen. Sie zeigt standardmäßig Vorkommen je 1.000 Gesamtwörter, einschließlich ausgeschlossener Wörter im Nenner, und bietet eine ausdrücklich beschriftete Rohzählung sowie Top-10-Folgen je Grundform. Bei null Gesamtwörtern wird die normierte Rate als nicht verfügbar dargestellt. Fehlende Wort-/Folgenpaare zählen als null; ein fehlgeschlagener Zähldateiabruf bleibt ein sichtbarer Fehler. Recharts ist exakt auf 3.10.1 festgelegt; dessen [offizielle Paketmetadaten](https://github.com/recharts/recharts/blob/v3.10.1/package.json#L88-L104) erlauben React 19 als Peer-Version.

## Zusätzliche ignorierte Grundformen pflegen

Die einzige reguläre Zusatzliste ist [src/podcast_words/ignored_lemmas.txt](../src/podcast_words/ignored_lemmas.txt). Sie wird mit dem Python-Paket ausgeliefert und enthält zunächst nur `äh` und `ähm`, die das festgelegte Modell nicht als Stoppwörter kennzeichnet. Zum Pflegen die Datei in UTF-8 bearbeiten und versionieren: eine alphabetische Grundform pro Zeile; leere Zeilen und vollständige `#`-Kommentarzeilen sind erlaubt. Großschreibung, äußere Leerzeichen, Unicode-NFC und doppelte Einträge werden normalisiert. Ein optionales UTF-8-BOM ist zulässig. Mehrere Wörter, Ziffern, Bindestriche und Kommentare hinter einem Wort werden mit Dateipfad und Zeilennummer zurückgewiesen.

Danach genügt beim regulären Pilotweg `npm.cmd --prefix web run build`. Der Build veröffentlicht die gespeicherten Analysen cache-only erneut; ASR und spaCy müssen nicht laufen. Sowohl `analyze --publish` als auch `publish --cache-only` und eigene Korpusbuilds verwenden dieselbe Paketliste automatisch. Eine geänderte effektive Liste ändert die Statistik-ID auch dann, wenn das ergänzte Wort im Bestand fehlt. Reine Formatänderungen, Reihenfolge und Duplikate ändern die ID nicht. Das Statistikmanifest dokumentiert die wirksame Regel unter `frequencyExclusions` mit `automaticStopwords: "union-of-selected-analysis-flags"` und normalisierten `ignoredLemmas`.

Für einen Versuch kann `--ignored-lemmas pfad/zur/liste.txt` beim `analyze --publish`- oder `publish`-Befehl die zusätzliche Paketliste ersetzen; automatische Stoppwörter bleiben ausgeschlossen. Eine leere Override-Datei deaktiviert nur die manuellen Ergänzungen. Fehlende oder ungültige ausdrücklich angegebene Listen brechen die Veröffentlichung sichtbar ab; `publish` erhält dabei eine bestehende Ausgabe unverändert. Beispiel ohne Neuanalyse:

```powershell
uv run --frozen podcast-words publish --catalog data/podcast-ufo/catalog.json --episodes data/podcast-ufo/pilot-episodes.json --analyses data/podcast-ufo/analyses --output .cache/custom-publication --cache-only --ignored-lemmas .cache/custom-ignored.txt
$env:PODCAST_WORDS_PUBLICATION_SOURCE = '.cache/custom-publication'
npm.cmd --prefix web run build
Remove-Item Env:PODCAST_WORDS_PUBLICATION_SOURCE
```

Eine explizit über `PODCAST_WORDS_PUBLICATION_SOURCE` gewählte Quelle ist eine vorbereitete Momentaufnahme. Nach Listenänderungen den zugehörigen `publish`-Befehl erneut ausführen und dann die Webseite bauen; der Webbuild verändert diese ausdrücklich gewählte Quelle nicht.

Die regulären Tests ersetzen ausschließlich die Ausgabe der externen spaCy-Bibliothek durch festgelegte Tokens und prüfen den öffentlichen CLI-/Artefaktpfad. Die Browserfälle prüfen den tatsächlichen Produktionsbuild mit den real erzeugten Beispielanalysen. Der separate Modellnachweis ersetzt keine Qualitätsprüfung realer Pilottranskripte.


Der Katalog enthält Pilotwerte für Gesamtwörter, verschiedene kleingeschriebene Grundformen und neue Wörter. Jede Folge enthält dieselben drei Werte. Gesamtwörter zählen alphabetische Vorkommen einschließlich Stoppwörtern; verschiedene Wörter zählen die unterschiedlichen Grundformen in der Folge oder im Pilot. Neue Wörter zählen Grundformen erstmals je Folge, nachdem die Folgen nach Veröffentlichungsdatum und dauerhafter Folgenidentität geordnet wurden. Ein Lemma, das innerhalb einer Folge wiederholt vorkommt, erhöht die verschiedenen und neuen Wörter nur einmal. Ein Transkript ohne alphabetische Tokens behält für alle drei Werte null.
