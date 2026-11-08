# 05: Kurzzeitige Windows-Lesesperren beim atomaren JSON-Speichern

Status: resolved
Blocked by: None
Category: bug

Bei der lokalen Integration schlagen wiederholte Statistikveröffentlichungen sporadisch mit WinError 5 an os.replace fehl. Ein minimaler realer Win32-Leser ohne Delete-Sharing reproduziert denselben Fehler in 0,35 s. Ohne diesen Leser funktionieren wiederholte Schreibvorgänge, nach dessen Freigabe derselbe Austausch ebenfalls. Der konkrete externe Leser der ursprünglichen sporadischen Fehler ist nicht identifiziert.

- [x] Kurzfristige Windows-Permission-/Sharing-Sperren begrenzt wiederholen; atomaren Austausch und vorherige JSON-Datei erhalten.
- [x] Dauerhafte Sperren bleiben Fehler; temporäre Dateien werden entfernt.
- [x] Echte Windows-Regressionsfälle für kurzfristige und permanente Sperre, bestehende CLI-Auswertungen und Gesamtcheck bestehen.

## Comments

Unterstützende Fehlerkorrektur für den beauftragten verlässlichen lokalen Update-Lauf. Diagnose am realen Dateisystem; kein pauschales Verschlucken von Fehlern und keine Änderung globaler Berechtigungen.

Der echte Mehr-Podcast-Build reproduzierte die gleiche Windows-Sperrklasse beim Ordneraustausch. Der minimale Verzeichnisfall ist ebenfalls rot (WinError 32, 0,42 s). Gemeinsamer begrenzter Ersatzhelfer für JSON-Dateien sowie Publikationsordner; Rückfall auf den alten Ordner bleibt erhalten.

Abgeschlossen und auf dem Feature-Branch integriert in `d45f1e3`. Vollständiger lokaler Check: 89 Python- und 144 Browserfälle; echter Fünferbuild und Pages-Guard bestanden. Siehe [Abschluss](../../../docs/pilot/podcast-updates.md).
