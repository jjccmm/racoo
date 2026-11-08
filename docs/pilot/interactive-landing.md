# Interaktiver Racoo-Einstieg

Stand: 8. November 2026. Die [Spezifikation](../../.scratch/interactive-landing/spec.md) ist umgesetzt.

Das Original-Logo steht auf der Startseite groß und mittig ohne Trennlinie. Anstelle des statischen Titels erscheinen die vier entfernbaren Chips Die / Podcast / Wort / Suche. Passende Formen im kurzen Erklärungstext tragen dieselbe Farbe. Ein kleines Autocomplete ergänzt Wörter aus diesem Text, zum Beispiel Folge: Danach sind Folge und Folgen markiert. Wörter lassen sich per Klick entfernen; ihre Farben bleiben bis dahin stabil. Die eigentliche Podcast-Auswahl steht direkt darunter.

Der Einstieg ist ausdrücklich eine Demo am festen Beispieltext. Seine fünf häufig benötigten Wortfamilien sind lokal zugeordnet; übrige Textwörter können einzeln gewählt werden. Es lädt dafür keine Podcast-Statistiken oder Suchindizes. Die tatsächliche Folgenanalyse, Stoppwortregeln und Suche bleiben unverändert. Beide Ansichten verwenden dieselbe vorhandene kategoriale Farbpalette. Die Demo bietet Tastatur-/Touch-Auswahl, Escape, leere Vorschläge und einen verständlichen Hinweis bei fünf ausgewählten Wörtern. Eine semantische Seitenüberschrift bleibt für assistive Technik verfügbar; sichtbar sind die Chips.

## Prüfung

- Web-Lint und TypeScript-/Produktionsbuilds bestanden.
- Je **66 Chromiumfälle am Root- und GitHub-Pages-Projektpfad** bestanden. Der neue Bedienfall prüft Familie Folge/Folgen, Wort/Wörter/Schlüsselwörter, identische Chip-/Textfarben, Entfernen, Unicode-Normalisierung, Tastatur und Touch, die Auswahlgrenze, fehlende Wörter und keine Corpusabrufe.
- Die [echte Fünferprüfung](evidence/interactive-landing.json) kontrolliert 1440, 390 und 320 Pixel Breite: mittiges größeres Logo ohne Linie, passende Originaltextmarkierungen, kein horizontaler Seitenüberlauf und Wechsel zur tatsächlichen Suche mit unverändertem Hund-Zählwert für Prolog. Screenshots von Ausgangszustand und zusätzlicher Folge-Auswahl wurden visuell geprüft und bleiben im ignorierten Cache.
- Dokumentationslinks und Git-Diff geprüft. Keine Daten-, Modell- oder Abhängigkeitsänderungen und keine Veröffentlichung.

Der normale lokale Build enthält wieder die fünf echten Folgen. Unter <http://127.0.0.1:4173/> neu laden; im kleinen Feld etwa Folge eingeben und Enter drücken. Die laufende lokale Vorschau bleibt für den Nutzer erreichbar.
