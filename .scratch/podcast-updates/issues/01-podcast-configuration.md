# 01: Podcastkonfiguration und getrennte Datenordner

Status: resolved
Blocked by: None

- [x] Versionierte Konfiguration für ID, Name, Sprecher, Cover, Feed und Datenordner; eindeutige IDs und sichere relative Pfade validieren.
- [x] Bestehendes Podcast UFO konfigurieren; Eintrag eines weiteren Podcasts benötigt keine neuen Python-Sonderfälle.
- [x] Konfigurationsfehler ändern keine Daten; aussagekräftige Diagnosen und gezielte lokale Tests.

## Comments

Vom Nutzer beauftragt. Implementierung auf feature/podcast-updates; keine Änderungen auf main.

Konfiguration, Pending-Auswahl und Wiederaufnahme an der öffentlichen CLI lokal geprüft; 36 bestehende und neue Grenzfälle erfolgreich, separater Update-/Site-Test anschließend ebenfalls erfolgreich. Integration auf dem Feature-Branch.
