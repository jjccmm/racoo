# Vollton-Wörter und direkte Suchergebnisse

Stand: 8. November 2026. Die [Spezifikation](../../.scratch/solid-search-design/spec.md) ist umgesetzt.

Die ausgewählten Wörter auf Start- und Podcastseite sind vollflächig in ihrer jeweiligen Diagrammfarbe gefärbt. Das kleine Farbquadrat entfällt. Die Schrift ist fett und entsprechend der relativen Luminanz schwarz oder weiß. Die gemessenen Kontraste der fünf echten Buttonfarben sind in Palettenreihenfolge 7.74:1, 6.30:1, 7.71:1, 7.69:1, 6.26:1; geprüft wurden tatsächlich berechnete Browserfarben. Markierungen im Lesetext bleiben als hellere Tönungen erhalten.

Der Hintergrund ist leicht grünlich getönt (`#f4f6f5`). Ruhige weiße Flächen setzen Podcast-Auswahl und Diagramm ab. Kopfzeilen-, Bereichs- und Folgentrenner sind reduziert; die dünnen Coverränder bleiben erhalten. Beide Autocomplete-Felder tragen eine Lupe und die Form eines Suchfelds. Der native Suchfeldtyp behält Escape zum Schließen des Dropdowns bei unveränderter Eingabe; Tastatur, Touch und Fokusmarkierung funktionieren weiter.

Beim Öffnen einer Podcast-Suchansicht wird einmal „haus“ ausgewählt, sofern es im veröffentlichten Vokabular vorhanden ist. Laden, Abbruch und bewusster Fehlerretry verwenden dieselbe Verarbeitung wie manuelle Auswahlen. Entfernen bleibt bis zum nächsten Aufruf bestehen; eine späte Antwort stellt das Wort nicht wieder her. Die vorgelagerte Podcast-Auswahl und ihre Textdemo laden weiterhin keine Podcast-Daten.

„Diagrammdaten anzeigen“ samt Tabelle ist vollständig entfernt. Exakte Einzelwerte und Summen bleiben im Tooltip und in den Folgenkarten verfügbar. Die tatsächlichen sichtbaren SVG-Achsenbeschriftungen enthalten für assistive Technik vollständige Titel, Einzelwerte und Summe, einschließlich chronologischer Nullfolgen. Es gibt keine versteckte Ersatztabelle.

## Prüfung

- Web-Lint, TypeScript und Produktionsbuilds bestanden; jeweils **68 Chromiumfälle am Root- und GitHub-Pages-Projektpfad** bestanden. Die Tests erfassen die Vorbelegung, manuelles Entfernen und späte Antworten; frühere Tabellenprüfungen verwenden die echten zugänglichen Diagrammbeschriftungen. Unabhängige Suchmodul-Proben starten auf der Auswahlseite ohne automatische Suche.
- Die [echte Fünferprüfung](evidence/solid-search-design.json) lief bei 1440, 390 und 320 Pixel Breite mit Screenshots zur visuellen Kontrolle. Kein horizontaler Seitenüberlauf. Alle fünf Chips haben fette Schrift und mindestens 6,26:1 Kontrast; Farbquadrate entfallen.
- „haus“ ergibt Prolog 9, Freestyle Karate 8, Moll 4 und Festival 2 Vorkommen. „Alle“ zeigt zusätzlich Experiment mit null. Entfernen und anschließende Auswahl von „münze“ erhält die korrekten neuen Ergebnisse.
- Dokumentationslinks und Diff geprüft. Quelldaten, Analysen, Abhängigkeiten und Transkriptionscode sind unverändert. Keine Audio-/Modellläufe und keine Veröffentlichung.

Nach den Fixture-Checks wurde der normale echte Fünferbuild wiederhergestellt. Lokal <http://127.0.0.1:4173/> neu laden. Temporäre Screenshots bleiben im ignorierten Cache.
