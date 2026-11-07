# Planverfeinerung

Aktueller Nachtrag: Die Nutzerentscheidung für lokale GPU/FP32, temporäres Audio und grobe Segmente ersetzt die damaligen CPU-/Colab- und sekundengenauen Zeitmarkenvorgaben. Maßgeblich sind [PLAN.md](../../PLAN.md) und die [aktuelle Pilotspezifikation](../../.scratch/local-five-episode-pilot/spec.md). Die Interviewantworten unten bleiben als Verlauf erhalten.

Stand: 16. Oktober 2026. Das `grill-with-docs`-Interview ist abgeschlossen. Der Nutzer hat die gemeinsame Planung und den konkreten Workspace-Umfang ausdrücklich bestätigt; alle Entscheidungen stehen in `PLAN.md`.

## Ausgangslage

`PLAN.md` bleibt die maßgebliche Produkt- und Architekturplanung. Seine ausdrücklich festgelegten Entscheidungen gelten als Ausgangspunkt: neue Transkription mit Parakeet, gemeinsame Python-Pipeline für Windows und Colab, statische Daten, React/TypeScript/Vite, Pagefind und GitHub Pages. Bestehende Recherchebefunde sind datierte Beobachtungen, keine Garantie für spätere Feed- oder Softwarestände.

Bei der ersten Prüfung enthielt der Ordner ausschließlich Dokumentation. Git-Repository, Quellcode, Abhängigkeitsdateien, CI und Agentanweisungen wurden im anschließenden Workspace-Schritt eingerichtet.

## Entscheidungsbaum

Die vier Fragen der ersten Runde wurden am 16. Oktober 2026 bestätigt und in `PLAN.md` eingearbeitet.

| Ast | Bestätigte Entscheidung | Ergebnis | Abhängige Entscheidungen |
| --- | --- | --- | --- |
| Umsetzung | Durchgängiger Pilot zuerst, Q1. | Fünf repräsentative Folgen bis zum vollständigen Pages-Build. | Abnahme durch Q5 festgelegt; konkrete Folgen und Referenzpassagen bei der Pilotvorbereitung dokumentieren. |
| Veröffentlichung | Start mit Quellenlücken, Q2. | Alle am dokumentierten Erfassungsstand verfügbaren Folgen verarbeiten; historische Quellenlücken sichtbar ausweisen. | Bestätigte Abschlussregel: bereits bekannte Folgen bei Feed-Auslassung erhalten. |
| Qualität | Geprüfte Stichprobe, Q3. | Maschinelle Transkripte mit Genauigkeitshinweis statt umfassender manueller Korrektur. | Qualitätsgrenzen durch Q5 festgelegt; abweichende Audiofassungen bleiben wie im ursprünglichen Plan ausdrücklich gebunden. |
| Arbeitsumgebung | Lauffähige Starterpakete, Q4. | Python- und Web-Starter, gesperrte Abhängigkeiten, gezielte Prüfungen und CI. | Werkzeugwahl durch Q9 festgelegt; konkreter Umfang in [workspace-setup.md](workspace-setup.md). |

## Runde 2 — bestätigt

- **Q5, Pilotabnahme:** Mindestens neun von zehn manuell geprüften Passagensuchen finden die richtige Folge unter den ersten fünf; geprüfte Sprünge am Anfang, in der Mitte und am Ende jeder Pilotfolge liegen höchstens fünf Sekunden neben der Referenz. Bei Nichtbestehen keine Archivverarbeitung.
- **Q6, Suchlaufzeit:** Erste nutzbare Suche höchstens fünf Sekunden, Folgesuchen höchstens eine Sekunde, bis zu den ersten Ergebnissen höchstens 10 MB übertragen. Ein dokumentiertes mobiles Prüfprofil und eine erneute Messung am Gesamtbestand gehören dazu.
- **Q7, Identität:** Bereits vergebene Episoden-ID erhalten, wenn eine ergänzte Folge später im RSS erscheint; bestätigte weitere GUID als Alias zuordnen. Eine Folgennummer allein belegt keine Identität. Die Abwägung steht in ADR 0001.
- **Q8, Statistik:** Alle alphabetischen Wörter zählen; Grundformen für verschiedene/neue Wörter verwenden; Stoppwörter in Wortvorschlägen zunächst ausblenden und einschaltbar machen; Verlauf standardmäßig je 1.000 Gesamtwörter, absolute Zahlen optional. Der Auswahlschalter verändert keine Gesamtzählungen.
- **Q9, Werkzeuge und Rechenweg:** Python 3.12 über uv, npm für die Web-App, Windows-CPU als unterstützter lokaler Weg und Colab-GPU nach Laufzeitprüfung. Beschleunigung auf der lokalen GTX 1050 Ti ist ein optionales späteres Experiment.

## Abschlussrunde — bestätigt

Der Nutzer hat diese Regeln gemeinsam mit dem überarbeiteten Plan und dem konkreten Einrichtungsumfang bestätigt. Sie sind als Anforderungen in `PLAN.md` übernommen:

1. **Später im Feed fehlende Folge:** Bekannte Folgen und bereits erzeugte Transkripte bleiben erhalten, wenn ein späterer Feed sie nicht mehr enthält. Eine Feed-Auslassung allein löst keine Löschung aus. Audio- und Quellenstatus werden gesondert sichtbar; ausdrücklich beauftragte Entfernungen bleiben möglich.
2. **Erneute Verarbeitung und Übernahme:** Fertige Transkripte bleiben bei Metadatenänderungen oder einer neuen Modellkonfiguration erhalten. Abweichende Herkunft oder Konfiguration wird ausgewiesen; eine erneute Transkription muss ausdrücklich ausgewählt werden. Geänderte Transkript- oder Analyseversionen machen nur ihre abhängigen Analysen und Builds ungültig. Beim Import von Colab-Ergebnissen werden identische Ergebnisse übersprungen und abweichende bestehende Ergebnisse als Konflikt gemeldet, statt sie still zu überschreiben.

Die übrigen Zweige sind durch den bestehenden Plan oder die bestätigten Antworten geschlossen: Suchsemantik und Rangfolge, Zuordnung von Fundstellen, manuelle Starts und Wiederaufnahme, getrennte Analyseversionen, gleicher Datenstand aller Build-Artefakte, teilbare Links, Quellengrenzen, freies statisches Hosting und weitere Podcasts als spätere Erweiterung. Die konkrete Auswahl von Pilotfolgen, Referenzpassagen und Messprofil sowie das Nachweisen der Laufzeitverträge sind Umsetzungsaufgaben, keine stillschweigend offenen Produktentscheidungen.

Die Abschlussbestätigung umfasst diese zwei Regeln, den überarbeiteten `PLAN.md` und den [konkreten Einrichtungsumfang](workspace-setup.md). Der Entscheidungsbaum für die Plan- und Workspace-Aufgabe ist geschlossen. Vollständiger Produktbau und Archivtranskription sind nachgelagerte Arbeiten; der nächste konkrete Arbeitsstand steht in [TASKS.md](../../TASKS.md).

## Dokumentation während des Interviews

Geklärte Fachbegriffe stehen in `GLOSSARY.md`. Bestätigte Anforderungen werden unmittelbar in `PLAN.md` eingearbeitet; offene Vorschläge bleiben hier erkennbar offen. Ein ADR wird nur für eine schwer umkehrbare und ohne Kontext überraschende Abwägung angelegt.

Der gemeinsame Interviewabschluss ist erfolgt. Die folgenden Produktetappen prüfen einen beschlossenen technischen Ansatz zuerst durch einen kleinen Funktionsnachweis, bevor damit der gesamte Bestand verarbeitet wird.

## Ergänzung vom 25. Oktober 2026: veröffentlichte Häufigkeitsdaten

Der neue ausdrückliche Auftrag ersetzt den Stoppwortschalter aus Q8: Stoppwörter und eine gepflegte Zusatzliste werden aus Wortauswahl und veröffentlichten Häufigkeitsdateien entfernt. Vollständige Analysen, Transkripte, Suche sowie Gesamt-/Verschiedene-/Neue-Wörter-Werte bleiben erhalten; je 1.000 Gesamtwörter bezieht sich weiter auf alle alphabetischen Tokens. Ein Website-Hinweis erklärt das. Die [Umsetzungsspezifikation](../../.scratch/compact-filtered-statistics/spec.md) hält den kompakten Folgenindex-Vertrag und die beiden Tickets fest.

Alphabetisch aufgeteilte Wortlisten und nach globaler Worthäufigkeit sortierte Zähldateien bleiben Optionen für später nachgewiesene Leistungsprobleme.

## Ergänzung vom 7. November 2026: ein Wort-Explorer

Der Nutzer ersetzt die getrennten Such-/Statistikfelder und den normierten Vergleich: ein Dropdown-Suchfeld, entfernbare Wortchips, ein großes gestapeltes Balkendiagramm mit ausschließlich absoluten Zahlen sowie „Top 10“ nach Gesamttreffern und „Alle“ chronologisch. Darunter stehen die zehn besten Folgen mit exakten Einzelzahlen und farbigen Originalfundstellen. Wortformen/Präfixtreffer der Textsuche bleiben von exakten Grundformzahlen unterscheidbar. Laufzeiten und Wortschatzinformationen werden nachgeordnet einklappbar. Das [vollständige Ticket](../../.scratch/word-explorer/issues/01-word-explorer.md) und die [Spezifikation](../../.scratch/word-explorer/spec.md) halten Bedienung, Grenzen und Prüfungen fest.
