# Minimale Podcast-Auswahl und Suchansicht

Stand: 7. November 2026. Umsetzung auf `codex/minimal-podcast-design`, ausgehend von `27aab13`. Das [Ticket](../../.scratch/minimal-podcast-design/issues/01-minimal-design.md) und die [Spezifikation](../../.scratch/minimal-podcast-design/spec.md) sind abgeschlossen. Die [Recherche](../research/minimal-podcast-design.md) trennt belegte Regeln von unserer gestalterischen Ableitung.

## Ergebnis

Die Startseite zeigt genau „Die Podcast Wort Suche“ und „Finde mit ein paar Schlüsselwörtern zu der gesuchten Folge“. Darunter steht DAS PODCAST UFO mit echtem Cover und Florentin Will / Stefan Titze. Der ganze Eintrag ist ein Link. Das lokal gespeicherte, unveränderte Acast-Cover benötigt keine externe Bildanfrage; seine [Herkunft](../../web/public/images/README.md) ist dokumentiert.

Der Link führt zu `?podcast=podcast-ufo`. In dieser Ansicht stehen der kleine Seitentitel als Rücklink, ein kompakter Podcast-Kopf und direkt das Suchfeld. Keine neue Routing-Abhängigkeit, kein serverseitiger Fallback: Query-Links funktionieren am Root- und GitHub-Pages-Projektpfad. Bestehende geteilte Folgen-/Zeitlinks öffnen die Suchansicht direkt und spielen weiterhin nicht automatisch ab. Die Podcast-Auswahl lädt noch keine Statistik- oder Suchdaten.

Die Gestaltung verwendet weiße Flächen, dunkle Systemschrift, eine kleine Typohierarchie, feine Trennlinien und wenige zurückhaltende Steuerelemente. Die frühere große Werbeüberschrift, farbige Flächen und dekorative Leerzustandsbalken entfallen. Das eigentliche gestapelte Diagramm bleibt groß; absolute Zählungen, Top-10-/Alle-Reihenfolge und Datenansicht bleiben erhalten. Die fünf Carbon-Kategorien werden konsistent zugeordnet. Labels und Tooltipwerte verwenden dunkle Schrift, da zwei Kategorien als kleine Schrift auf Weiß nicht genug Kontrast hätten. Farbige Punkte, Tönungen und unterstrichene Markierungen ergänzen ausgeschriebene Wörter und Zahlen; weiße Trennlinien grenzen Balkensegmente ab. Fokusmarkierungen und reduzierte Bewegung bleiben berücksichtigt. Dies ist keine umfassende WCAG-Zertifizierung.

Je Folge erscheinen zunächst zwei kurze Originalausschnitte um echte Markierungen. Die Vorschau schneidet an Leerraum-/Wortgrenzen, auch bei Tabs und Unicode-Leerraum, und zielt auf ungefähr 280 Zeichen. Weitere Fundstellen und der ganze Originalabschnitt sind getrennt aufklappbar. Die Textgröße bleibt auf Desktop und Mobil 15 Pixel bei normaler Basisschrift; Kompaktheit entsteht hauptsächlich durch weniger Wiederholung und sichtbare Textmenge. Der Abspielknopf zeigt Zeit und Play-Symbol; sein zugänglicher Name nennt Aktion und Suchwörter. Ein gemeinsamer Hinweis je Folge beschreibt für alle Knöpfe grobe Segmentanfänge und Werbung. Vollständige Daten und alle Fundstellen bleiben vorhanden; durch das Aufklappen werden keine feineren Zeitmarken erfunden.

## Prüfung

- Gesamtcheck: **76 Pythonfälle und jeweils 65 Chromiumfälle am Root- und Projektpfad**, zusätzlich Lint, Format, Typen, Daten-/Buildverträge und Dokumentationslinks.
- Neue Browserfälle prüfen den tatsächlichen Einstieg per Tastatur und Touch, Cover, fehlende Corpusabrufe vor der Auswahl, Reload/Rücknavigation und mobile Breite. Ein echter kontrolliert erzeugter Pagefind-Index prüft zwei sichtbare Passagen, weitere Fundstellen und vollständigen Originaltext. Bestehende Such-, Fehler-, Zähl-, Farbzuordnungs- und Wiedergabetests bleiben erhalten. Suchtests navigieren nun ausdrücklich in die Suchansicht.
- Die [echte Fünferprüfung](evidence/minimal-design.json) lief lokal am Root-Pfad bei 1440 × 1000 und 390 × 844 Pixeln. Startseite, ausgewählte Wörter, Balken und kompakte Fundstellen wurden als Screenshots visuell kontrolliert. Keine Browserfehler und kein horizontaler Seitenüberlauf auf Mobil.
- `hund` / `geld` liefert weiterhin Prolog 13, Festival 7, Moll 7, Freestyle Karate 4 und Experiment 1. Bei Prolog sind zuerst 2 von 6 gefundenen Segmenten sichtbar; alle lassen sich öffnen. Die exakten Einzelzählungen und Rangregeln bleiben unverändert.
- Quellepisoden, Analysen, Datenformate und Abhängigkeiten sind unverändert. Keine Audiodownloads, keine Modellläufe und keine Veröffentlichung. Die Prüfung sagt nichts über die spätere menschliche Suchqualitätsabnahme aus.

Nach den Fixture-Tests wurde der echte Fünferbuild wiederhergestellt. [Lokal öffnen](http://127.0.0.1:4173/) und bei bereits geöffneter Seite neu laden. Vorhandener Preview bleibt für den Nutzer erreichbar; Prüfserver wurden beendet. Temporäre Screenshots liegen nur im ignorierten Cache.
