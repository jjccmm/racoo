# Integrationsprüfung

Datum: 8. November 2026. Prüfung durch den ausführenden Agenten. Implementierung: d45f1e31e24d44197978616d17226d9e2560a1ab.

## Umfang

- Konfiguration und sichere getrennte Datenordner statt neuer Podcast-Sonderfälle in React.
- Öffentlicher Pending-Modus mit Reihenfolge/Limit, Wiederaufnahme und Diagnose unverarbeitbarer Quellen.
- Öffentlicher Update-Befehl mit echtem lokalem RSS-/Audio-/Dateisystem-Test und kontrollierter Modellgrenze; Analysecache nach Fehlern reparierbar.
- Automatische vollständige Veröffentlichungsauswahl, getrennte Podcastindizes und gemeinsame App, Leerezustand, alte Folgenlinks und aktuelle Fortschrittsanzeige.
- Ausschließlich Pages-Veröffentlichung auf GitHub; alle Tests lokal. Keine Migration, feinen Wortzeiten oder Audiovergleiche hinzugefügt.

## Gefundene und behobene Punkte

- Auswahllisten zur Validierung als Manifest übergeben, damit hunderte Folgen keine zu lange Windows-Befehlszeile erzeugen.
- Normale Windows-Lesesperren verhindern gelegentlich den atomaren Ersatz. JSON-Datei und Publikationsordner verwenden eine begrenzte Wiederholung; reale kurzzeitige und permanente Win32-Sperren geprüft. Der konkrete externe Leser der anfänglichen sporadischen Sperren ist nicht identifiziert.
- Gesamtes Artefaktgrößenlimit über alle Podcasts, synthetische konfigurierte Fixtures eindeutig markiert, Root-Pages-Schutz an Zusammenfassung v2 angepasst.

## Nachweise und Grenzen

89 Pythonfälle, 68 bestehende plus vier konfigurierte Chromiumfälle je Basispfad bestanden. Echter Fünferbuild samt 5/542, Feeddatum, haus=9 in Prolog, geladenen Originalkarten und 390-Pixel-Layout geprüft. [Versionierter Nachweis](../../docs/pilot/evidence/podcast-updates.json). Keine offenen Blocker für diesen Umfang. Quelle 37 und die menschliche Archivfreigabe bleiben separat dokumentiert; kein neuer echter GPU-Batch. main bleibt unverändert.
