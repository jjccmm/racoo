# Lokale Integration und Dokumentation

Status: resolved
Blocked by: 01, 02, 03

## Acceptance criteria

- [x] Alle relevanten Python-/Browserchecks unter Root und /racoo/ lokal bestanden; mehrere/leer konfigurierte Podcasts.
- [x] Echte 106 Folgen ohne NLP neu bauen und bekannte Suchfälle/Einzelwerte/Markierungen sowie Mobile/Zoom prüfen.
- [x] Kalte/warme Zeiten, Bytes und dokumentiertes Prüfprofil erfassen; kein unbewiesenes 600er-Leistungsversprechen.
- [x] Aktive Doku/Glossar/AGENTS/Verträge/Betriebsbefehle aktualisieren; historische Nachweise erhalten.
- [x] Tickets mit konkreter Evidenz abschließen und vollständige geprüfte Änderungen auf Featurebranch committen.

## Comments

- 2026-11-10: Aus dem bestätigten Pagefind-/Minimap-Plan erstellt.

- Abgeschlossen in Integrationscommit `309441f` auf `feature/pagefind-minimap`. Vollständiger lokaler Check: 74 Python-Fälle, 49 Browserfälle je Basispfad und vier Mehr-Podcast-Fälle je Basispfad (106 ausgeführt). Echte 106 Folgen an beiden Pfaden: 10/10 Referenzsuchen auf Platz 1, 18-stellige UFO070-Minimap mit Touch/HiDPI, kalte Suche 4,0–4,1 s und Wiederholung 0,43–0,46 s im dokumentierten Mobilprofil. [Abnahme](../../../docs/pilot/pagefind-minimap.md).
