# Windows-CPU: ASR-Funktionsnachweis

Prüfdatum: 16. Oktober 2026. Konfiguration und Quellen sind in [ASR](../asr.md) festgehalten. Dies ist kein Colab-GPU-Nachweis und keine Freigabe zur Archivverarbeitung.

## Reale Eingabe

Katalogidentität: `podcast-ufo` / `ep-5764a1149f18a8f68698fb45bb405264`, `UFO537 Festival`, veröffentlicht am 10. Oktober 2026. RSS-GUID `6ac88caf39599f7c565b9745`, [Publisher-Feed](https://feeds.acast.com/public/shows/podcast-ufo), [Folgenwebseite](https://shows.acast.com/podcast-ufo/episodes/ufo537-festival). Die Identität wurde vom Katalogimport übernommen.

Die für diesen Lauf bereits separat verifizierten Originalbytes liegen untracked unter `.cache/pilot-candidate-audio/ep-5764a1149f18a8f68698fb45bb405264.mp3`. SHA-256: `d7f924479192f60229b5ba800227f640bb18a73527e360cc909f3657839327cf`. Die Dauer laut FFprobe der Quelldatei beträgt 4343,215313 Sekunden; der Transkriptvertrag verwendet die tatsächliche decodierte PCM-Dauer.

## Laufstand

Der vollständige öffentliche CPU-Befehl wurde gestartet. Abschluss, gemessene Zeit und Ergebnisprüfung werden nach erfolgreichem Abschluss ergänzt. Eine laufende Inferenz ist noch kein erfolgreiches Gesamtergebnis.

## Noch offene Abnahme

- Schwierige Ausschnitte mit unabhängig abgehörten Referenzen prüfen; der Agent kann keinen menschlichen Hörnachweis ersetzen.
- Unabhängige Anfangs-/Mitte-/Endreferenzen und höchstens fünf Sekunden Abweichung für alle fünf Pilotfolgen belegen.
- Exporteur bestätigt die genaue Upstream-Commitzuordnung bislang nicht; die tatsächlich geladenen Exportdateien sind immutable gepinnt.
- Colab-GPU, Drive-Sicherung und Wiederaufnahme separat ausführen.

Die Offline-Prüfungen verwenden ausdrücklich fiktive native Modellausgaben und belegen bekannte absolute Zeiten sowie Ablehnung ungültiger Ergebnisse durch die öffentliche CLI. Sie ersetzen keine dieser offenen Integrationsprüfungen.
