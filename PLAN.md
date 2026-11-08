# Racoo – Projektplan

Stand: 8. November 2026; lokaler Fünf-Folgen-Pilot mit Podcast-Auswahl, zentralem Wortvergleich und groben Segmenten. Die aktuelle Gestaltung folgt der [minimalen Podcast-Auswahl und Suchansicht](.scratch/minimal-podcast-design/spec.md), die Funktion dem [Wort-Explorer](.scratch/word-explorer/spec.md), aufbauend auf der [kompakten und gefilterten Wortstatistik](.scratch/compact-filtered-statistics/spec.md); der übrige Umfang steht in der [Pilotspezifikation](.scratch/local-five-episode-pilot/spec.md).

Der Plan wurde im dokumentierten Interview gemeinsam bestätigt. Die [Planverfeinerung](docs/planning/refinement.md) hält die Entscheidungen fest; [TASKS.md](TASKS.md) enthält die nachweisorientierte Umsetzungsreihenfolge. Der [bestätigte Einrichtungsumfang](docs/planning/workspace-setup.md) ist die Grundlage der Workspace-Einrichtung.

## 1. Ziel und festgelegte Entscheidungen

**Projektname: Racoo.** Repository: [jjccmm/racoo](https://github.com/jjccmm/racoo). Die [Pages-Einrichtung](docs/github-pages.md) beschreibt den separat freischaltbaren Veröffentlichungsworkflow. Tests laufen vorab lokal; GitHub Actions baut und validiert ausschließlich die echte Veröffentlichung. Das vom Nutzer bereitgestellte Logo steht auf Start- und Podcastseite. Auf der Startseite steht das Logo groß und zentriert ohne Trennlinie. „Die“, „Podcast“, „Wort“ und „Suche“ erscheinen als ausgewählte Wörter, die passende Formen im Erklärungstext markieren. Ein kleines Suchfeld ergänzt weitere Wörter aus diesem Beispieltext; die eigentliche Folgensuche beginnt nach der Podcast-Auswahl. Die [Umsetzung](.scratch/interactive-landing/spec.md) hält die lokale Demo-Abgrenzung fest. Podcast-Cover haben einen dünnen Rand.

Eine einfach zu betreibende Webseite, die Podcast-Folgen anhand erinnerter Stichwörter findet und Wortstatistiken zeigt. Ausgangspunkt ist DAS PODCAST UFO mit etwa zehn Besuchern pro Tag. Weitere Podcasts sollen später über dieselbe Pipeline und Datenformate hinzukommen können.

- **Modell:** Parakeet-TDT-0.6B-v3, zunächst über `onnx-asr`. Modellrevision, ONNX-Export und Laufzeitabhängigkeiten festhalten. Kein weiterer Wettbewerb zur Modellauswahl.
- **Neuverarbeitung:** Alle verfügbaren Folgen vollständig neu transkribieren. Alte Transkripte, Wortzählungen, IDs und Datenbankschemata werden nicht übernommen.
- **Verarbeitung:** Ein lokales Python-Paket mit Parakeet FP32 auf der GPU. Etwa 25× Echtzeit als Planungswert; gemessene Werte und Grenzen stehen in der [ASR-Untersuchung](docs/research/asr-investigation.md).
- **Unterstützter Laufweg:** Windows mit GTX 1050 Ti, ONNX Runtime GPU 1.20.1 als CUDA-11-Build, CUDA 11.8/cuDNN 8.6 und Python 3.12. Modellqualität der vollständigen UFO537-Folge vom Nutzer als ausreichend bestätigt.
- **Speicherung:** Versionierte JSON-Dateien je Folge, vorberechnete Analysen und statische Suchdateien. Eine laufende Datenbank oder eigene HTTP-API ist nicht erforderlich.
- **Webseite:** React, TypeScript, Vite und Recharts; Suche mit Pagefind und ergänzender Logik im Browser. Veröffentlichung über GitHub Actions auf GitHub Pages.
- **Betrieb:** Aktualisierung manuell lokal starten; Veröffentlichung nach einem Push über GitHub Pages. Keine laufende Datenbank, eigene API oder kostenpflichtige Recheninfrastruktur erforderlich.
- **Reihenfolge:** Zuerst fünf repräsentative Folgen durch den vollständigen Ablauf bis zu Suche, Statistik, Player und GitHub-Pages-Build führen. Erst nach bestandener Pilotabnahme den gesamten verfügbaren Bestand transkribieren.
- **Transkriptqualität:** Maschinell erzeugte Transkripte mit einem verständlichen Genauigkeitshinweis veröffentlichen. Vor der Archivverarbeitung eine Stichprobe auf ihre Eignung zum Wiederfinden erinnerter Passagen prüfen. Eine umfassende manuelle Transkriptkorrektur ist keine Voraussetzung für V3.
- **Arbeitsumgebung:** Nach Abschluss der Planverfeinerung lauffähige Python- und React/TypeScript-Starterpakete mit gesperrten Abhängigkeiten, gezielten lokalen Prüfungen und automatischer Veröffentlichung einrichten. Modelldownloads und die vollständige Transkription sind nachgelagerte Aufgaben.

Die [lokale Aktualisierung und mehrere Podcasts](.scratch/podcast-updates/spec.md) ergänzen einen begrenzten `update`-Befehl, eine versionierte Podcastkonfiguration und automatisch erzeugte Veröffentlichungen je Podcast. Die [Betriebsanleitung](docs/updates.md) beschreibt Wiederaufnahme, Konfiguration und Fortschrittsanzeige. Der normale Build nimmt alle fertig gespeicherten Folgen auf; die historische Fünfer-Auswahlliste bleibt als Pilotnachweis erhalten. Ein Update verarbeitet standardmäßig höchstens zehn fehlende verarbeitbare Folgen, älteste zuerst; Archivverarbeitung startet weiterhin nur durch einen bewusst ausgeführten lokalen Befehl.

## 2. Datenfluss und Quellen

```text
Offizieller RSS-Feed + geprüfte zusätzliche Audioquellen
  → Episodenkatalog mit stabilen IDs und direkten Audio-URLs
  → Audio herunterladen und aufbereiten
  → Sprachabschnitte erkennen und mit Parakeet transkribieren
  → JSON-Datei je Folge mit Text, Zeitmarken und Herkunft
       ├─ spaCy → Grundformen und Wortstatistiken
       └─ Pagefind → statischer Suchindex
  → Webseite, Suchindex und öffentliche Daten auf GitHub Pages
```

Die aufwendige Verarbeitung geschieht beim Aktualisieren. Während einer Besuchersuche läuft keine Transkription; der Browser lädt statische Dateien. Die MP3 wird nach der Verarbeitung gelöscht. Das Transkript bleibt die Datenbasis. Der Player verwendet die öffentliche Audioquelle ohne späteren Abgleich; ein Hinweis am Sprungknopf erklärt Segmentanfang und mögliche Werbeverschiebungen.

### RSS-Quelle und vollständiger Bestand

Standardfeed bleibt `https://feeds.acast.com/public/shows/podcast-ufo`. Die offizielle Acast-Seite verlinkt genau diese Adresse. Die UUID-Variante liefert dieselben Einträge; der alte RSS-Host leitet dorthin weiter. Siehe [Quellenprüfung](docs/research/v3-feed-and-search.md).

- Alle Einträge des Feeds erfassen, einschließlich Sonderfolgen und Titel ohne `UFO`-Präfix. `UGO081 Freestyle Karate` darf nicht verloren gehen.
- Eine stabile ID aus Podcast-ID und RSS-GUID ableiten. Titel, Folgennummer und Audio-URL sind veränderliche Metadaten. Zusätzlich erkannte Folgennummern für die Anzeige speichern.
- Eine einmal vergebene Episoden-ID erhalten. Taucht eine ergänzte Folge später im Feed auf oder ändert sich ihre GUID, nach geprüfter Identität die zusätzliche GUID als Alias derselben Folge erfassen. Bei Ergänzungen ohne RSS-GUID dient ein ausdrücklich vergebener stabiler Quellenschlüssel zur ersten ID-Bildung; die Audio-URL ist kein Identitätsschlüssel. Eine Nummernübereinstimmung allein erlaubt keine Zusammenführung. Die Entscheidung schützt bestehende Links; siehe [ADR 0001](docs/adr/0001-stabile-folgenidentitaet.md).
- Zum Start einen datierten Katalog-Snapshot anlegen. Am 16.10.2026 lieferte der Feed 537 Einträge bis `UFO537 Festival`; spätere Läufe dürfen weitere Einträge enthalten.
- **Folge 37 fehlt im Feed.** Eine kleine Quellenliste für einzeln geprüfte Ergänzungen vorsehen. Für Folge 37 zunächst eine tatsächlich abrufbare Audioquelle prüfen; der historische Archivlink ist bisher nur als HTML-Wiedergabeseite bestätigt. Eine Nummernlücke allein rechtfertigt keinen geratenen Audio-Link.
- Ziel bleibt das vollständige verfügbare Archiv. Nicht auffindbare Folgen ausdrücklich als offene Quellenlücke dokumentieren; sie dürfen weder als transkribiert gelten noch stillschweigend verschwinden. Vor einer Aussage „vollständiges Archiv“ müssen diese Lücken geklärt sein.
- Der öffentliche Start darf mit dokumentierten Quellenlücken erfolgen, sobald alle zum angegebenen Erfassungsstand verfügbaren Folgen erfolgreich verarbeitet sind und die übrige Abnahme bestanden ist. Eine offene historische Quellenlücke wie Folge 37 blockiert diesen Start nicht; ein Verarbeitungsfehler bei einer verfügbaren Folge bleibt davon zu unterscheiden.
- Bekannte Folgen und bereits erzeugte Transkripte bleiben erhalten, wenn ein späterer Feed sie nicht mehr enthält. Eine Feed-Auslassung allein löst keine Löschung aus. Quellen- und Audioverfügbarkeit gesondert ausweisen; ausdrücklich beauftragte Entfernungen bleiben möglich.

### Audio und Transkription

MP3 beziehungsweise das im Feed verlinkte Audio einmal pro Verarbeitung herunterladen, temporär decodieren und für das Modell aufbereiten. Temporäre Audiodateien nach Erfolg und Fehler entfernen. Lange Folgen mit einer Sprachaktivitätserkennung in geeignete Abschnitte zerlegen. Native Zeitinformationen auf die ursprüngliche Folge beziehen; Pausen oder abschnittsweise Verarbeitung dürfen keinen fortlaufenden Zeitversatz verursachen.

Der Audioadapter decodiert Feed-Audio ausdrücklich in das vom Modell erwartete Format. Erkannte Sprachabschnitte in ihrer Reihenfolge zu Segmenten mit höchstens fünf Minuten Zeitspanne zusammenfassen. Originaltexte durch Leerraum verbinden; keine Wort- oder Tokenzeitpunkte anfordern oder speichern. VAD-Grenzen beziehen sich auf die ursprüngliche Folge.

Ein Modell pro Verarbeitungslauf laden. Downloads erhalten Timeouts und begrenzte Wiederholungen. Pro Folge erst nach erfolgreichem Speichern und Validieren „fertig“ setzen; Fehler bleiben erneut ausführbar. Fertige Folgen bei einem Neustart überspringen. Eine ausdrücklich ausgewählte erneute Transkription bleibt möglich.

Fertige Transkripte bei Metadatenänderungen oder neuer Modellkonfiguration erhalten. Abweichende Herkunft oder Konfiguration ausweisen; eine erneute Transkription muss ausdrücklich ausgewählt werden. Änderungen an Transkript- oder Analyseversionen machen nur ihre abhängigen Analysen und Builds ungültig.

Lokal wird direkt in das Datenverzeichnis geschrieben. Fertige Episodendaten werden nach jeder Folge validiert gespeichert und bei erneutem Start übersprungen. Episode und Laufbericht enthalten Download-, Transkriptions- und Gesamtzeit. Die Konsole nennt außerdem Audio-/Gesamtdauer sowie Download- und Transkriptionssekunden je Audiominute; gemeinsames Modellsetup wird separat ausgewiesen. Start, Wiederaufnahme und ausdrücklich gewählte Neutranskription sind in der Betriebsanleitung beschrieben.

## 3. Datenformate und Wortanalyse

Das Episoden-JSON ist die maßgebliche Quelle für Originaltext und Zeitmarken. Es enthält mindestens:

- Schemaversion, Podcast-ID, stabile Episoden-ID und RSS-GUID beziehungsweise die Herkunft einer ergänzten Quelle;
- Titel, Veröffentlichungsdatum, optionale Folgennummer, Episodenwebseite und Audio-URL;
- Modell-/Exportrevision, Verarbeitungszeitpunkt und Audiodauer;
- Download-, Transkriptions- und Gesamtzeit in Sekunden;
- chronologische grobe Segmente mit ID, Originaltext, Start und Ende in Sekunden. Keine Audio-Prüfsumme oder Wort-/Tokenzeitmarken.

Zeitmarken beim Speichern auf sinnvolle Reihenfolge und Grenzen prüfen. Segmente erhalten vor der Indexierung stabile, innerhalb der Folge eindeutige IDs.

Für die Statistik einheitlich spaCy mit `de_core_news_lg` und festgehaltener Modellversion verwenden. Alle alphabetischen Tokens einschließlich Stoppwörtern als Gesamtwörter zählen. Verschiedene und erstmals auftretende Wörter anhand kleingeschriebener Lemmata bestimmen; auch hier gehören Stoppwörter zum Bestand. Stoppwörter in der vollständigen Analyse kennzeichnen. Für die veröffentlichten Häufigkeitsvergleiche Stoppwörter und eine manuell gepflegte Zusatzliste ausschließen; diese Filter ändern die vollständigen Analysewerte nicht. Die Oberfläche vergleicht ausschließlich absolute Vorkommen. Die Definitionen auf der Webseite erklären. Originaltexte und Spracherkennung bleiben von dieser Aufbereitung unabhängig.

Die Analyse pro Folge zwischenspeichern und ihre Version festhalten. Eine geänderte Lemmatisierung berechnet nur die Analysen neu. Für die Veröffentlichung daraus erzeugen:

- Katalog, Vokabular und Gesamt-/Episodenstatistiken;
- sparsame Zuordnungen `Lemma → [(Folgenindex, Anzahl)]` im öffentlichen Statistikformat v2, weiterhin in 64 Dateien je Podcast nach Lemma-Hash aufgeteilt; der Folgenindex ist die nullbasierte Position im chronologischen Katalog desselben Veröffentlichungsstands, der die dauerhafte Episoden-ID enthält. Das Vokabular nennt die zuständige Datei;
- Episodentranskripte und den separat erzeugten Pagefind-Index.

Zählwerte als normale ausreichend große Ganzzahlen behandeln. Ein fehlender Eintrag für eine bekannte Wort-/Folgenkombination bedeutet null; ein fehlgeschlagener Dateiabruf ist ein Fehler und kein Nullwert.

Code, normalisierte Episodendaten und Analyseergebnisse im Projekt versionieren. Modellgewichte und generierte Web-/Such-Builds gehören nicht in Git. Audio wird nur temporär zur Transkription benötigt und danach gelöscht. Öffentlich ausgelieferte Daten werden gezielt vom Build erstellt. Je Podcast eigene Datenbereiche und Suchindizes vorsehen.

## 4. Wörter auswählen, Folgen vergleichen und Passagen lesen

Die Hauptanwendung bleibt eine Erinnerung wie **„Eimer Münzen Kleingeld“**. Der neue ausdrückliche Auftrag vom 7. November ersetzt die getrennte Freitextsuche und Häufigkeitsansicht durch ein gemeinsames Suchfeld mit Wortauswahl. Weder Zitat noch Wortreihenfolge werden vorausgesetzt.

### Einstieg und Podcast-Kontext

Die Startseite vermittelt die Idee interaktiv: „Die“, „Podcast“, „Wort“ und „Suche“ stehen als ausgewählte Chips über einem kurzen Erklärungstext mit zugeordneten Markierungen. Ein kleines Feld ergänzt weitere Wörter aus diesem Beispieltext, etwa „Folge“. Darunter stehen die verfügbaren Podcasts mit offiziellem Cover, Namen und Sprechern; zunächst nur DAS PODCAST UFO von Florentin Will und Stefan Titze. Ein Klick öffnet die Suchansicht mit kleiner Seitennavigation, kompaktem Podcast-Kontext und direkt anschließendem Suchfeld. `?podcast=podcast-ufo` funktioniert als statischer Root-/Projektpfad ohne Serverrouting; bestehende `?episode=…&t=…`-Links öffnen weiterhin direkt den Podcast.

Die [Designrecherche](docs/research/minimal-podcast-design.md) begründet die neutrale Oberfläche, Typohierarchie, gezielte kategoriale Wortfarben und kompakte Fundstellen. Metadaten bleiben nachgeordnet aufklappbar.

### Ein Suchfeld und ausgewählte Wörter

Die Podcast-Suchansicht startet mit dem veröffentlichten Wort „haus“, falls vorhanden, und lädt dafür die normalen Zählungen und zugehörigen Top-Folgen. Entfernen bleibt während des Besuchs bestehen. Ein zugängliches Suchfeld mit Suchsymbol zeigt höchstens zehn passende Grundformen im Dropdown. Exakte Eingaben stehen vor Präfix- und übrigen Teilzeichenfolgentreffern; innerhalb der Gruppen zählen Gesamtvorkommen und anschließend die Grundform als Gleichstandsentscheid. Höchstens fünf Wörter auswählbar machen. Vollflächig gefärbte Wortchips in Kapsel-/Pill-Form mit fetter, je nach Helligkeit schwarzer oder weißer Schrift stehen vor einem kleinen einwortigen Suchfeld in derselben Zeile und werden durch Anklicken entfernt. Bei Platzmangel bricht die Zeile um. Die Startdemo verwendet dieselbe Darstellung. Ein leicht getönter Hintergrund und wenige Trennlinien halten die Oberfläche ruhig. Tastatur, Escape, Außenklick und Touch unterstützen. Stoppwörter und manuell ignorierte Grundformen bleiben ausgeschlossen, mit einem knappen sichtbaren Hinweis.

### Absolutes gestapeltes Balkendiagramm

Das große Diagramm ist das Hauptelement: Folgen auf der sichtbaren X-Achse, absolute Vorkommen auf der Y-Achse und ein farbiger Stapel pro Wort. Normierte Werte und der frühere Umschalter je 1.000 Gesamtwörter entfallen auf ausdrücklichen Nutzerwunsch. Die Balkenhöhe zeigt die Summe aller ausgewählten Grundformen; längere Folgen können dadurch stärker vertreten sein.

„Top 10“ zeigt höchstens zehn Folgen mit positiver Summe, absteigend nach Gesamttreffern und bei Gleichstand nach Datum absteigend sowie dauerhafter ID. „Alle“ zeigt jede Folge einschließlich Nullwerten chronologisch nach Datum und ID. Bei vielen Folgen horizontal innerhalb des Diagramms scrollen; die Seite selbst bleibt in der Gerätebreite. Farben bleiben je ausgewähltem Wort über Chips, Diagramm und Texte hinweg gleich. Die frühere aufklappbare Diagrammdatentabelle entfällt. Exakte Werte bleiben im Tooltip, den Folgenkarten und den zugänglichen Beschriftungen der sichtbaren Episodenachse verfügbar, einschließlich Nullfolgen.

### Top-Folgen, Originaltext und Player

Unter dem Diagramm stehen immer die zehn Folgen mit den meisten Gesamttreffern, unabhängig von der Diagrammansicht. Jede Folge zeigt alle ausgewählten Einzelzählungen einschließlich null und ihre Summe. Erst für diese Folgen Suchfragmente und Originaltranskripte laden; keine Vollarchivabrufe und keine Umordnung nach der internen Suchreihenfolge. Wörter im passenden Segmenttext farbig anhand tatsächlicher lexikalischer Fundstellen markieren. Lange Segmente mit lesbarem Ausschnitt und vollständig aufklappbarem Originaltext anzeigen. Sich ändernde Auswahlen dürfen keine veralteten Antworten einblenden.

Die exakten Grundformzahlen kommen aus der gespeicherten spaCy-Analyse. Pagefind liefert lexikalische Fundstellen mit deutschen Wortformen und Präfixtreffern; das sind unterschiedliche Aussagen. Ein knapper Hinweis erklärt mögliche Abweichungen, ohne Suchtreffer als exakte Zählungen auszugeben. Findet die Textsuche zu einer gezählten Grundform keine Passage, die richtige Zahl erhalten und den Unterschied sichtbar benennen. Keine automatische Synonym- oder Bedeutungssuche und keine neue Wortzeitauflösung hinzufügen.

Der vorhandene Pagefind-Index indexiert weiterhin vollständige Folgen mit Segmentankern. Stabile Identitäten, Datenstandsbindung, kopierte Positionen und bewusst wiederholbare Fehler beibehalten. Die bestehende interne Abdeckungssuche kann als Suchschnittstelle erhalten bleiben; die neue Hauptansicht ordnet nach exakten Gesamttreffern.

Passagen öffnen auf Nutzeraktion einen gemeinsamen Online-Player am groben Segmentanfang. Einen gemeinsamen Werbehinweis unmittelbar bei den Fundstellen je Folge, zugänglich mit jedem Sprungknopf verknüpft, Vor-/Zurückspringen, Episodenlink und teilbare `?episode=…&t=…`-Links erhalten. Geteilte Links starten ohne Autoplay. Fehler sind sichtbare Fehler, keine Nullzählungen; Wiederholung erfolgt bewusst.

Je Folge zunächst zwei kurze Originalausschnitte mit Zeit-/Abspielknopf zeigen; weitere Fundstellen und vollständige Segmente aufklappbar halten. Eine Vorschau schneidet an Wortgrenzen um echte Markierungen und erfindet keine feineren Zeiten.

Wortschatzentwicklung, Gesamtzahlen und gemessene Verarbeitungszeiten bleiben als nachgeordnete einklappbare Informationen unter dem Hauptbereich verfügbar. Gesamt-/Verschiedene-/Neue-Wörter-Zählungen bleiben vollständig einschließlich Stoppwörtern. Root- und GitHub-Pages-Projektpfad müssen dieselbe Funktion bieten.

## 5. Aufbau, Veröffentlichung und Abnahme

### Umsetzung in Etappen

1. **Arbeitsumgebung und Funktionsnachweise:** Lokales FP32-GPU-Paket und Web-App mit gesperrten Abhängigkeiten, lokalen Tests und separatem Veröffentlichungsworkflow betreiben. RSS-Katalog und Quelle für Folge 37 prüfen. Den bestätigten vollständigen FP32-Lauf als Betriebsbasis verwenden; die vereinfachte Pipeline und echte Suche/Statistik mit fünf Folgen nachweisen.
2. **Durchgängiger Pilot:** Fünf repräsentative Folgen vollständig verarbeiten. Daraus spaCy-Analysen, Statistiken, aufgeteilte Wortzahlen und Pagefind-Index erzeugen. Stichwortsuche mit Teiltreffern, Kontext, Player, teilbaren Links und den vorgesehenen Statistiken bis zu einem GitHub-Pages-Build umsetzen. Lade- und Fehlerzustände sichtbar machen. Die unten festgelegte manuell geprüfte Stichprobe sowie Qualitäts- und Laufzeitgrenzen entscheiden über die Freigabe der Archivverarbeitung.
3. **Archiv neu erzeugen:** Nach bestandener Pilotabnahme alle verfügbaren Folgen mit derselben festgehaltenen Modellkonfiguration verarbeiten. Wiederaufnahme, Zeitmarken und Vollständigkeit prüfen; Herkunft und Verarbeitungsstand nachvollziehbar speichern.
4. **Vollständigen Datenstand prüfen:** Analysen, Statistiken und Suchindex für den vollständigen Bestand erzeugen. Alle Artefakte müssen denselben Datenstand referenzieren. Suchqualität, Ladeverhalten, Größe und Laufzeit am vollständigen Bestand erneut prüfen; Quellenlücken ausdrücklich ausweisen.
5. **Veröffentlichen:** GitHub Actions baut mit gesperrten Abhängigkeiten, prüft die Artefakte und veröffentlicht ein vollständiges GitHub-Pages-Artefakt. Ein fehlgeschlagener Build ersetzt keine funktionierende Veröffentlichung. Datenstand und Genauigkeitshinweis auf der Webseite anzeigen. Der Pilot-Build ist noch keine öffentliche Archivfreigabe.

### Gezielte Prüfungen

**Freigabe vor Archivverarbeitung:** Mindestens neun von zehn manuell geprüften Passagensuchen müssen die richtige Folge unter den ersten fünf Ergebnissen finden. Die frühere Grenze von fünf Sekunden für fünfzehn Zeitmarken entfällt auf ausdrücklichen Nutzerwunsch. Gesucht und abgespielt werden grobe Segmente bis etwa fünf Minuten; Werbeabweichungen sind akzeptiert und direkt am Knopf erklärt. Technische Suchprüfungen aus dem Transkript ersetzen keine unabhängige menschliche Suchqualitätsprüfung. Suchanfragen, Referenzen und Befunde vor der Freigabe festhalten. Eine nicht bestandene Prüfung stoppt die Archivverarbeitung bis zur Klärung.

**Suchlaufzeit und Übertragung:** Auf einem dokumentierten mobilen Prüfprofil erste nutzbare Suchergebnisse innerhalb von fünf Sekunden und weitere Suchen innerhalb einer Sekunde anstreben; bis zu den ersten Ergebnissen höchstens 10 MB übertragen. Cachezustand, Netzwerk- und CPU-Profil sowie Messbeginn und -ende im Bericht angeben. Diese Grenzen zuerst im Pilot und vor Veröffentlichung erneut am vollständigen Bestand prüfen. Dabei weder für die Startseite noch für die globale Trefferabdeckung das gesamte Transkriptarchiv laden.

- **Bestand:** Feed-Sonderfälle einschließlich `UGO081` und offenen Nummernlücken erhalten; stabile IDs, doppelte GUIDs und fehlerhafte Enclosures prüfen. Keine Annahme einer festen zukünftigen Episodenzahl.
- **Pipeline:** Abbruch, erneuten Start, Downloadfehler und Teilergebnisse prüfen. Lokale FP32-GPU-Verarbeitung mit temporärem Audio, gespeicherten Laufzeiten und Wiederaufnahme ohne späteren Online-Abgleich.
- **Zählungen:** Werte über 255, Stoppwörter, Grundformen, chronologische neue Wörter und wiederholte Analyse prüfen. Stichproben gegen die Episodentexte zählen.
- **Suche:** Unterschiedliche Reihenfolge, fehlender dritter Begriff, 3/3-vor-2/3-Rangfolge, Wortformen, Umlaute, `ß`, doppelte Eingabebegriffe, Mehrfachvorkommen und Fundstellen über Segmentgrenzen testen. Titelwörter dürfen nicht als gesprochene Wörter gezählt werden.
- **Webseite:** Direkte Folge-/Zeitlinks und Audiosteuerung unter dem tatsächlichen Projekt-Unterpfad prüfen, einschließlich Mobilansicht, fehlender Daten und nicht erreichbarer Audios. Einen veralteten Suchlauf nicht über neuere Ergebnisse schreiben lassen.
- **Vollständiger Build:** Seitengröße, erste und wiederholte Suchlatenz, nachgeladene Bytes und Browser-Speicherbedarf dokumentieren. Vor einer Suche und für globale Trefferabdeckung darf nicht das gesamte Transkriptarchiv geladen werden.

GitHub Pages erlaubt derzeit bis zu 1 GB veröffentlichte Seitengröße; ab 800 MB im Build-Bericht eine Warnung ausgeben und bei Überschreiten von 1 GB nicht veröffentlichen. Ein späterer Wechsel zu anderem statischem Hosting oder externem Dateispeicher kann dieselben Dateischnittstellen nutzen. Für den jetzigen PUFO-Start wird diese zusätzliche Infrastruktur nicht eingerichtet. [GitHub-Pages-Limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

Die [ASR-Untersuchung](docs/research/asr-investigation.md) bewahrt die verworfenen Alternativen und Messbedingungen ausschließlich als Hintergrunddokumentation.

### Quellen und Einstieg

- [Recherche mit live geprüfter Feedquelle und Pagefind-Eigenschaften](docs/research/v3-feed-and-search.md)
- [Parakeet-Modellkarte](https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3)
- [onnx-asr: lange Audios und Zeitstempel](https://istupakov.github.io/onnx-asr/usage/)
- [Pagefind-Indexierung](https://pagefind.app/docs/node-api/), [deutsches Stemming](https://pagefind.app/docs/multilingual/) und [Such-API](https://pagefind.app/docs/api/)
- [Vite auf GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages)

## 6. Zurückgestellte Ladeoptionen

Die vollständige Wortliste bleibt zunächst eine Datei; die 64 Zählpakete bleiben nach Lemma-Hash verteilt. Alphabetische Wortlisten mit Nachladen ab dem ersten Buchstaben und nach globaler Worthäufigkeit geordnete Zählpakete sind ausschließlich dokumentierte Optionen. Sie werden erst bei gemessenen Leistungsproblemen erneut bewertet und implementiert. Abwägungen und Messauslöser stehen im [Skalierungsbericht](docs/research/github-pages-600-episodes.md#zurückgestellte-optionen-bei-gemessenen-leistungsproblemen).
