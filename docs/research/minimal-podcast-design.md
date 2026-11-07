# Recherche: minimalistische Podcast-Wortsuche

Stand: 7. November 2026. Primärquellen wurden direkt geprüft. Die Quellen begründen Nutzbarkeit und Barrierefreiheit; die konkrete visuelle Richtung ist unsere gestalterische Ableitung. Es gibt keinen belastbaren Standard, der eine Website als „AI generated“ klassifiziert.

## Belegte Leitlinien

- **Aufgabe und Inhalt bestimmen die Oberfläche.** GDS empfiehlt, vom Bedarf auszugehen, die eigentliche Nutzung einfach zu machen und bekannte Muster konsistent zu verwenden. Hier ist die Aufgabe: Podcast wählen, Wörter ergänzen, Folgen vergleichen, Text prüfen. [Government Design Principles](https://www.gov.uk/guidance/government-design-principles)
- **Ruhige Hierarchie durch Typografie und Abstand.** GOV.UK verwendet abgestimmte Schriftgrößen und Zeilenhöhen sowie eine kleine responsive Abstandsskala. Neue Komponenten sollen zu dieser Skala passen. Für dieses Projekt übernehmen wir das Prinzip; kein GOV.UK-Framework und keine lizenzierte GOV.UK-Schrift. [Type scale](https://design-system.service.gov.uk/styles/type-scale/), [Spacing](https://design-system.service.gov.uk/styles/spacing/)
- **Lesetext begrenzen, Daten dürfen breiter sein.** GOV.UK empfiehlt eine mobile, einspaltige Ausgangsstruktur und höchstens ungefähr 75 Zeichen pro Textzeile. Breitere Inhalte dürfen bei Bedarf einen breiteren Seitenrahmen nutzen. [Layout](https://design-system.service.gov.uk/styles/layout/)
- **Details schrittweise zeigen.** Optionale Zusatzinformationen eignen sich zum Aufklappen. Informationen, die die meisten Nutzenden brauchen, sollen sichtbar bleiben. Daher Suchausschnitt und Zählungen sofort zeigen; vollständigen Fünf-Minuten-Abschnitt auf Wunsch. [Details](https://design-system.service.gov.uk/components/details/)
- **Wortreihen sind Kategorien.** Carbon verwendet für unabhängige Kategorien eine feste qualitative Farbfolge und empfiehlt gezielte Farbflächen auf neutralem Grund. Mehrere dekorative Verläufe erschweren die Unterscheidung. [Carbon: Color palettes](https://www.carbondesignsystem.com/building-blocks/data-visualization/color-palettes)
- **Gestapelte Balken zeigen Beiträge zu einer Summe.** Damit passen sie zum gewünschten Vergleich von Gesamttreffern und den jeweiligen Wortanteilen. Die Gesamtzahl ist leichter zu vergleichen als ein mittleres Segment ohne gemeinsame Grundlinie; exakte Einzelwerte bleiben deshalb in Tooltip, Tabelle und Folgenzeile verfügbar. Der zweite Satz ist eine praktische Ableitung aus der Darstellung. [Carbon: Simple charts](https://www.carbondesignsystem.com/building-blocks/data-visualization/simple-charts)
- **Farbe braucht ergänzende Bedeutung.** Wortnamen und Zahlen ergänzen Farbcodes. Kleine Schrift benötigt mindestens 4,5:1 Kontrast; große Schrift 3:1. Wichtige grafische Konturen brauchen 3:1 zur angrenzenden Farbe. [W3C: Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- **Kompakt darf bedienbar bleiben.** WCAG 2.2 nennt mindestens 24 × 24 CSS-Pixel oder ausreichenden Abstand mit Ausnahmen. Für wichtige Bedienelemente wählen wir großzügigere 40–44 Pixel. Dropdown weiterhin als benannte Combobox, mit Pfeiltasten, Enter und Escape. [Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)

## Konkrete visuelle Richtung — unsere Empfehlung

Eine kleine, redaktionell wirkende Rechercheoberfläche: fast weißer Hintergrund, dunkle Schrift, klare linke Kante, bewusst wenige Schriftgrößen, feine Trennlinien. Das Podcast-Cover liefert die Identität; Suchwörter und Balken liefern die Farbe. Abgerundete Ecken nur maßvoll und dort, wo sie Bedienelemente zusammenhalten. Flächen, Schatten, Symbole und Animationen erfüllen jeweils eine konkrete Funktion. Diese ästhetischen Entscheidungen sind keine Behauptung der Quellen.

### Einstieg

Großes, linksbündiges „Die Podcast Wort Suche“. Darunter genau „Finde mit ein paar Schlüsselwörtern zu der gesuchten Folge“. Danach eine einzige klare Podcast-Auswahl mit Originalcover, „DAS PODCAST UFO“, „Florentin Will & Stefan Titze“ und einem zurückhaltenden Pfeil. Die ganze Auswahl ist ein beschrifteter, tastaturbedienbarer Link. Bei einem Podcast genügt ein Eintrag; zusätzliche leere Karten bringen keinen Nutzen. Keine zusätzlichen Erklärungskacheln vor der Auswahl.

### Suchansicht

Oben eine schmale Zeile mit kleinem Seitennamen als Rücklink. Darunter kompaktes Cover und Podcastname. Direkt anschließend das Suchfeld mit einer kurzen Zeile Hilfetext, Dropdown und ausgewählten Wortchips. Die bestehende Suchfunktion bleibt erhalten. Das Diagramm erhält die größte zusammenhängende Fläche, mit sachlicher Überschrift und Top-10/Alle-Umschalter auf derselben Ebene. Technische Statistiken bleiben nachgeordnet.

### Diagramm und Farbpalette

Carbon-Kategorien in stabiler Reihenfolge für maximal fünf ausgewählte Wörter:

| Wortposition | Farbe |
| --- | --- |
| 1 | Purple 70 — #6929c4 |
| 2 | Cyan 50 — #1192e8 |
| 3 | Teal 70 — #005d5d |
| 4 | Magenta 70 — #9f1853 |
| 5 | Red 50 — #fa4d56 |

Dies sind die ersten fünf Farben der offiziellen hellen kategorialen Palette. Für Wörter dieselbe Zuordnung in Chip, Legende, Balken und Hervorhebung verwenden. Die Palette allein garantiert keine WCAG-Konformität: Cyan und Rot haben auf Weiß nur ungefähr 3,33:1 bzw. 3,35:1 Kontrast und eignen sich so nicht für kleine farbige Schrift. Daher dunkle Schrift auf hellen Farbtönungen, daneben ein satter Farbpunkt oder eine Unterstreichung. Die Tönungen sind unsere eigene Ableitung. Balken können die satten Originalfarben verwenden; weiße Trennlinien helfen an Grenzen zwischen ähnlich hellen Segmenten. Alle Kombinationen im tatsächlichen Layout prüfen.

Für den Plot: neutrale weiße Fläche, wenige leichte horizontale Rasterlinien, klare Nullbasis, keine vertikalen Käfiglinien, kein 3D, keine bedeutungslosen Verläufe. Rundung höchstens an der äußeren Oberkante eines Stapels; Werte und Stapelhöhen bleiben unverändert. Bei vielen Folgen bleibt horizontales Scrollen auf das Diagramm begrenzt. Legende mit echten Wortnamen; alternative Datentabelle erhalten.

### Kompakte Fundstellen

Eine Folge als flache Zeile bzw. Abschnitt: Rang, Folgentitel, Datum und Gesamttreffer. Direkt darunter eine kompakte Zeile „Hund 12 · Geld 1“, farblich zugeordnet und ausgeschrieben. Ein bis zwei aussagekräftige Ausschnitte um Fundwörter sichtbar, mit zusammengeführten überlappenden Kontextfenstern. Zeitspanne und „Abspielen“ bilden eine kleine Aktionszeile. Weitere Fundstellen über einen klar benannten Schalter, etwa „4 weitere Textstellen“. Den vollständigen Originalabschnitt separat über „Ganzen Abschnitt anzeigen“ öffnen.

Wichtig: keine willkürliche CSS-Abschneidung, die das markierte Wort versteckt. Kein mehrfaches Ausspielen desselben Fünf-Minuten-Blocks nur wegen mehrerer Suchwörter. Eine Zeitspanne bleibt die vorhandene grobe Segmentzeit; zusätzliche Ausschnittfenster erfinden keine genaueren Audiozeiten. Die sichtbare Vorschau liefert schon genug Kontext zur Entscheidung. Lesetext ungefähr 65–75 Zeichen breit und ausreichend große Schrift; Kompaktheit entsteht durch reduzierte Wiederholung und Abstände, nicht durch winzige Schrift.

## Verifizierte Podcast-Daten und Cover-Herkunft

Der offizielle [Acast-Auftritt](https://shows.acast.com/podcast-ufo) und dessen am 7. November 2026 direkt gelesener [öffentlicher RSS-Feed](https://feeds.acast.com/public/shows/podcast-ufo) nennen **DAS PODCAST UFO** und die Autoren **Stefan Titze, Florentin Will**. Auf der [aktuellen Squarespace-Präsenz](https://tuba-lilac-fnne.squarespace.com/) steht ebenfalls „Florentin Will & Stefan Titze“. Die bekannte Domain podcast-ufo.fail ließ sich mit dem Recherchebrowser nicht zuverlässig abrufen; daraus leiten wir keinen Ausfall für Besucher ab.

Der RSS-Kanal enthält das Originalcover als image/url und itunes:image:

[Originalcover aus dem offiziellen Feed](https://assets.pippa.io/shows/60ddbc5d7c3018e3a69a1906/1636721103954-ab6342a89da4b719a10ef9033d7bdec1.jpeg)

Acast liefert dasselbe Asset über seine Bildoptimierung:

[Covervariante auf dem offiziellen Acast-Auftritt](https://open-images.acast.com/shows/60ddbc5d7c3018e3a69a1906/1636721103954-ab6342a89da4b719a10ef9033d7bdec1.jpeg?height=250)

Empfehlung: genau dieses Cover verwenden, proportional und ohne Veränderung, die Quelle im Repository dokumentieren. Für die aktuelle lokale Implementierung kann eine kleine gespeicherte Variante die externe Bildanfrage beim Seitenaufruf vermeiden. Die identifizierte Herkunft belegt keine offene Lizenz; es wurde keine freie Lizenz gefunden. Keine generierte Ersatzgrafik als vermeintliches offizielles Logo verwenden.

## Kurzer Abnahmecheck

- Startansicht zeigt Überschrift, Unterzeile und den echten Podcast-Eintrag im ersten Bildschirm auf Desktop; auf Mobil ohne horizontalen Seiten-Scroll.
- Auswahl öffnet Suchansicht, Seitentitel bleibt klein sichtbar, Kontext „DAS PODCAST UFO“ mit Cover ist eindeutig.
- Suchfeld und Diagramm erhalten Vorrang; Suchlogik, exakte Zählungen, Wiedergabe und Direktlinks funktionieren unverändert.
- Wortfarben bleiben über alle Darstellungen konsistent, Textkontrast und Tastaturfokus bleiben sichtbar.
- Fundstellen sind kompakter; mindestens ein hilfreicher Originalausschnitt ist sofort lesbar, weitere und vollständige Abschnitte bleiben erreichbar.
