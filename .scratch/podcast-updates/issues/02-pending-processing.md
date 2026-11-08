# 02: Fehlende Folgen mit Limit verarbeiten

Status: resolved
Blocked by: None

- [x] process unterstützt neben expliziten IDs einen Pending-Modus mit positivem Limit (Standard zehn) und oldest/newest-Reihenfolge.
- [x] Gültige fertige Transkripte verbrauchen kein Limit und werden nicht neu geladen; veraltete Katalogstatus mit vorhandenen gültigen Transkripten abgleichen.
- [x] Unverarbeitbare Quellen/fehlende Daten ausdrücklich melden; Fehler bleiben wiederaufnehmbar, Limit zählt höchstens ausgewählte Versuche.
- [x] Ein Modell pro Batch, vorhandene Zeitprotokolle und Audio-Cleanup erhalten; lokaler CLI-Nachweis ohne echte Downloads/GPU.

## Comments

Vom Nutzer beauftragt. Implementierung auf feature/podcast-updates; keine Änderungen auf main.

Konfiguration, Pending-Auswahl und Wiederaufnahme an der öffentlichen CLI lokal geprüft; 36 bestehende und neue Grenzfälle erfolgreich, separater Update-/Site-Test anschließend ebenfalls erfolgreich. Integration auf dem Feature-Branch.

Abgeschlossen und auf dem Feature-Branch integriert in `d45f1e3`. Vollständiger lokaler Check: 89 Python- und 144 Browserfälle; echter Fünferbuild und Pages-Guard bestanden. Siehe [Abschluss](../../../docs/pilot/podcast-updates.md).
