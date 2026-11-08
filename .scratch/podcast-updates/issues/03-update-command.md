# 03: RSS, Transkription und Analyse mit einem Befehl

Status: claimed
Blocked by: 01, 02

- [ ] update --podcast ID --limit 10 verwendet die Konfiguration und führt Import, Pending-Verarbeitung und benötigte Wortanalysen aus.
- [ ] Feedfehler stoppen den Lauf vor ASR; Teilergebnisse bleiben gespeichert, Fehler führen zu einem Fehlerstatus.
- [ ] Wiederaufnahme repariert fehlende/veraltete Analysen ohne Neutranskription; auch ein Lauf ohne neue Transkripte kann Analysen ergänzen.
- [ ] Gesamtbericht nennt Feedabgleich, Auswahl, fertige/ausgelassene/fehlgeschlagene Folgen und Analysen; lokaler Integrationstest.

## Comments

Vom Nutzer beauftragt. Implementierung auf feature/podcast-updates; keine Änderungen auf main.
