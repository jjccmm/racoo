# Variantenfilter mit nativem Pagefind-Standard

**Spätere Umfangsänderung vom 13. November:** Der Nutzer hat informative Wortlisten nur für Top10 ohne Ausschlüsse und einen auf diese Kandidaten begrenzten Exaktmodus gewählt. Der folgende Bericht untersucht den vorherigen globalen Entwurf; dessen Positionsdatei ist für den neuen Umfang nicht mehr erforderlich. Maßgeblich ist der [aktuelle Plan](../planning/search-modes.md). Die Messwerte bleiben historische Vergleichswerte.

Stand: 13. November 2026. **Recherche zu einem unbestätigten Vorschlag.** Untersucht sind Exakt, Standard als bisherige native Pagefind-Suche und Erweitert sowie eine nach Häufigkeit sortierte Liste tatsächlich getroffener Schreibweisen mit globalem Ausschluss. Diese Notiz ändert weder Anwendung noch aktiven Suchvertrag, Datenverträge oder bestätigten Plan. Ausgangspunkte sind [Suchvertrag](../search.md), [Veröffentlichungsverträge](../data-contracts.md), [bestehende Suchmodi-Recherche](search-modes-2026-11-12.md) und [offener Suchmodi-Plan](../planning/search-modes.md).

## Ergebnis

Der Vorschlag ist statisch umsetzbar, aber die vollständige Variantenliste ist **keine bereits vorhandene Pagefind-Antwort**. Standard kann seine nativen Trefferpositionen behalten. Für deren Oberflächenformen braucht der Browser zusätzlich entweder die Inhalte sämtlicher Trefferfolgen oder eine beim Build erzeugte Zuordnung von nativen Positionen zu Wortformen. Ein bloßes Wörterverzeichnis mit globalen oder folgenweisen Häufigkeiten reicht für unveränderte native Standard-Treffermengen nicht aus.

Als Machbarkeitsrichtung bietet sich ein eigenes kompaktes Oberflächenlexikon plus eine Wort-ID je nativer Whitespace-Position an. Es ergänzt die nativen Ergebnisse; es ersetzt Standard nicht durch eine selbst nachgebaute Stamm-/Präfixregel. Originaltranskripte und Pagefind-Detailfragmente für sichtbare Karten können weiter bedarfsgesteuert laden. Der tatsächliche Größen- und Laufzeitnachweis ist eine eigene Messung; die API-Ableitung allein garantiert kein Budget.

## Versionsbindung und Quellen

Die [offizielle Veröffentlichung v1.5.2](https://github.com/Pagefind/pagefind/releases/tag/v1.5.2) verweist auf Commit `bf17396721be637cc67c8ed7ead1dc7b8ac43d96`. Die folgenden Quellverweise sind auf diesen unveränderlichen Commit gebunden. Geprüft wurden öffentliche Browsertypen, JS-Ergebnisabbildung, WASM-Suche und Chunk-Lader, Indexkodierung, Build-Tokenizer und der eingebaute deutsche Stemmer. Die lokale Abhängigkeit bleibt Pagefind 1.5.2. Aktuelle Herstellerdokumentation dient nur zur ergänzenden Erklärung; sie überschreibt den gesperrten Quellstand nicht.

## Was die API tatsächlich liefert

| Datenweg | Verfügbar | Konsequenz für Varianten |
| --- | --- | --- |
| `search(q).results` | ID, Score, `words: number[]`, lazy `data()`; optional Playground-Diagnosen | Die vollständigen nativen Trefferpositionen sind ohne Dokumentinhalt zählbar; ihre Originalschreibweisen fehlen. |
| `result.data()` | Vollständiges verarbeitetes `content`, `locations`, `weighted_locations`, Anker und Metadaten | `content` anhand von Whitespace teilen und mit einer Trefferposition indizieren liefert den Token. Dafür muss das jeweilige Fragment geladen werden. |
| Playground | `search_keywords` für Query-Stämme; `scores` für indexierte Suchschlüssel; an gewichteten Positionen `verbose.word_string`, gewöhnlich gestemmt | Diagnoseinformationen sind kein vollständiges Oberflächenlexikon. Auch `raw_tf` in den Rankingdaten ist kein Vertrag für die Häufigkeit einer Originalschreibweise. |

Diese Felder und die Whitespace-Zuordnung sind ausdrücklich in den [Browsertypen 1.5.2](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web_js/types/index.d.ts) beschrieben. Ein öffentliches Wörterbuch-Enumerationsverfahren oder ein eigenständiger `stem(text)`-Aufruf gehört nicht zu dieser Schnittstelle. `filters()` liefert Kategorien mit Seitenzahlen, keine gesprochenen Wortformen.

Die JS-Abbildung übernimmt lediglich die numerischen Positionen nach `words`; erst die `data()`-Closure ruft `loadFragment` auf. Dieser lädt und cached `fragment/<hash>.pf_fragment`, das den vollständigen verarbeiteten Dokumenttext enthält. Eine globale Liste aus nur den bereits geöffneten Topkarten wäre folglich unvollständig. Cachetreffer sparen Wiederholungsabrufe, liefern beim ersten Aufruf aber keine fehlenden Texte. [JS-Ergebnisabbildung und Fragmentabruf](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web_js/lib/coupled_search.ts#L365)

## Warum interne Indexwörter die Lücke nicht schließen

Der Build entfernt bei seinem primären Indexwort bestimmte Zeichen, schreibt klein, normalisiert Diakritika und stemmt anschließend. Ein Token kann zusätzlich indexierte Bestandteile erhalten. Das optionale `original` erhält Schreibweisen bei abweichenden Diakritika; es ist keine allgemeine Speicherung aller Flexionsformen. Mehrere Oberflächenformen können auf denselben Schlüssel fallen. Das lässt sich aus einem Stammschlüssel nicht eindeutig rückwärts auflösen. [Build-Tokenizer](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind/src/fossick/splitting.rs)

Der inverse Index speichert Schlüssel und Positionslisten; `additional_variants` ist ausdrücklich für diakritische Varianten vorgesehen. Das Laden baut daraus eine interne Worttabelle auf. Ein eigenes Dekodieren dieser Chunkdateien wäre Versionskopplung an das interne Format und würde die verlorene allgemeine Surface-Identität nicht wiederherstellen. [Kodierung](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind/src/index/index_words.rs), [Chunk-Dekodierung](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web/src/index.rs)

## Native Standard-Treffer erhalten

Die native Suche stemmt und prüft geladene Indexschlüssel auf Präfixe. Fehlt eine Erweiterung, kann sie den längsten vorhandenen Präfix der Anfrage verwenden. Sie dedupliziert Treffer auf derselben Position, auch wenn mehrere indexierte Bestandteile passen. Der zitierte Suchpfad stemmt ebenfalls und bricht seinen erfolgreichen zusammenhängenden Positionslauf ab; Anführungszeichen implementieren deshalb keine vollständige wörtliche Zählung. [Suchalgorithmus 1.5.2](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web/src/search.rs)

Für die Ergänzung genügt konzeptionell:

1. Der Build erzeugt pro Veröffentlichung ein Vokabular normalisierter Oberflächenformen und je Episode eine Folge von Wort-IDs in nativer Positionsreihenfolge. Quelle kann der lokal beim Build verfügbare Fragmentinhalt sein. Es ist kein Browserabruf aller Fragmente nötig.
2. Standard führt weiterhin genau die bisherigen unabhängigen nativen Stichwortsuchen aus. Für jedes `(Episode, Position)` aus `result.words` wird ausschließlich die Oberflächen-ID nachgeschlagen.
3. Die Häufigkeit einer Listenzeile ist die Anzahl dieser tatsächlich getroffenen unterschiedlichen Positionen mit derselben ID über alle Trefferfolgen. Weder Gesamthäufigkeiten des Vokabulars noch nur die sichtbaren zehn Folgen bestimmen sie.
4. Ausschlüsse filtern dieselben Positionsmengen vor Zählung und Top10-Rangfolge. Markierungen, Navigation und Minimap verwenden die Vereinigung der verbleibenden Positionen. Überlappende Stichwörter behalten ihre getrennten Serienzählungen.

Das ist ein eigener Datenentwurf, keine Pagefind-API-Zusage. Eine Index-/Veröffentlichungsbindung sowie vollständige Positionslängen- und Tokenprüfungen sind notwendig. Eine Abweichung muss als Fehler sichtbar werden. Buildseitig dürfen alle Fragmente gelesen werden; browserseitig bleibt nur die zusätzliche kompakte Datei nötig. Globale Häufigkeiten oder Zählpaare ohne Positionsidentität könnten für einen eigenen Exaktmodus genügen, identifizieren aber nicht zuverlässig die Teilmenge eines beliebigen nativen Standardresultats.

Der Chunk-Lader bevorzugt passende Bereiche von Eingabe und Stamm und greift sonst auf Präfixüberlappungen zurück. Geladene Wörter bleiben erhalten. Daher kann die vorhandene native Suche vom bisherigen Suchablauf abhängen; die [vorherige Untersuchung](search-modes-2026-11-12.md) hat dies am echten Bestand gezeigt. [Chunk-Anforderung und Indexspeicher](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web/src/lib.rs#L253)

Eine separat geladene Surface-Zuordnung ändert diesen Pagefind-Zustand nicht. Zusätzliche Enginequeries oder ein Vorladen sämtlicher nativer Wortchunks können ihn dagegen ändern. „Standard bleibt erhalten“ sollte deshalb auch heißen: Die Ergänzung führt für diesen Modus keine versteckten Erweiterungsqueries aus. Eine vollständig ablaufunabhängige native Suche wäre eine weitere Untersuchung und ist hier nicht zugesagt.

## Exakt und die Identität einer Wortform

Exakt ist mit eigener Oberflächenzuordnung und vereinbarter Ganzwortregel machbar. Nur Groß-/Kleinschreibung und NFC vereinheitlichen; Umlaut-/Akzentunterschiede nicht stillschweigend wie Pagefind normalisieren. Ein Präfix oder stemmähnliches Wort darf kein exakter Treffer werden. Die öffentlichen Suchoptionen enthalten keinen passenden Literal-Ganzwortschalter; `exactDiacritics` allein reicht nicht. [Browseroptionen](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_web_js/types/index.d.ts)

Offen bleibt, was „Wort“ in `Euro-Münze`, `Wort/Teil`, Apostrophen oder Zahlen bedeutet. Eine ID je Whitespace-Position kann zunächst den ganzen sichtbaren Token bezeichnen. Außenzeichen lassen sich entfernen; innere Trennzeichen erfordern eine ausdrückliche Regel. Soll `Münze` als exaktes Wort innerhalb von `Euro-Münze` gelten, braucht dieselbe native Position gegebenenfalls mehrere Komponenten-IDs und passende Zeichenbereiche. Eine einfache Map ist dafür nicht automatisch ausreichend. Liste, Exaktvergleich und Ausschluss müssen dieselbe Identität verwenden.

Empfohlene Bediensemantik als Vorschlag: Die Listenhäufigkeit zeigt die rohe Gesamtzahl einer Form vor ihrem Ausschluss, damit sie wieder einschaltbar bleibt. Ein globaler Ausschluss entfernt die Form aus allen Folgen und Stichwortserien der aktuellen Suche; das Speichern über Suchwechsel oder Sitzungen ist eine zusätzliche Produktentscheidung. Die Oberfläche darf keine sprachlichen Grundformen vortäuschen, wenn tatsächlich kleingeschriebene Surfaceformen gruppiert werden.

## Erweitert: Präfixliste mit Stemming

Ein kontrollierter Satz deutscher Voranstellungen kann `kommen` um tatsächlich vorhandene Formen wie `vorkommen` und `herkommen` erweitern. Er erzeugt jedoch keine vollständige sprachliche Wortfamilie. Snowball nennt gerade deutsche Komposita, trennbare Verbpräfixe und `ge` als Grenzen und beschreibt auch Fehlzusammenführungen sowie bewusst erhaltene Endungen wie `-t`. [Snowball-Designhinweise](https://snowballstem.org/algorithms/german/stemmer.html)

Die eingebaute Fassung ist generierter Snowball-3.0.0-Code mit konkreten Vor-/Nachbehandlungen und Suffixregeln. Deshalb dürfen neuere Snowball-Varianten oder irgendein gleichnamiges JavaScript-Paket nicht ungeprüft als identisch gelten. [Eingebauter deutscher Algorithmus](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_stem/src/snowball/algorithms/german.rs), [Pagefind-Stemmeradapter](https://github.com/Pagefind/pagefind/blob/bf17396721be637cc67c8ed7ead1dc7b8ac43d96/pagefind_stem/src/lib.rs)

Für den Entwurf folgen daraus diese Grenzen:

- `Präfix + Eingabe` und ein anschließender nativer Suchaufruf sind selbst wieder Stamm-/Präfixsuchen mit möglichem Kürzerpräfix-Fallback. Ein erfundenes zusammengesetztes Suchwort kann unerwartet etwas anderes treffen. Nicht vorhandene Kombinationen sollten vorab anhand des Corpuslexikons entfallen.
- Eine pauschale Stammgleichheit verspricht weder `kommt` noch `kam`. Umgekehrt kann eine native Präfixsuche weitere längere Wörter akzeptieren. Treffermengen sind keine Äquivalenzklassen und nicht zwingend symmetrisch.
- Eine reine Endzeichenfolge für `kommen` trifft etwa auch `vollkommen`, `willkommen` und `Abkommen`. Eine gewählte Präfixliste kann enger sein, entscheidet aber weiterhin nur nach technischen Regeln, nicht nach Bedeutung.
- Mehrere Voranstellungen, eingefügtes `ge`/`zu`, getrennt stehende Verbteile und unregelmäßige Stammwechsel brauchen weitere ausdrücklich gewählte Regeln oder eine linguistische Ressource. Eine kurze Liste bietet keine Vollständigkeitsgarantie.

Bevorzugter weiterer Nachweis: Im vorhandenen Surfacelexikon zunächst nur tatsächlich vorkommende Kandidaten auswählen, das zugelassene Präfix-/Stemmuster ausdrücklich definieren und deren Positionen mit Standard vereinigen. Erweitert sollte als Vorschlag eine echte Erweiterung sein: Standardpositionen bleiben enthalten, zusätzliche Positionen werden je Stichwort dedupliziert. Die Variantenliste macht die resultierende Breite sichtbar und korrigierbar.

Viele native Präfixqueries sind eine mögliche Alternative, aber mit zusätzlichen Engineaufrufen, Cache-/Chunk-Erwärmung und anschließender Oberflächenprüfung verbunden. Die Kandidatenzahl braucht eine gemessene Grenze; bloßes Abschneiden darf vollständige Zählungen nicht vortäuschen. Weder eine feste Präfixzahl noch eine geringe Corpusgröße beweist automatisch akzeptable Browserkosten.

## Umfang des Nachweises

Diese Recherche prüft Quellen und Datenbedarf; sie implementiert keine Modi und keine neue Veröffentlichung. Die getrennte lokale Größenprobe für den vorhandenen Bestand prüft, ob eine positionsbezogene Zusatzdatei praktisch klein genug ist. Vor Umsetzung bleiben insbesondere Normalisierung/Komponentengrenzen, genaue Extended-Regel, Zustandsdauer der Ausschlüsse, Indexbindung und gemessene Kalt-/Warmlaufzeiten festzulegen. Kein neues NLP-Modell ist für eine ausdrücklich technische Regel erforderlich; eine vollständige linguistische Familienerkennung ist damit nicht belegt.
