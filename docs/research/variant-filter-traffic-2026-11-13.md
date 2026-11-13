# Datenbedarf für Suchoptionen und Wortvarianten

**Spätere Umfangsänderung vom 13. November:** Der Nutzer hat informative Wortlisten nur für Top10 ohne Ausschlüsse und einen auf diese Kandidaten begrenzten Exaktmodus gewählt. Der folgende Bericht untersucht den vorherigen globalen Entwurf; dessen Positionsdatei ist für den neuen Umfang nicht mehr erforderlich. Maßgeblich ist der [aktuelle Plan](../planning/search-modes.md). Die Messwerte bleiben historische Vergleichswerte.

Stand: 13. November 2026. **Messung für einen unbestätigten Vorschlag, keine Anwendungserweiterung.** Die [API-Recherche](variant-filter-api-2026-11-13.md) erklärt den Datenbedarf. Der [Produktplan](../planning/search-modes.md) verbindet ihn mit dem vorgeschlagenen Bedienablauf. [Kompakte Messdaten](evidence/variant-filter-traffic-2026-11-13.json)

## Methode

Unveränderter lokaler Vite-Preview auf 127.0.0.1:4174, Pagefind 1.5.2, echter veröffentlichter Bestand mit 106 Folgen, Index `f376233a66369947c391ece1ddb3fd27ae51344ffdf4b784bef6ef7024c02d3d`. Pro Begriff wurde eine frische Chromium-Instanzumgebung mit leerem Suchtext geöffnet. Danach wurde die native Engine ohne versteckte Erweiterungsanfragen initialisiert. Nach Ende einer Phase wurden alle beobachteten Response-Body-Längen abgewartet und addiert.

Phasen:

1. **Counts:** Engine, WASM, Metadaten/Indexteile und native Rohresultate. Kein `result.data()`, kein Originaltranskript.
2. **Top10:** Alle zehn nach Rohhäufigkeit/Datum/ID führenden Ergebnisse als Fragment plus Original-JSON laden. Das ist eine bewusste Vergleichsphase: Die echte Anwendung lädt zunächst nur sichtbare Karten und daher nicht sofort alle zehn Texte.
3. **Übrige Fragmente:** `data()` auch für alle restlichen Trefferfolgen laden, ohne deren Original-JSONs. Aus Whitespace-Token und nativer Position werden die Formen wie im bestehenden Leser bestimmt. Die Variantenliste zählt verschiedene Positionen je Stichwort und Folge.

Die Werte sind **Dateibody-Bytes**, ohne HTTP-Header, App-Shell und außerhalb des Suchordners liegende Podcastmetadaten. Die lokalen JSON-Antworten waren nicht HTTP-komprimiert. Pagefind-Fragmentdateien sind bereits intern gzip-komprimiert. Es handelt sich nicht um eine gemessene kalte GitHub-Pages-Auslieferung und nicht um eine Mobil-Latenzmessung.

## Tatsächliche native Abrufe

Dezimale MB = 1.000.000 Byte. Die Spalte vollständige Fragmente umfasst die Top10-Fragmente und alle übrigen passenden Fragmente; sie wird nicht noch einmal um die Top10-Fragmentspalte erhöht.

| Eingabe | Trefferfolgen | Tatsächliche Formen | Counts-Dateien | Vollständige Fragmente für globale Formenliste | Davon zusätzliche Fragmente nach Öffnen aller Top10 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Tisch | 53 | 20 | 0,203 MB | 2,756 MB | 2,278 MB |
| Wort | 99 | 45 | 0,196 MB | 4,895 MB | 4,341 MB |
| kommen | 106 | 77 | 0,212 MB | 5,201 MB | 4,527 MB |
| Ei | 106 | 100 | 0,221 MB | 5,201 MB | 4,500 MB |

Die gesondert für alle zehn Vergleichskarten geladenen Original-JSONs umfassen je nach Begriff 0,684 bis 0,991 MB unkomprimiert. Diese Kartenbytes sind **kein zusätzlicher Vollarchivbedarf** der Formenliste; sie gehören zum vorhandenen Leser. Ohne neue Zusatzdatei genügt für die globale Formenliste das vollständige Pagefind-Fragment jedes Treffers, da es den verarbeiteten ganzen Text enthält. Alle gespeicherten Original-JSONs zusätzlich herunterzuladen wäre nicht erforderlich.

Für Tisch wurden tatsächlich unter anderem Tisch (80), Tische (6), Tischtennis (4), Tischtennisball (3) und Tischtennisschläger (3) gefunden. Die Zahlen beziehen sich auf die nativen getroffenen Positionen dieser frischen Anfrage. Sie sind keine Stamm-/Lemma-Gesamthäufigkeiten außerhalb dieser Menge.

## Kompakte Positionszuordnung als Dateigrößen-Prototyp

Buildseitig wurden sämtliche vorhandenen pf_fragment-Dateien gelesen, intern entpackt und ihre nativen Whitespace-Positionen einem Vokabular zugeordnet. Normalisierung: Außenzeichen entfernen, NFC, deutsche Kleinschreibung; innere Zeichen/Bindestriche/Schrägstriche zunächst wie im aktuellen Leser erhalten. IDs werden nach Gesamthäufigkeit vergeben. Die ursprünglichen Episoden-JSONs, Indexdateien und Abhängigkeiten bleiben unverändert; nur ignorierte Cache-Proben wurden erzeugt.

- 1.184.373 native Positionen, 55.452 Formen; bei allen 106 Dokumenten stimmte die Positionslänge mit `word_count` überein.
- Vokabular als JSON: 698.875 Byte; offline gzip: 233.406 Byte.
- Eine JSON-ID-Liste je Folge: zusammen 4.098.826 Byte; je Datei offline gzip zusammen 1.675.230 Byte.
- **Vokabular plus alle JSON-Positionslisten: 4.797.701 Byte roh / 1.908.636 Byte gzip**, rund 4,80 beziehungsweise 1,91 MB.
- Optionale Varint-Kodierung statt JSON: inklusive desselben Vokabulars rund 1,70 MB gzip. Sie spart hier nur etwa 0,21 MB gegenüber komprimierten JSON-Listen und ist zunächst kein notwendiger Zusatzumfang.

Die Kodierungsprobe enthält noch keine endgültige Publikationshülle, Zuordnungsmetadaten, Anzeigenamen oder Browserintegration. Eine garantierte Übertragung der gzip-Größe setzt eine konkret geprüfte komprimierte Auslieferung voraus; ansonsten gilt die größere rohe Dateigröße. Aufteilung in Pakete, Cachepolitik und Unterstützung der gewählten Dekompression müssen im Produktionspfad nachgewiesen werden. Die Liste kann beispielsweise zunächst vollständig oder in wenigen Paketen geladen werden; die je-Episode-Komprimierung dieser Messung ist noch kein beschlossener Vertrag von 106 Einzelrequests.

Diese Karte aus IDs statt Texten reicht konzeptionell, um native Standard-Trefferpositionen nach ihrer tatsächlichen Schreibweise zu gruppieren und auszuschließen. Sie ist keine Wortzeitstempelliste. Für genaue Wortgrenzen innerhalb eines Whitespace-Tokens oder mehrere Komponenten je Position wäre die derzeitige Ein-ID-Probe zu erweitern; die Größenprobe deckt das noch nicht ab. Vorhandene Leser dürfen zunächst weiterhin ihre sichtbaren Pagefind-Fragmente und Original-JSONs laden.

## Cache und Skalierung

Eine geladene Positionszuordnung kann für alle Suchbegriffe und Ausschlüsse desselben Podcasts/Publikationsstands wiederverwendet werden. Das Umstellen der Ausschlüsse braucht dann keine neuen Textabrufe zur Rangberechnung. Nur neu sichtbar werdende Karten benötigen ihre noch nicht gecachten Detaildateien. Ein neuer Publikationsstand braucht eine passende neue Zuordnung; das konkrete Cachebudget ist vor Implementierung festzulegen.

Für 600 echte Folgen liegt noch kein Messnachweis vor. Ein rein lineares Vergleichsszenario bei gleicher durchschnittlicher Folgenlänge ergibt rund 29,4 MB Pagefind-Fragmente beziehungsweise 10,8 MB gzip für die gesamte JSON-Positionszuordnung. Das ist **keine Prognose oder Zusage**: Vokabular wächst nicht proportional, Kodierung und Paketierung verändern sich, und Anfragen können nur einen Teil der Folgen treffen. Es zeigt aber, weshalb die vollständige Formenliste nicht unbemerkt alle Texte beim normalen Einstieg laden sollte. Default-Standardzählung kann zuerst wie bisher starten; Zusatzdaten werden nur für geöffnete Optionen beziehungsweise aktiv benötigte Filter/Modi geladen.

Die frühere 0,55-MB-Probe von [Wortliste plus Zählpaaren](search-modes-2026-11-12.md) beantwortet eine andere Frage. Sie enthält keine Positionsidentität und erhält daher nicht automatisch beliebige native Pagefind-Standard-Treffermengen. Für die jetzt ausdrücklich gewünschte native Standardsemantik ist die größere Zusatzzuordnung ein begründeter anderer Entwurf. Alternativ könnte man den ganzen Matcher austauschen; das ist hier nicht vorgeschlagen.

## Offene Nachweise

Keine Produktions-Modi oder Filter implementiert. Vor einer Umsetzung sind Exakt-Wortgrenzen, Extended-Kandidatenregel, Ausschlussdauer, konsistente Zähl-/Highlightidentität und Datenschema festzulegen. Für die gewählte Positionszuordnung müssen Rundlauf/Identität, kalte und warme Übertragung, UI-Reaktionszeit und Browser-Arbeitsspeicher gemessen werden; insbesondere die naive Ein-ID-Whitespace-Probe ist kein vollständiger Suchvertrag.
