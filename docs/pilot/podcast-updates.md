# Abschluss: lokale Aktualisierung und mehrere Podcasts

Stand: 8. November 2026. Branch `feature/podcast-updates`; Umsetzung in `d45f1e3`. [Tickets](../../.scratch/podcast-updates/ticket-index.md), [Integrationsprüfung](../../.scratch/podcast-updates/review.md) und [maschineller Nachweis](evidence/podcast-updates.json).

## Ergebnis

`podcasts.json` konfiguriert Namen, Sprecher, Cover, Feed und Datenordner. Der lokale Update-Befehl importiert neue Feedfolgen, verarbeitet standardmäßig höchstens zehn fehlende verarbeitbare Folgen älteste zuerst und ergänzt die notwendigen Wortanalysen. Vorhandene gültige Transkripte werden erhalten. Fehler, ausgelassene Quellen und Wiederaufnahme sind über die öffentliche CLI geprüft. Ein Modellsetup pro Batch und die bisherigen normalisierten Zeitprotokolle bleiben erhalten.

Der normale Webbuild verwendet alle vollständigen Katalogfolgen je Podcast statt einer manuell gepflegten Pilotliste. Eine gemeinsame App lädt je Podcast getrennte statische Such-/Statistikdateien. Konfigurierte Podcasts erscheinen mit Fortschritt und letztem erfolgreichem Feedimport automatisch, einschließlich eines ehrlichen Leerezustands. Root-/Projektpfad und bestehende Folge-/Zeitlinks funktionieren. Die [Bedienungsanleitung](../updates.md) enthält Voraussetzungen, Befehle und Erweiterung.

Der Feed wurde als Metadaten aktualisiert: vier neue Feedfolgen, 542 bekannte Folgen einschließlich Archivfolge 37, weiterhin fünf fertige Folgen. Transkript- und Analysebytes des echten Fünferbestands sind unverändert. Der gespeicherte Erfolgsabruf stammt vom 8. November 2026. Ein echter GPU-Batch wurde zur Implementierung nicht gestartet.

## Prüfung

- Vollständiger lokaler Check: 89 Pythonfälle, 68 bestehende Chromiumfälle je Basispfad und vier konfigurierte Mehr-Podcast-Fälle je Basispfad, insgesamt 144 Browserfälle; Lint, Typen, Vertragsgrenzen und lokale Dokumentationslinks bestanden.
- Kontrollierter RSS-/Audio-Server mit echter FFmpeg-Decodierung; Modellantworten sind die einzige externe ASR-/NLP-Grenze. Limit, Reihenfolge, fehlende Metadaten, Download-/Analysefehler und wiederaufgenommene Arbeit geprüft.
- Zwei getrennte echte Pagefind-Indizes und ein leerer Podcast an `/` und `/racoo/`: keine Suchdaten des falschen Podcasts, alte direkte Links und erneuter Metadatenabruf nach Fehlern.
- Windows-Schreibfehler gezielt mit echten Leserhandles reproduziert: kurze Sperre wird begrenzt wiederholt, permanente Sperre bleibt ein Fehler und erhält die vorherige Datei/Veröffentlichung.
- Echter Build: fünf Folgen, 2.994.046 Byte; Browser zeigt 5/542, Datum 8.11.2026, haus=9 für Prolog und Originalkarten. Keine JavaScriptfehler oder Seitenüberbreite bei 390 Pixeln. Der normale echte Root-Build wurde zuletzt wiederhergestellt.
- Der tatsächliche Pages-Guard aus der einzigen Workflow-Datei lehnt den Fixture-Build ab und akzeptiert die echte konfigurierte Veröffentlichung. actionlint bestanden. GitHub startet weiterhin keine Testjobs.

## Verbleibende Grenzen

Archivfolge 37 hat noch kein belegtes Veröffentlichungsdatum und wird mit Grund ausgelassen. Die deutsche Grundformanalyse bleibt auf das festgelegte Modell beschränkt. Ein echter Zehnerlauf sowie die unabhängige menschliche Suchqualitätsabnahme sind gesonderte Integrations-/Betriebsschritte. main und die öffentliche Webseite wurden durch die Feature-Arbeit nicht aktualisiert; Veröffentlichung erfolgt nach einem späteren Merge.
