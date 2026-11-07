# Wort-Explorer mit zentralem Balkendiagramm

Stand: 7. November 2026. Das [Ticket](../../.scratch/word-explorer/issues/01-word-explorer.md) ist auf `codex/word-explorer` abgeschlossen. Die Oberfläche ersetzt die getrennte Freitextsuche und normierte Vergleichsansicht. Die gespeicherten fünf Transkripte und Analysen wurden nicht verändert; keine Audio-/Modellaufrufe, neuen Abhängigkeiten oder öffentliche Veröffentlichung.

## Bedienung

- Ein Suchfeld lädt passende Grundformen in ein Dropdown mit höchstens zehn Vorschlägen. Exakte Eingabe vor Präfix und übrigen Teilzeichenfolgentreffern; Tastatur, Escape, Außenklick und Touch werden unterstützt. Bis zu fünf unterschiedliche Wörter sind auswählbar.
- Ausgewählte Wörter stehen direkt darunter als farbige Chips; Anklicken entfernt sie. Die Farbe bleibt bis zur Entfernung für Diagramm, Zahlen und Textmarkierungen gleich.
- Das große gestapelte Balkendiagramm zeigt ausschließlich absolute Vorkommen. Die X-Achse zeigt Folgen, die Y-Achse ihre Wortanzahl. „Top 10“ sortiert positive Summen absteigend; bei Gleichstand Datum absteigend und stabile ID. „Alle“ enthält sämtliche Folgen einschließlich Nullen chronologisch. Bei vielen Folgen kann innerhalb des Diagramms seitlich gescrollt werden. Die aufklappbare Datentabelle zeigt dieselben Werte und Reihenfolgen.
- Darunter stehen unabhängig von der Diagrammansicht die zehn besten Folgen mit Summe, jedem ausgewählten Einzelwert einschließlich null und passenden Originalpassagen. Lange Segmente haben einen Ausschnitt und vollständig aufklappbaren Text. Die Wortfarben gelten auch für die Markierungen; gemeinsame Treffer können mehrere Farben zeigen.
- Gemeinsamer Player, Episodenlinks, teilbare Folge-/Zeitlinks und der Werbe-/Segmenthinweis bleiben erhalten. Der Player liegt nach einer Auswahl im sichtbaren Bereich. Geteilte Links starten ohne Autoplay. Ladefehler lassen sich bewusst wiederholen; veraltete Antworten überschreiben keine neue Auswahl.
- Laufzeiten und vollständige Wortschatzwerte sind unterhalb einklappbar. Die Stoppwort-/Zusatzlistenregel bleibt in Kraft und wird bei der Wortauswahl erklärt. Die fünf Folgen sind oben als Pilot gekennzeichnet.

Absolute Summen können längere Folgen bevorzugen und müssen nicht dieselbe Reihenfolge wie eine Abdeckungssuche haben. Das ist die ausdrücklich gewünschte Rangfolge, keine normalisierte Häufigkeit.

## Zahlen und Textmarkierungen

Die Zahlen stammen weiter aus den vollständigen gespeicherten Grundformanalysen und kompakten Statistikpaketen. Erst die zehn nach Gesamttreffern besten Folgen werden für die Textanzeige abgefragt; die Einschränkung erfolgt vor dem Laden der Suchfragmente und Transkripte. Der Start lädt ohne Direktlink keine Transkripte, Suchfragmente oder Zählpakete.

Der vorhandene Pagefind-Index liefert tatsächliche Wortform-/Präfixpositionen. Sie werden mit einer geprüften Zuordnung auf Zeichenbereiche im unveränderten Originaltext abgebildet. Damit lässt sich etwa „Münzen“ zur Auswahl „Münze“ markieren; ganze zusammengesetzte Fundwörter werden nicht durch erfundene Teilwortpositionen ersetzt. Bei einer nicht passenden Zuordnung wird ein Textfehler angezeigt. Exakte Zählung und lexikalische Treffer können abweichen; eine positive Zahl bleibt auch dann erhalten, wenn der Textindex keine passende Passage findet. Dies erklärt ein sichtbarer Hinweis. Es gibt weiterhin keine Wortzeitpunkte oder neue Annotationen im gespeicherten Episode-JSON. [Technische Herleitung](../research/word-explorer-highlights.md).

Die frühere interne Such-/Sitzungsschnittstelle bleibt als statisches JS-Modul verfügbar, um die bestehenden nativen Abdeckungs-, Nachlade- und Fehlerverträge unabhängig von der neuen Oberfläche prüfen zu können. Dafür wurde kein zweites Suchformular und kein Backend hinzugefügt.

## Echte Fünferprüfung

Die Browserprüfung lief am [Root-Pfad](evidence/word-explorer-root.json) und am [GitHub-Pages-Projektpfad](evidence/word-explorer-project.json). Beide verwenden genau die fünf echten Pilotfolgen. Die unabhängig aus den gespeicherten Analysen geprüfte Auswahl `hund` und `geld` ergibt:

| Rang | Folge | hund | geld | Summe |
| --- | --- | ---: | ---: | ---: |
| 1 | UFO001 Prolog | 12 | 1 | 13 |
| 2 | UFO537 Festival | 4 | 3 | 7 |
| 3 | UFO300 Moll | 2 | 5 | 7 |
| 4 | UGO081 Freestyle Karate | 0 | 4 | 4 |
| 5 | UFO Experiment (KI-generiert) | 0 | 1 | 1 |

„Alle“ erhält die chronologische Reihenfolge Prolog, Freestyle Karate, Moll, Experiment, Festival; nach Entfernen von `geld` bleiben die Nullwerte für Freestyle Karate und Experiment im Diagramm verfügbar. Das echte Wort `total` wurde zusätzlich ausgewählt, um eine Verwechslung eines Suchworts mit der berechneten Summe auszuschließen. `münze` führt zur Experiment-Folge mit zwei gezählten Vorkommen und tatsächlich vorhandenen Originalmarkierungen, darunter der zusätzliche lexikalische Treffer `Euro-Münze`.

Geprüft wurden ein einzelnes Eingabefeld, Tastaturauswahl, Touchauswahl, Entfernen über Wortchips, exakte Diagramm-/Kartenwerte, keine normierten Bedienelemente, keine vorzeitigen Textabrufe und 390-Pixel-Breite ohne Seitenüberlauf. Desktop-/Handy-Screenshots wurden visuell kontrolliert; temporäre Bilder bleiben im ignorierten Cache. Das ist technische Prüfung, keine unabhängige menschliche Suchabnahme. Online-Audio wurde bei diesen Browserprüfungen nicht geladen.

## Abschluss und Start

Der vollständige Offline-Check bestand mit **76 Pythonfällen und jeweils 62 Chromiumfällen an Root und Projektpfad**, einschließlich Lint, Format, Typen, Datenverträgen und Dokumentationslinks. Die [getrennten Reviews](../../.scratch/word-explorer/review.md) fanden einen Wiedergabe-Race und eine kleine Formatierungsduplikation; beide sind behoben und geprüft.

Nach den Fixture-Prüfungen wurde der echte Standardbuild wiederhergestellt. Lokal unter <http://127.0.0.1:4173/> neu laden. Zum selbstständigen Start am Repositoryroot:

```powershell
npm.cmd --prefix web run build
npm.cmd --prefix web run preview -- --port 4173 --strictPort
```

Der Implementierungsworktree und die zusätzlichen Prüfserver wurden entfernt/beendet; der vorhandene Pilot-Preview bleibt für den Nutzer erreichbar. Archivverarbeitung, Veröffentlichung und die zurückgestellten Dateiaufteilungen bleiben außerhalb dieses Auftrags.
