# Startsuche, Kartenbreiten und Eimer-Vorbelegung

Stand: 12. November 2026. [Ticket 09](../../.scratch/pagefind-minimap/issues/09-landing-alignment-default-query.md), umgesetzt auf `feature/pagefind-minimap`.

Das Podcastlogo steht fünf Pixel weiter links als im vorigen Stand; der Abstand zwischen Kopfzeile und Podcastinfos sinkt von 20 auf 10 Pixel. Auf der Startseite steht der Hell-/Dunkelschalter direkt rechts neben dem Suchfeld. Der alte Fußtext entfällt. Podcastauswahl und FAQ sind zentriert und maximal 760 Pixel breit; die FAQ erhält beim Öffnen dieselbe Kartenfläche und denselben Schatten. Die zustandsabhängigen Text-Fades wachsen von 22 auf 36 Pixel.

DAS PODCAST UFO startet beim normalen Einstieg ohne Suchparameter automatisch mit `Eimer`. Bearbeitete Eingaben von der Startseite oder vorhandene Suchlinks haben Vorrang. Eine bewusst geleerte Suche schreibt `q=` und bleibt auch nach Neuladen leer. Direkte Folge-/Audiolinks lösen keine zusätzliche Beispielsuche aus, andere Podcasts erhalten keine Vorgabe.

## Prüfung

- Web-Lint, TypeScript/Build und lokale Dokumentationslinks bestanden.
- Gebaute kleine Pagefind-Korpora an `/racoo/` und `/`: jeweils 64, insgesamt **128 Chromium-Fälle bestanden**. Je vier für den separaten konfigurierten Mehrpodcast-Lauf vorgesehene Fälle übersprungen. Die neue Eimer-Vorbelegung, bewusstes Leeren/Neuladen und übernommene Freitexte sind über den öffentlichen Einstieg geprüft; isolierte Suchtests verwenden ausdrücklich `q=`. Python-/ASR-Code unverändert.
- Normaler Build anschließend wieder mit **106 echten Folgen**, Index `f376233a6636…`, Veröffentlichung `939d88ce3706…`; Artefakt **17.880.995 Byte**. Gespeicherte Episoden/Kataloge unverändert, Feedstand 8.11.2026.
- Echte Ansichten in Hell/Dunkel und bei 1280, 390 und 320 Pixeln geprüft. Podcastkarte und FAQ messen jeweils 760, 350 und 280 Pixel; der Modusschalter steht 12 Pixel rechts neben dem Eingabefeld und exakt auf derselben vertikalen Mitte. Kein horizontaler Überlauf. Offene FAQ, Startsuche, Podcastkopf und größerer Fade anhand von Screenshots visuell geprüft.
- Realer normaler Einstieg zeigt `Eimer` mit zehn Top-Karten; 36-Pixel-Fade, Leeren/Neuladen und ein expliziter `kratzeis`-Link bestanden. [Layout- und Einstiegsergebnisse](evidence/landing-layout-values.json)

Die lokale Vorschau unter `http://127.0.0.1:4174/` zeigt den echten Bestand. Kein Main-Merge oder öffentliches Deployment.
