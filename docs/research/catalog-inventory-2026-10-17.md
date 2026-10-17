# Live-Inventar und historische Ergänzungsquelle

Stand: 17. Oktober 2026. Nachweis für Ticket 01; keine Freigabe zur Archivverarbeitung.

## Publisherfeed

Der öffentliche Importbefehl hat den [publisherverlinkten Acast-Feed](https://feeds.acast.com/public/shows/podcast-ufo) am 16.10.2026 um 21:38:06 UTC vollständig erfasst und am 17.10.2026 um 06:51:54 UTC erneut abgeglichen. Beide Antworten enthielten 537 RSS-Einträge und hatten SHA-256 `9a6fb8b0807438637b28932bbd473afae33bb1b1ef9e45aff03875e24a7d0715`. Der zweite Lauf meldete null neue und 537 aktualisierte Datensätze; die IDs blieben erhalten. Die Zahl ist ein datierter Befund, keine Importbedingung.

Der [Katalog](../../data/podcast-ufo/catalog.json) enthält sämtliche GUIDs und Enclosures. Die vollständigen XML-Antworten liegen unter `data/podcast-ufo/snapshots/`; der [Abgleichsbericht](../../data/podcast-ufo/snapshots/20261017T065154903725Z-9a6fb8b08074.json) enthält keine Importfehler. Neuester Eintrag ist `UFO537 Festival`, ältester `UFO001 Prolog`. `UGO081 Freestyle Karate` und `UFO Experiment (KI-generiert)` sind enthalten. Folge 37 ist nicht im Feed. Die Audioinhalte aller Feed-Folgen wurden nicht heruntergeladen.

## Folge 37: echte Archiv-MP3 nachgewiesen

Ein GET der [historischen Publisheradresse](https://podcast-ufo.fail/wp-content/uploads/ufo37_fertig.mp3) scheiterte am 16.10.2026 am abgelaufenen TLS-Zertifikat. Das belegt weder HTTP 404 noch eine Löschungsursache. Die bisher bekannte [Wayback-Wiedergabeadresse](https://web.archive.org/web/20201113201409/https://podcast-ufo.fail/wp-content/uploads/ufo37_fertig.mp3) führte zu einem älteren Snapshot und lieferte HTTP 200, `text/html`, 9.080 Bytes und HTML-Dateianfang. Das ist kein Audionachweis.

Die [rohe Archivfassung mit `id_`](https://web.archive.org/web/20200616130443id_/https://podcast-ufo.fail/wp-content/uploads/ufo37_fertig.mp3) lieferte dagegen beim begrenzten GET HTTP 206, `audio/mpeg` und 65.536 Bytes mit ID3-Kopf. Der vollständige GET am 16.10.2026 lieferte HTTP 200 und exakt 179.888.758 Bytes, passend zur Inhaltslänge. SHA-256 der vollständigen Datei: `0fe922d9af143454d59881e485c4580cfec96ab17d2c77b95c6323dbde799956`.

FFprobe erkennt MP3 mit 44.100 Hz, Stereo und 5.617,423878 Sekunden Dauer. Die eingebetteten Metadaten nennen das Album `DAS PODCAST UFO` und die Künstler Stefan Titze, Luke Mockridge und Florentin Will. Der historische Dateiname und diese eingebetteten Metadaten stützen gemeinsam die Zuordnung zu Folge 37; eine Titel- oder Nummerngleichheit allein war kein Zusammenführungsgrund. FFmpeg dekodierte die ersten zehn Sekunden ohne Fehler. Vollständiges Anhören oder vollständige Dekodierung wurden nicht durchgeführt.

Die [HTTP-Proben](evidence/episode37-source-probes-2026-10-16.json) und der [Download-/FFprobe-Nachweis](evidence/episode37-audio-verification-2026-10-16.json) sind versioniert. Die MP3 bleibt im ignorierten `.cache/episode37.mp3`. Die [Ergänzungsdatei](../../data/podcast-ufo/supplemental/episode37.json) wurde mit `catalog add-source` unter dem stabilen Schlüssel `historical-ufo037` und der ID `ep-73240a0ba43a16d3b7fababf0820ab8e` übernommen. Das Veröffentlichungsdatum ist nicht primär belegt und bleibt offen; es wurde keine GUID geraten.

Der Katalog umfasst damit 537 Feed-Folgen und eine verfügbare historische Ergänzung. Folge 37 steht auf `verified-supplemental`. Quellenlücken bleiben als eigener Zustand implementiert und mit kontrollierten CLI-Fällen nachgewiesen. Alle neu erfassten Datensätze stehen auf `not-processed`; kein Eintrag gilt durch diese Arbeit als transkribiert.

## Reproduktion und Grenzen

```powershell
uv run --frozen podcast-words catalog import --catalog data/podcast-ufo/catalog.json
uv run --frozen podcast-words catalog add-source --catalog data/podcast-ufo/catalog.json --source data/podcast-ufo/supplemental/episode37.json
uv run --frozen podcast-words catalog show --catalog data/podcast-ufo/catalog.json
```

Abrufzeiten, neue Snapshots und möglicherweise Inhalte ändern sich bei Wiederholung. Die Quellen können künftig unerreichbar werden. Bei einer späteren Transkription wird die tatsächlich verwendete Audiofassung erneut mit vollständiger Prüfsumme und Dauer festgehalten. Pilotauswahl und unabhängige Hörreferenzen gehören zu anderen Tickets.
