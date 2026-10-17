# Windows-CPU: ASR-Funktionsnachweis

Prüfbeginn: 16. Oktober 2026, Wiederaufnahme und reale Ausschnittprüfungen: 17. Oktober 2026. Konfiguration und Quellen sind in [ASR](../asr.md) festgehalten. Dies ist kein Colab-GPU-Nachweis und keine Freigabe zur Archivverarbeitung.

## Reale Eingabe

Katalogidentität: `podcast-ufo` / `ep-5764a1149f18a8f68698fb45bb405264`, `UFO537 Festival`, veröffentlicht am 10. Oktober 2026. RSS-GUID `6ac88caf39599f7c565b9745`, [Publisher-Feed](https://feeds.acast.com/public/shows/podcast-ufo), [Folgenwebseite](https://shows.acast.com/podcast-ufo/episodes/ufo537-festival). Die Identität wurde vom Katalogimport übernommen.

Die für diesen Lauf bereits separat verifizierten Originalbytes liegen untracked unter `.cache/pilot-candidate-audio/ep-5764a1149f18a8f68698fb45bb405264.mp3`. SHA-256: `d7f924479192f60229b5ba800227f640bb18a73527e360cc909f3657839327cf`. Die Dauer laut FFprobe der Quelldatei beträgt 4343,215313 Sekunden; der Transkriptvertrag verwendet die tatsächliche decodierte PCM-Dauer.

## Vollständiger CPU-Lauf

Die vollständige Folge wurde am 17. Oktober 2026 erfolgreich über den öffentlichen Befehl verarbeitet und anschließend erneut durch `podcast-words validate` geprüft. Die [versionierten Messdaten](evidence/windows-cpu-ufo537-2026-10-17.json) und [Eingabemetadaten](evidence/ufo537-asr-input.json) gehören zum [normalisierten Transkript](../../data/podcast-ufo/episodes/ep-5764a1149f18a8f68698fb45bb405264.json).

797,015 Sekunden Gesamtlaufzeit ergaben 4343,222875 Sekunden decodiertes Audio, 938 chronologische Segmente und 25.108 native Tokenpunkte einschließlich 26 Whitespace-Tokens. Das entspricht etwa 5,45-facher Echtzeit, einschließlich Modellsitzungsaufbau und Decodierung, bei bereits vorhandenem Audio-/Modellcache. Erster Segmentbeginn: 2,496 Sekunden; letztes Segmentende: 4340,224 Sekunden. Die vollständige semantische Validierung bestand. Die Ergebnisdatei hat 2.251.589 Bytes und SHA-256 `b30300ae860ec402982eb72c891b4030bd2b4c8a67ca91d4796efc1e6dd76e30`.

Zum Wiederholen mit genau den protokollierten Originalbytes und einem neuen Ausgabeziel:

```powershell
uv run --frozen podcast-words transcribe --metadata docs/research/evidence/ufo537-asr-input.json --audio-file .cache/pilot-candidate-audio/ep-5764a1149f18a8f68698fb45bb405264.mp3 --output .cache/asr/repeated-ufo537.json
```

Ein späterer Download derselben URL kann eine andere Werbefassung liefern; vor dem Vergleich die Audio-Prüfsumme prüfen. Die Dauer laut FFprobe und die PCM-Dauer unterscheiden sich hier um rund 0,008 Sekunden. Die gespeicherten Zeitpunkte beziehen sich auf die vollständige PCM-Timeline dieser Eingabe.

Der erste komplette Erkennungslauf erreichte den Validator, wurde aber wegen 26 nativen Whitespace-Tokenpunkten abgewiesen. Der ursprüngliche V1-Typ erlaubte nur Tokentext mit Nicht-Whitespace-Zeichen. Solche echten Modelltokens werden jetzt unverändert erhalten; Segmenttext bleibt unverändert streng. Die neue CLI-Prüfung demonstrierte zunächst genau diesen Fehler und bestand nach der Vertrags-/Schemaanpassung. Das abgewiesene Ergebnis wurde nicht als fertige Folge gespeichert.

## Reale Ausschnitte und bekannter Zeitversatz

`scripts/prove_asr_offset.py` decodiert jeweils 20 Sekunden aus denselben Originalbytes und erzeugt eine zweite Fassung mit genau 60 Sekunden synthetischer Stille davor. Beide Fassungen durchlaufen den öffentlichen Transkriptionsbefehl, FFmpeg, echte CPU-Modelle und den Episodenvalidator. Die abgeleiteten Ergebnisse tragen ausdrücklich synthetische Identität und bleiben im Cache. [Messdaten](evidence/asr-offset-2026-10-17.json) erhalten Audiohashes, Anbieter und Vergleichsergebnisse.

| Originalausschnitt | Ergebnis des Zeitversuchs | Tatsächliche CPU-Läufe |
| --- | --- | --- |
| 180–200 s | Nicht abschließend vergleichbar: VAD erzeugt 2 beziehungsweise 3 Segmente. Erster nativer Punkt 0,08 beziehungsweise 60,08 s. | Beide gültig; bei der ursprünglichen Vergleichsausnahme wurden die Laufzeiten nicht gespeichert. |
| 2100–2120 s | 95 Punkte aus unveränderten Tokensequenzen verschieben sich um 60 s, numerischer Rest < 0,000001 s. Größte Grenzabweichung 0,032 s. Erste Sequenz ändert Großschreibung/Tokenisierung. | 18,812 / 17,047 s für Basis / Stillepräfix. |
| 4200–4220 s | Alle 131 nativen Punkte und sämtliche Segmentgrenzen verschieben sich um 60 s, numerischer Rest < 0,000001 s. Erster Punkt 0,096 beziehungsweise 60,096 s. | 16,344 / 19,000 s für Basis / Stillepräfix. |

Die anfängliche Forderung nach identischen Tokens in jeder Präfixfassung war zu streng: Die zusätzliche Stille verändert den rekurrenten VAD-Zustand, teilweise Segmentgrenzen und dadurch die Erkennung. Der Bericht hält diese Grenze offen; das Vergleichsskript behandelt unterschiedliche Segmentzahlen als nicht abschließend auswertbar. Es vergleicht Tokenzeiten nur bei unveränderten nativen Sequenzen und berücksichtigt sonst weiterhin alle vergleichbaren Segmentgrenzen. Diese Versuche belegen die tatsächliche Sekunden-/Offsetbehandlung, aber keine unabhängig abgehörte Text- oder Suchqualität. Insbesondere sind dies keine menschlich bestätigten Referenzpassagen.

Die Läufe verwendeten Windows 10 (10.0.19045), Intel Xeon E3-1240 v5 mit 3,50 GHz und 8 logischen CPUs, Python 3.12.9 sowie Host-FFmpeg 7.1.1. Modelle und Audio waren bereits lokal vorhanden. Vier ORT-Intra-Op-Threads waren konfiguriert; Encoder, Decoder und VAD meldeten jeweils ausschließlich `CPUExecutionProvider`. Während des vollständigen Laufs liefen auch Offline-Checks und Ausschnittversuche. Die gemessene Zeit ist deshalb kein isolierter Leistungsvergleich.

## Noch offene Abnahme

- Schwierige Ausschnitte mit unabhängig abgehörten Referenzen prüfen; der Agent kann keinen menschlichen Hörnachweis ersetzen.
- Unabhängige Anfangs-/Mitte-/Endreferenzen und höchstens fünf Sekunden Abweichung für alle fünf Pilotfolgen belegen.
- Exporteur bestätigt die genaue Upstream-Commitzuordnung bislang nicht; die tatsächlich geladenen Exportdateien sind immutable gepinnt.
- Colab-GPU, Drive-Sicherung und Wiederaufnahme separat ausführen.

Die Offline-Prüfungen verwenden ausdrücklich fiktive native Modellausgaben und belegen bekannte absolute Zeiten sowie Ablehnung ungültiger Ergebnisse durch die öffentliche CLI. Sie ersetzen keine dieser offenen Integrationsprüfungen.

## Automatisierte Prüfungen

Nach dem Zusammenführen mit Katalog und Pagefind (`integration/podcast-words-pilot` bis `9876268`) endete `uv run --frozen python scripts/check.py` mit Status 0: 41 Python-Prüfungen einschließlich drei neuer CLI-Verhaltensprüfungen, übereinstimmender Schemaexport, Ruff, lokale Dokumentationslinks, Root-/Projektpfad-Builds mit Pagefind und zwölf reale Chromium-Prüfungen. Dabei stand der über das gesperrte Dev-Wheel vorbereitete FFmpeg-Prüfstand 7.1 vor dem Host-FFmpeg im Shell-Pfad. `uv sync --locked --offline` bestand ebenfalls.

Die eingeschränkte Windows-Umgebung blockierte erneut Playwrights `taskkill` beim Preview-Teardown. Nach allen zwölf erfolgreichen Browserfällen wurde ausschließlich der anhand PID, Eltern-PID, ASR-Worktree-Kommandozeile und Port 4179 verifizierte Preview-Baum freigegeben beendet. Danach endete derselbe Gesamtcheck mit Status 0. Diese Berechtigungsgrenze steht auch in [Entwicklung](../development.md); es war keine fehlgeschlagene Browserassertion. Ein gehosteter Windows-/Linux-CI-Lauf wurde nicht ausgeführt.
