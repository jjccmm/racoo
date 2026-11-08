# 04: Konfigurierte Podcasts statisch veröffentlichen und Fortschritt zeigen

Status: resolved
Blocked by: 01, 03

- [x] Normaler Build wählt alle gespeicherten vollständig verarbeiteten Folgen je konfiguriertem Podcast; keine manuelle Pilotliste mehr notwendig.
- [x] Getrennte Such-/Statistik-/Veröffentlichungsdateien je Podcast, gemeinsame App; Root und /racoo/ funktionieren.
- [x] Podcastkarten, Kontext, Zahl durchsuchbar/bekannt und letzter erfolgreicher Feedcheck kommen aus generierten Metadaten; Lade-/Fehler-/Leerzustände.
- [x] Neue Podcasts funktionieren ohne React-Sonderfall; Suchdaten und Playerlinks bleiben getrennt; bestehende direkte Folgenlinks bleiben nutzbar.
- [x] Einziger Pages-Workflow bleibt veröffentlichungsbezogen und lehnt synthetische/leere Gesamtveröffentlichungen ab.
- [x] Lokal Zwei-Podcast-Build, Browserprüfung beider Basispfade, vollständiger Offline-Check und echter Fünferbuild; Betriebsdoku, Plan und Abschlussnachweis.

## Comments

Vom Nutzer beauftragt. Implementierung auf feature/podcast-updates; keine Änderungen auf main.

Abgeschlossen und auf dem Feature-Branch integriert in `d45f1e3`. Vollständiger lokaler Check: 89 Python- und 144 Browserfälle; echter Fünferbuild und Pages-Guard bestanden. Siehe [Abschluss](../../../docs/pilot/podcast-updates.md).
