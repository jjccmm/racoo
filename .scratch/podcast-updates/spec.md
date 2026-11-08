# Lokale Aktualisierung und mehrere Podcasts

Status: resolved
Branch: feature/podcast-updates

Ein lokaler Befehl soll den konfigurierten RSS-Feed aktualisieren, bis zu zehn fehlende verarbeitbare Folgen transkribieren und ihre Wortanalysen ergänzen. Fertige Transkripte bleiben die Datenbasis; Audio wird wie bisher nach der Verarbeitung gelöscht. Pro Batch einmal FP32/GPU-Modellsetup. Die Reihenfolge ist standardmäßig älteste zuerst, optional neueste zuerst; das Limit zählt Versuche und vorhandene Transkripte verbrauchen es nicht. Fehler und nicht verarbeitbare Katalogeinträge werden mit Begründung ausgewiesen. Ein erneuter Lauf verwendet gültige Transkripte und Analysen.

Eine versionierte Podcastkonfiguration enthält ID, Namen, Sprecher, Cover, Feed und Datenordner. Daten bleiben je Podcast getrennt. Der normale Webbuild veröffentlicht alle vollständig gespeicherten Folgen konfigurierter Podcasts, ohne Audio oder Sprachmodelle zu laden. Ein zusätzlicher Podcast erfordert Daten/Konfiguration, keine Änderung am React-Code. Suchindex, Zählungen und Player bleiben je Podcast getrennt. Leere Podcasts erhalten einen ehrlichen Leerzustand. Bestehende Folgenlinks und die gezielten synthetischen Prüfkorpora bleiben nutzbar.

Startseite und Podcastseite zeigen durchsuchbare/veröffentlichte Folgen relativ zu allen bekannten Katalogfolgen sowie den letzten erfolgreichen Feedimport. Diese Angaben sind der veröffentlichte Stand, keine Liveabfrage im Besucherbrowser. Ein nicht gespeicherter Audit ist kein Feedimport. Fehlende Quelldaten (insbesondere Veröffentlichungsdatum bei Folge 37) werden nicht erfunden.

Tests laufen ausschließlich lokal. Der einzige GitHub-Workflow baut und veröffentlicht nach einem Merge/Push auf main oder manuell. Branch und Tickets werden vor Implementierung angelegt; keine Arbeit direkt auf main und kein Merge ohne Nutzerauftrag. Es wird kein automatischer Archiv- oder echter GPU-Batch zur Implementierungsprüfung gestartet.

## Tickets

1. [Podcastkonfiguration](issues/01-podcast-configuration.md)
2. [Begrenzte Verarbeitung](issues/02-pending-processing.md)
3. [Gemeinsame Aktualisierung](issues/03-update-command.md)
4. [Mehrere Podcasts veröffentlichen und anzeigen](issues/04-multi-podcast-site.md)
5. [Unterstützende Windows-Dateisperrenkorrektur](issues/05-windows-atomic-write.md)

## Abnahme

Öffentliche CLI an kleinen lokalen RSS-/Audio-Fixtures mit kontrollierter Modellgrenze prüfen; Wiederaufnahme, Limit, Reihenfolge, Fehler und Analysecache belegen. Zweiten synthetischen Podcast mit getrennten echten Pagefind-Indizes in gebauten Root-/Projektpfad-Webseiten prüfen, einschließlich Status, Leerzustand, Auswahl, Suche und direktem Playerlink. Vollständigen lokalen Check ausführen und echten Fünferbestand wieder bauen. Live-Feed nur als Metadatenabgleich aktualisieren. Grenzen und Bedienung dokumentieren.

Alle erforderlichen Tickets sind auf dem Feature-Branch integriert; [Prüfung](review.md) und [Abschluss](../../docs/pilot/podcast-updates.md) liegen vor. main ist unverändert.
