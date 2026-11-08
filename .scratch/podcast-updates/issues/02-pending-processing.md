# 02: Fehlende Folgen mit Limit verarbeiten

Status: ready-for-agent
Blocked by: None

- [ ] process unterstützt neben expliziten IDs einen Pending-Modus mit positivem Limit (Standard zehn) und oldest/newest-Reihenfolge.
- [ ] Gültige fertige Transkripte verbrauchen kein Limit und werden nicht neu geladen; veraltete Katalogstatus mit vorhandenen gültigen Transkripten abgleichen.
- [ ] Unverarbeitbare Quellen/fehlende Daten ausdrücklich melden; Fehler bleiben wiederaufnehmbar, Limit zählt höchstens ausgewählte Versuche.
- [ ] Ein Modell pro Batch, vorhandene Zeitprotokolle und Audio-Cleanup erhalten; lokaler CLI-Nachweis ohne echte Downloads/GPU.

## Comments

Vom Nutzer beauftragt. Implementierung auf feature/podcast-updates; keine Änderungen auf main.
