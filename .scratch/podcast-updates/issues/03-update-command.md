# 03: RSS, Transkription und Analyse mit einem Befehl

Status: resolved
Blocked by: 01, 02

- [x] update --podcast ID --limit 10 verwendet die Konfiguration und führt Import, Pending-Verarbeitung und benötigte Wortanalysen aus.
- [x] Feedfehler stoppen den Lauf vor ASR; Teilergebnisse bleiben gespeichert, Fehler führen zu einem Fehlerstatus.
- [x] Wiederaufnahme repariert fehlende/veraltete Analysen ohne Neutranskription; auch ein Lauf ohne neue Transkripte kann Analysen ergänzen.
- [x] Gesamtbericht nennt Feedabgleich, Auswahl, fertige/ausgelassene/fehlgeschlagene Folgen und Analysen; lokaler Integrationstest.

## Comments

Vom Nutzer beauftragt. Implementierung auf feature/podcast-updates; keine Änderungen auf main.

Abgeschlossen und auf dem Feature-Branch integriert in `d45f1e3`. Vollständiger lokaler Check: 89 Python- und 144 Browserfälle; echter Fünferbuild und Pages-Guard bestanden. Siehe [Abschluss](../../../docs/pilot/podcast-updates.md).
