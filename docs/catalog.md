# Folgenkatalog und Quellenabgleich

Der Katalog erfasst Quellen und Metadaten unabhängig von Transkripten. Die Python-Modelle in `src/podcast_words/catalog.py` sind maßgeblich; [catalog-v1.schema.json](../schemas/catalog-v1.schema.json) ist ihr struktureller Export. `catalog show` prüft zusätzlich eindeutige IDs, Quellen und GUID-Zuordnungen sowie belegte GUID-Aliase. Der bestehende Episodenvertrag bleibt unverändert.

## Bedienung

Vom Repositoryroot mit der [Entwicklungsumgebung](development.md):

```powershell
uv run --frozen podcast-words catalog import --catalog data/podcast-ufo/catalog.json
uv run --frozen podcast-words catalog show --catalog data/podcast-ufo/catalog.json
uv run --frozen podcast-words catalog add-source --catalog data/podcast-ufo/catalog.json --source data/podcast-ufo/supplemental/episode37.json
uv run --frozen podcast-words catalog schema --output schemas/catalog-v1.schema.json
```

`import` verwendet den publisherverlinkten Acast-Feed, folgt Weiterleitungen und erlaubt mit `--feed` eine andere HTTP-Quelle. `--podcast-id` setzt den Namensraum eines neuen Katalogs; abweichende IDs dürfen einen vorhandenen Katalog nicht überschreiben. Der Socket-Timeout beträgt 30 Sekunden, die Feedgrenze 20 MiB. Es gibt keine automatischen Wiederholungen. HTTP-/TLS-/Dateifehler liefern JSON-Diagnosen und Exitstatus 1; fehlerhafte Befehlsargumente Exitstatus 2.

Empfangene Feeds bleiben unverändert als datierte XML-Snapshots neben dem Katalog erhalten. Der Bericht mit gleichem Dateistamm nennt angeforderte und endgültige URL, UTC-Abrufzeit, SHA-256, Eintragsanzahl und Befunde. Alle Titel werden berücksichtigt. Doppelte GUIDs, ungültige Audio-Enclosures und unbrauchbare RSS-Metadaten werden mit Eintragsposition und Kontext gemeldet. Ein fehlerhafter Snapshot bleibt untersuchbar; der vorhandene Katalog bleibt unverändert. Es gibt keine fest erwartete Folgenzahl.

Die rohen XML-Snapshots sind in `.gitattributes` als Binärdateien markiert, damit Git weder Publisher-Zeilenenden noch ursprüngliche Einrückung verändert. Die Prüfsumme bezieht sich auf genau diese gespeicherten Bytes.

Der Katalog wird atomar ersetzt. Die Quellenbefehle schreiben ausschließlich Katalog- und Snapshotdateien. Vorhandene Episoden-JSONs, deren Text, Zeitmarken und Modellherkunft bleiben erhalten.

## Identität und Zustände

Die anfängliche ID ist `ep-` plus die ersten 32 Hexzeichen von SHA-256 über die UTF-8-Folge `podcast_id`, NUL, Quellenart (`rss` oder `supplemental`), NUL, GUID beziehungsweise ausdrücklich vergebenen Quellenschlüssel. Diese Ableitung ist ab Katalogversion 1 festgelegt. Die gespeicherte Zuordnung bleibt maßgeblich; ein Alias ändert weder ID noch ursprünglichen Quellenschlüssel.

Der Abgleich verwendet ausschließlich bekannte GUIDs und geprüfte Aliase. Gleiche Titel, Nummern oder Audioadressen erzeugen keine Zusammenführung. Bei bekannten GUIDs werden Anzeigemetadaten und Enclosures aktualisiert. Ausgelassene Folgen bleiben als `feed-omitted` erhalten; das behauptet keinen HTTP-404-Befund.

| Feld | Aussage |
| --- | --- |
| `source` | Ursprüngliche RSS-GUID oder stabiler Ergänzungsschlüssel, Quellenreferenz und GUID-Aliase |
| `source_status` | `feed-listed`, `feed-omitted`, `verified-supplemental` oder ausdrückliche `source-gap` |
| `audio_availability` | `unverified` bei bloßem Feed-Enclosure, `retrievable` nach Audioabruf, `unknown` nach Feedauslassung, `unavailable` bei Quellenlücke |
| `processing_status` | Separat `not-processed`, `processing`, `failed` oder `completed`; Quellenbefehle erhalten bestehende Zustände |
| `audio_probe` | Prüfzeit, HTTP-Status, Zieladresse, Medientyp, Anzahl und SHA-256 der geprüften Anfangsbytes |
| `source_evidence`, `identity_verifications` | Datierte Begründungen für Ergänzungen und zusätzliche GUIDs |

Der Audio-Probe liest höchstens 65.536 Bytes per Range-GET und verlangt Audio-Medientyp und Dateisignatur. Das trennt HTML-Wiedergabeseiten von herunterladbaren Audiodaten, belegt aber keine vollständige Dekodierbarkeit, inhaltliche Identität oder dauerhafte Erreichbarkeit. Diese Nachweise gehören in die geprüfte Quellenbegründung. Ein geänderter Enclosure-Link verwirft einen dazu nicht mehr passenden Probe.

## Ergänzungen und Aliase

Eine Ergänzungsdatei enthält `source_key`, `title`, `reference_url` und eine konkrete `evidence`-Begründung; `published_at`, `episode_number` und `audio_url` sind optional. Mit Audioadresse prüft `add-source` die Antwort vor der Übernahme. Ohne sie entsteht eine ausdrückliche Quellenlücke mit leerer Enclosure-Liste. Derselbe Schlüssel behält bei erneuter Übernahme ID, Verarbeitungszustand und frühere Begründungen. Ein unbelegtes historisches Veröffentlichungsdatum bleibt `null`.

Eine spätere GUID erst nach Identitätsprüfung und vor dem nächsten Feedimport zuordnen:

```powershell
uv run --frozen podcast-words catalog alias --catalog data/podcast-ufo/catalog.json --episode-id ep-EXISTIERENDE_ID --guid VERIFIZIERTE_GUID --verified-identity --evidence "Konkreter Nachweis derselben Aufnahme und Folge"
```

Beide Nachweisargumente sind erforderlich. Eine bereits einer anderen Folge zugeordnete GUID wird als Konflikt abgewiesen; die CLI vereinigt keine bereits getrennt erfassten Datensätze. Deshalb bei einer Quellenumstellung den Alias vor dem Import erfassen. Danach aktualisiert der Feed denselben Datensatz unter seiner vorhandenen ID. Ergänzungen mit bestätigten GUID-Aliasen werden über den Feed abgeglichen.

Der [Live-Inventarbericht](research/catalog-inventory-2026-10-17.md) dokumentiert reale Quellen. Die Offline-Tests in `tests/test_catalog.py` führen öffentliche Befehle gegen einen lokalen HTTP-Server aus, einschließlich Redirect, Sondertiteln, Fehlerbefunden, Quellenlücken, Aliasprüfung und Feedauslassung. Sie brauchen weder Netzwerk noch Audio- oder Modelldownloads. Ein Katalogeintrag bedeutet keine Transkription.
