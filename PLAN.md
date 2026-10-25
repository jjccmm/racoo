# Podcast Words V3 – Projektplan

Stand: 25. Oktober 2026; lokaler Fünf-Folgen-Pilot mit temporärem Audio und groben Segmenten. Die aktuelle Ergänzung ist die [kompakte und gefilterte Wortstatistik](.scratch/compact-filtered-statistics/spec.md); der übrige Umfang steht in der [Pilotspezifikation](.scratch/local-five-episode-pilot/spec.md).

Der Plan wurde im dokumentierten Interview gemeinsam bestätigt. Die [Planverfeinerung](docs/planning/refinement.md) hält die Entscheidungen fest; [TASKS.md](TASKS.md) enthält die nachweisorientierte Umsetzungsreihenfolge. Der [bestätigte Einrichtungsumfang](docs/planning/workspace-setup.md) ist die Grundlage der Workspace-Einrichtung.

## 1. Ziel und festgelegte Entscheidungen

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
- **Arbeitsumgebung:** Nach Abschluss der Planverfeinerung lauffähige Python- und React/TypeScript-Starterpakete mit gesperrten Abhängigkeiten, gezielten Prüfungen und CI einrichten. Modelldownloads und die vollständige Transkription sind nachgelagerte Aufgaben.

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

Für die Statistik einheitlich spaCy mit `de_core_news_lg` und festgehaltener Modellversion verwenden. Alle alphabetischen Tokens einschließlich Stoppwörtern als Gesamtwörter zählen. Verschiedene und erstmals auftretende Wörter anhand kleingeschriebener Lemmata bestimmen; auch hier gehören Stoppwörter zum Bestand. Stoppwörter in der vollständigen Analyse kennzeichnen. Für die veröffentlichten Häufigkeitsvergleiche Stoppwörter und eine manuell gepflegte Zusatzliste ausschließen; diese Filter ändern weder die vollständigen Analysewerte noch den Bezugswert je 1.000 Gesamtwörter. Die Definitionen auf der Webseite erklären. Originaltexte und Spracherkennung bleiben von dieser Aufbereitung unabhängig.

Die Analyse pro Folge zwischenspeichern und ihre Version festhalten. Eine geänderte Lemmatisierung berechnet nur die Analysen neu. Für die Veröffentlichung daraus erzeugen:

- Katalog, Vokabular und Gesamt-/Episodenstatistiken;
- sparsame Zuordnungen `Lemma → [(Folgenindex, Anzahl)]` im öffentlichen Statistikformat v2, weiterhin in 64 Dateien je Podcast nach Lemma-Hash aufgeteilt; der Folgenindex ist die nullbasierte Position im chronologischen Katalog desselben Veröffentlichungsstands, der die dauerhafte Episoden-ID enthält. Das Vokabular nennt die zuständige Datei;
- Episodentranskripte und den separat erzeugten Pagefind-Index.

Zählwerte als normale ausreichend große Ganzzahlen behandeln. Ein fehlender Eintrag für eine bekannte Wort-/Folgenkombination bedeutet null; ein fehlgeschlagener Dateiabruf ist ein Fehler und kein Nullwert.

Code, normalisierte Episodendaten und Analyseergebnisse im Projekt versionieren. Modellgewichte und generierte Web-/Such-Builds gehören nicht in Git. Audio wird nur temporär zur Transkription benötigt und danach gelöscht. Öffentlich ausgelieferte Daten werden gezielt vom Build erstellt. Je Podcast eigene Datenbereiche und Suchindizes vorsehen.

## 4. Suche, Statistik und Player

### Stichwortsuche als Standard

Die Hauptanwendung ist eine Erinnerung wie **„Eimer Münzen Kleingeld“**. Weder ein exaktes Zitat noch eine bestimmte Wortreihenfolge werden vorausgesetzt.

- Pagefind indexiert beim Build eine vollständige Folge als ein virtuelles HTML-Dokument mit `lang="de"`. Segment-IDs verbinden Wortpositionen mit Zeitmarken. Die virtuelle Ergebnis-URL verweist auf die App; echte HTML-Folgenseiten sind nicht notwendig.
- Die App zerlegt die Eingabe in unterschiedliche Stichwörter, ignoriert Groß-/Kleinschreibung sowie leere und doppelte Begriffe und sucht jeden Begriff separat über Pagefind.
- Gefundene Folgen vereinigen. Zuerst nach Anzahl verschiedener passender Begriffe sortieren: bei drei Stichwörtern 3/3 vor 2/3 vor 1/3. Innerhalb derselben Gruppe die Summe der Pagefind-Ergebnisränge verwenden, kleinere Summe zuerst; danach Veröffentlichungsdatum absteigend und Episoden-ID als stabilen Gleichstandsentscheid.
- Deutsches Stemming von Pagefind beibehalten. **Kein exakter Nachfilter** für normale Stichwörter: „Münzen“ darf einen passenden Wortformtreffer liefern. Suchtreffer sind keine exakten Lemma-Zählungen.
- Anfangs nur die ersten zehn Ergebnisdetails laden; weitere auf Anforderung. Die vollständige Trefferabdeckung lässt sich bereits aus den Ergebnis-ID-Listen berechnen. Treffer mit nur einem Teil der Begriffe entsprechend kennzeichnen.
- Pagefind-Ergebnis-IDs gelten nur innerhalb eines Indexstands und ersetzen keine Episoden-ID. Für die globale Sortierung vor dem Nachladen der ersten zehn Details eine kompakte, an denselben Indexstand gebundene Zuordnung zu Episoden-ID und Veröffentlichungsdatum erzeugen oder im Funktionsnachweis einen gleichwertigen Weg belegen. Nicht erst alle Ergebnisfragmente laden, um diese Metadaten zu erhalten.
- Innerhalb geladener oder geöffneter Folgen anhand der Positionen passende Passagen bestimmen, mehrere nahe Begriffe bevorzugen und sämtliche Fundstellen zugänglich machen. Dafür die Pagefind-Anker verwenden; Standard-Subresults allein reichen für Segmentabsätze nicht aus.
- Positionen je Stichwort getrennt erhalten. Im geprüften Pagefind-Stand werden geladene Fragmentobjekte zwischen Abfragen verändert; gemeinsam referenzierte `.data()`-Objekte sind deshalb keine gesicherten Positionskopien. Dies mit dem tatsächlich gesperrten Paketstand prüfen.
- Keine globale Nähe-Sortierung erzwingen, die sämtliche Transkripte nachladen würde.

Pagefind übernimmt Indexierung, bedarfsgerechtes Nachladen und lexikalische Suche einschließlich Stemming. Die App ergänzt Zusammenführen, Abdeckungsrangfolge, Segmentdarstellung und Audiosteuerung. Es gibt keine automatische Synonym- oder Bedeutungssuche: „Behälter voller Geldstücke“ muss nicht zu „Eimer Münzen“ passen. Semantische Suche und exakte Zitatsuche sind spätere Erweiterungen und keine Voraussetzung für die erste V3.

### Statistik und Wiedergabe

Mehrere Grundformen auswählbar machen, mit begrenzten Vorschlägen statt einer vollständigen langen Auswahlliste. Stoppwörter und manuell ignorierte Grundformen aus Wortauswahl und veröffentlichten Häufigkeitsdateien ausschließen. Ein sichtbarer Hinweis erklärt diese Auswahl und die weiterhin vollständigen Gesamtzahlen; ein Stoppwortschalter entfällt. Häufigkeitsverläufe standardmäßig als Vorkommen je 1.000 Gesamtwörter der jeweiligen Folge zeigen, absolute Zahlen als Alternative anbieten. Bei null Gesamtwörtern keine Division ausführen und den Wert als nicht verfügbar kennzeichnen.

Top-10-Folgen und Statistiken zu Gesamtwörtern, verschiedenen Wörtern und erstmals auftretenden Wörtern beibehalten. Erstes Auftreten chronologisch nach Veröffentlichungsdatum bestimmen; bei gleichem Datum stabil nach ID ordnen.

Treffer zeigen Folgentitel, Datum, Originaltext, passende Begriffe und Zeitmarken. Über einen gemeinsamen Audio-Player ab dem groben Segmentanfang mit Vor-/Zurückspringen abspielen. Abspielen erfolgt nach Nutzeraktion. Nicht verfügbare Audios als Fehler anzeigen und den Episodenlink anbieten.

Folge und Audiostelle über URL-Parameter wie `?episode=…&t=…` teilen. Vite-Basispfad, Datenabrufe, Pagefind-Importe und Ergebnis-URLs müssen sowohl lokal als auch unter dem GitHub-Pages-Projektpfad funktionieren.

Zeitmarken gelten für die transkribierte Audiofassung. Später anders eingefügte Werbung kann Sprünge verschieben; diese Grenze knapp erklären. Eine aufwendige Synchronisation verschiedener Audiofassungen wird zunächst nicht aufgebaut.

## 5. Aufbau, Veröffentlichung und Abnahme

### Umsetzung in Etappen

1. **Arbeitsumgebung und Funktionsnachweise:** Lokales FP32-GPU-Paket, Web-App und CI mit gesperrten Abhängigkeiten betreiben. RSS-Katalog und Quelle für Folge 37 prüfen. Den bestätigten vollständigen FP32-Lauf als Betriebsbasis verwenden; die vereinfachte Pipeline und echte Suche/Statistik mit fünf Folgen nachweisen.
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
