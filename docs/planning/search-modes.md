# Vorschlag: klare Suchmodi für Racoo

Stand: 12. November 2026. **Plan zur Entscheidung, noch nicht umgesetzt.** Die laufende Seite und der [aktive Suchvertrag](../search.md) bleiben unverändert. Grundlage sind [Primärquellen und Engineproben](../research/search-modes-2026-11-12.md) sowie die [Messdaten](../research/evidence/search-options-2026-11-12.json).

## Empfehlung

Ganze Wörter als Standard verwenden. Wortanfang, Wortende und beliebige Wortbestandteile als bewusst wählbare Erweiterungen anbieten. Diese vier Regeln passen zu einem kleinen statischen Wortverzeichnis mit kompakten Häufigkeitsdaten. Für die erste Ausbaustufe sind weder spaCy noch ein Backend oder eine neue Transkription nötig.

Für den konkreten Wunsch `kommen` → `vorkommen` ist **Wortende** besonders interessant. Eine beliebige Teilwortsuche trifft ebenfalls `Kommentar`: Die Schreibweise beginnt mit `kommen`. Auch Wortende ist keine Bedeutungsanalyse; beispielsweise gehören `willkommen`, `vollkommen` und `Abkommen` dazu.

## Was die Modi bedeuten

Die Muster in der zweiten Spalte erläutern die Regel. Sternchensyntax ist zunächst ein optionaler späterer Shortcut, noch kein beschlossener Eingabevertrag.

| Suchart | Anschauliches Muster | Zählt beispielsweise | Zählt dabei nicht |
| --- | --- | --- | --- |
| Ganzes Wort | `Ei`, `kommen` | Ei beziehungsweise kommen | eine, eigentlich, einfach; vorkommen, kommt |
| Wortanfang | `Ei*` | Ei, Eier, eine, einfach | leider |
| Wortende | `*kommen` | kommen, vorkommen, angekommen, bekommen | Kommentar, vorkommenden, kommt |
| Wortbestandteil | `*kommen*` | kommen, vorkommen, gekommen, vorkommenden, Kommentar | kommt, vorkommt, kam |
| Ähnliche Wortformen, später | sprachliche Formen von kommen | mit passender Ressource auch kommt, kam | nicht automatisch das andere Verb vorkommen |
| Tippfehler, später | Vorschlag zu Eimre | möglicher Vorschlag Eimer | keine Bedeutungs-/Synonymgarantie |
| Bedeutung/Synonyme, separat | Geldstück → Münze | ähnliche Inhalte | keine exakte Wortzählung aus Ähnlichkeitsscores |

Groß-/Kleinschreibung bleibt für den Vergleich unerheblich, die eingegebene Schreibweise bleibt sichtbar. NFC wird normalisiert. Für strikte Suche zunächst keine Akzente, Umlaute oder ß stillschweigend gleichsetzen. Echte Lemmatisierung und technische Wortstämme sind unterschiedliche Regeln: Ein Snowball-Stamm garantiert weder kommen/kommt noch unregelmäßige Formen wie kam. Das Lemma vorkommen ist außerdem ein anderes als kommen. Ein sprachliches Familienverfahren wäre eigener zusätzlicher Umfang.

Eine einfache Wortteilsuche kann sehr breite oder unpassende Ergebnisse liefern. Bei kurzen Teilwörtern einen sichtbaren Hinweis vorsehen und die tatsächlich mitgezählten Schreibweisen anzeigen. Eine Mindestlänge von drei Zeichen für beliebige Bestandteile ist eine mögliche Entscheidung; eine Einschränkung darf niemals stillschweigend Treffer abschneiden.

## Warum reine Pagefind-Einstellungen nicht genügen

Die gesperrte Version 1.5.2 mischt Stammverarbeitung und Präfixerweiterung. Wortformen wie Kommentar und Komma sind deshalb mögliche Treffer für kommen. Für Ei wurde der fehlende einfach-Treffer am echten Index reproduziert.

Die Treffer hängen zusätzlich vom geladenen Wortbestand ab: Die native Engine liefert Ei zunächst mit 33.329 Positionen, nach einer Suche nach einfach mit 45.171. Im Anwendungsadapter bleibt die zuerst gecachte Ei-Menge erhalten; sucht man in einer frischen Instanz zuerst einfach, erhält die erste Ei-Suche ebenfalls 45.171. Das erklärt das beobachtete Verhalten besser als eine sprachliche Unterscheidung zwischen eine und einfach. Es ist ein Korrektheitsnachweis für diesen Index, keine Behauptung über jede denkbare Pagefind-Abfrage.

Rankingparameter steuern den Score und entfernen keine Wortpositionen. Racoo sortiert seine Balken nach eigenen absoluten Zählungen; ein höheres termSimilarity stellt keine strikte Zählung her. Anführungszeichen sind ebenfalls kein Fix: Die App behandelt sie bislang als Trennzeichen. Der native Phrasenpfad stemmt weiterhin und liefert im untersuchten Fall nur die erste zusammenhängende Stelle pro Folge. Quell- und Versionsnachweise stehen in der verlinkten Recherche. Auch die reine Quelltextprüfung von 1.6.0 belegt keinen fertigen Schalter für die gewünschten Regeln.

## Technische Optionen

| Variante | Vorteile | Nachteile / Grenzen |
| --- | --- | --- |
| Pagefind behalten, zurückgelieferte Wörter nachfiltern | Kleiner Einstieg für strengere Prüfungen | Kann falsche Positionen entfernen, aber fehlende Kandidaten nicht zuverlässig ergänzen. Für breite Begriffe müssen zusätzliche Texte geladen werden, bevor globale Zahlen feststehen. |
| Alle Transkripte im Browser durchsuchen | Sehr einfacher Matcher, eindeutige Regeln | Kalt müssen alle Texte geladen werden. Als Prüfreferenz gut; als Standardpfad im wachsenden Archiv ungünstig für das vorhandene Lazy-Loading-Ziel. |
| Vollständiges Wortverzeichnis + kompakte Zählpaare | Klare, vollständige Wortwahl für alle vier lexikalischen Modi; schnelle globale Zahlen; Texte bleiben lazy | Eigener kleiner Build-/Ladevertrag und explizite Wortgrenzen erforderlich. Das ist wieder ein eigener Zählindex, jedoch ohne Sprachmodell. |
| Andere Suchbibliothek oder Pagefind-Fork | Zusätzliche Steuerungsmöglichkeiten | Upgrade-/Integrationsaufwand; korrekte globale Häufigkeiten und Textbereiche entstehen nicht automatisch. |

Bevorzugt ist die dritte Variante. Pagefind würde im bestätigten Zielweg für Suche und Zählung ersetzt; eine dauerhafte doppelte Zählquelle ist nicht erforderlich. Die Anwendung behält ihre Oberfläche, Originaltranskripte, groben Zeiten, Podcastkonfiguration und das statische Hosting auf GitHub Pages.

## Datenfluss der bevorzugten Variante

1. Beim Build die gespeicherten Episoden mit einem gemeinsamen Wortzerleger erfassen. Wörter erhalten einen normalisierten Schlüssel. Pro Wort nur nichtleere Paare `[Folgenindex, Anzahl]` speichern; keine Wortzeitstempel und zunächst keine globalen Positionslisten.
2. Im Browser das vollständige Wortverzeichnis des ausgewählten Podcasts laden. Das Suchwort per Gleichheit, startsWith, endsWith oder includes mit den Wörterbucheinträgen vergleichen. Benötigte Zählpakete laden und cachen; keine zufällige Abhängigkeit von zuvor geladenen Wortbereichen.
3. Für jeden eingegebenen Begriff die Anzahlpaare aller passenden Wörter addieren, Nullfolgen ergänzen und dann Top10/Alle wie bisher sortieren. Eine Form nur einmal je Suchbegriff auswählen.
4. Nur die sichtbaren Ergebnisfolgen als vorhandenes Episoden-JSON laden. Derselbe Wortzerleger und Matcher erzeugt dort die UTF-16-Markierungsbereiche. Fundstellennavigation, Minimap und Audio verwenden diese Bereiche und die vorhandenen groben Zeiten.
5. Modus und Publikationsstand gehören in Cache-/Linkidentität. Zahlen, Rangfolge und Markierungen wechseln gemeinsam. Die bestehende Behandlung von Abbruch, veralteten Antworten und Ladefehlern erhalten.

Ein vorhandener Worttoken bekommt zunächst genau einen Schlüssel. So können Zählpaare addiert werden, ohne Komponentenalias-Treffer doppelt zu zählen. Der Größenprobe liegt das aktuelle Suchwortmuster zugrunde, das innere Bindestriche/Schrägstriche erhält. Ob Euro-Münze und Wort/Teil künftig als ein Ganzes oder getrennte Komponenten gelten sollen, ist vor Umsetzung anhand konkreter Beispiele zu bestätigen. Bei Komponentenaliasen müsste zusätzlich die Deduplizierung derselben Textstelle gelöst werden.

Bei mehreren Suchbegriffen bleibt die bisherige Serienregel bestehen: Eine Stelle kann zu zwei verschiedenen Anfragen gehören und in beiden Balkenserien zählen. Im Leser wird sie zu einer markierten Stelle mit den passenden Farben zusammengeführt.

## Größenprobe und Skalierung

Im vorhandenen 106er-Bestand wurden mit dem vorläufigen Wortmuster 55.060 verschiedene normalisierte Schreibweisen und 236.490 nichtleere Wort/Folge-Paare gezählt. Die Wortliste umfasste rund 0,69 MB JSON und 0,20 MB gzip; flache Zählpaare rund 1,30 MB JSON und 0,35 MB gzip. Zusammen also etwa 0,55 MB gzip, ohne fertige Publikationshülle oder Paketmetadaten.

Das zeigt eine brauchbare Größenordnung für einen Prototyp, keine gemessene Netzwerk-/Laufzeitgarantie. Dateipaketierung und tatsächliche Auslieferung müssen im Pages-/Browserpfad geprüft werden. Das Wachstum hängt auch von Wortvielfalt ab. Mit 600 echten Folgen erneut kalte/warme Bytes, Speicher und Suchzeit messen; keine vorschnelle lineare Garantie aus 106 Folgen ableiten. Ein N-Gramm-Index oder gespeicherte Positionspostings sind erst bei gemessenem Bedarf sinnvoll.

## Umsetzungsreihenfolge nach Bestätigung

1. **Suchvertrag festlegen.** Vier lexikalische Regeln, Wortgrenzen, Kurzbegriff-Hinweis, Zähleinheit und Mehrwortüberschneidungen als kleine Beispielmatrix festhalten. Wortformen/Tippfehler/Bedeutung bleiben zunächst außerhalb.
2. **Kleinen Machbarkeitsnachweis bauen.** Gemeinsamer Tokenizer, Wortverzeichnis/Zählpaare und direkte Originaltext-Referenzzählung. Ei/eine/eigentlich/einem/einfach sowie kommen/kommt/kam/vorkommen/vorkommt/gekommen/Kommentar/Komma/willkommen prüfen.
3. **Echte 106 Folgen vergleichen.** Nicht die heutige Pagefind-Menge als Sollwert nehmen, sondern den bestätigten direkten Wortvergleich. Kalte/warme Anfragen und unterschiedliche Suchreihenfolgen müssen exakt dieselben Zählungen liefern.
4. **Adapter und Suchoptionen integrieren.** Vorschlag: Ganze Wörter als Vorgabe und eine kleine Suchart-Auswahl für Wortanfang, Wortende und Enthält. Angezeigte Wörter/Farben erhalten; mitgezählte Formen auf Wunsch aufklappbar zeigen. Sternchen-Shortcuts später nur bei Bedarf.
5. **Veröffentlichen und aufräumen.** Wortzahlen, Highlights, Top10/Alle, beide Themen, Handybreite, Links und neu hinzukommende Folgen prüfen. Erst nach Abnahme den bisherigen Pagefind-Zählweg ablösen. Vorhandene Transkripte werden wiederverwendet, ohne Audio-Download oder Neutranskription.

Die bisherigen Anwendungen und der laufende Preview wurden für diese Planung nicht verändert. Dieser Plan ist die Grundlage für eine nächste Entscheidung und anschließend konkrete Tickets.
