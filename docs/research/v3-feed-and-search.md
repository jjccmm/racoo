# V3: Öffentlicher Feed und statische Stichwortsuche

Stand: 16. Oktober 2026. Recherchenotiz für die Planung; keine Appimplementierung.

## Festgelegte Ausgangslage

Zunächst nur DAS PODCAST UFO. Alle aktuell öffentlich verfügbaren Folgen werden mit Parakeet-TDT-0.6B-v3 neu transkribiert, lokal oder in einem manuell gestarteten kostenlosen Colab-Notebook. Alte Transkripte, Wortzählungen und Datenbankschemata werden nicht migriert. Die öffentliche Webseite benötigt keine laufende Transkriptions-API.

## Feed: live geprüft und verbleibende Grenzen

Die [offizielle Webseite](https://www.daspodcastufo.com/) bettet den Acast-Player der Show-ID `0301869f-de1f-4fac-97f9-ed5bf6faab23` ein. Im live abgerufenen HTML der [Acast-Seite des Podcasts](https://shows.acast.com/podcast-ufo) zeigen sowohl `rel="alternate"` mit Typ `application/rss+xml` als auch der RSS-Button auf `https://feeds.acast.com/public/shows/podcast-ufo`. **Diese vorhandene Slug-URL als Standard beibehalten.** Die direkte Publisherquelle ist der sinnvolle Ausgangspunkt; ein fremder Feed-Aggregator ist dafür nicht erforderlich.

Die folgenden Befunde stammen aus direkten PowerShell-HTTP-GETs des Root-Agenten und namespace-sicherer Auswertung des RSS-XML am 16.10.2026, nicht aus Suchtreffervorschauen:

- Der [Feed mit Show-ID](https://feeds.acast.com/public/shows/0301869f-de1f-4fac-97f9-ed5bf6faab23) und der [Feed mit Podcast-Slug](https://feeds.acast.com/public/shows/podcast-ufo) liefern jeweils HTTP 200 und **537 Items**. Die GUID-/Enclosure-Paare sind identisch.
- [rss.acast.com/podcast-ufo](https://rss.acast.com/podcast-ufo) leitet auf die Feed-URL mit Show-ID weiter. Die UUID-URL ist ein gleichwertiger Alias, keine nachgewiesene Verbesserung gegenüber dem vom Publisher verlinkten Slug. HTTP-Weiterleitungen beim Abruf weiterhin zulassen.
- Neuester Eintrag ist `UFO537 Festival` vom 10.10.2026, ältester `UFO001 Prolog`. Alle Items haben eine GUID und eine Audio-Enclosure; es wurden keine doppelten GUIDs oder Audio-URLs gefunden. Die MP3s wurden für diese Prüfung nicht abgerufen.
- 535 Titel enthalten eine `UFO`-Folgennummer. Die beiden übrigen Titel sind `UFO Experiment (KI-generiert)` und `UGO081 Freestyle Karate`. Letzterer enthält einen abweichenden Präfix; Folge 81 fehlt deshalb nicht tatsächlich.
- **Folge 37 fehlt im aktuellen Feed.** Eine aktuelle offizielle Episodenseite oder Audioquelle dafür wurde nicht nachgewiesen. Es liegt hier kein verifizierter offizieller Grund für die Abwesenheit vor. Fehlgeschlagene Abrufe möglicher Acast-Slugs sind kein Beweis für einen bestimmten HTTP-Status oder eine Löschungsursache.

Zusätzliche Metadatenprüfung für Folge 37: Im historischen lokalen Folgenkatalog steht eine öffentliche Wayback-URL zum früheren `ufo37_fertig.mp3`. Der Root-Agent prüfte nur HTTP-HEAD: Die ursprüngliche [Publisher-Audioadresse](https://podcast-ufo.fail/wp-content/uploads/ufo37_fertig.mp3) scheiterte hier an der TLS-Vertrauenskette; ein HTTP 404 ist damit nicht belegt. Die [Wayback-Adresse](https://web.archive.org/web/20201113201409/https://podcast-ufo.fail/wp-content/uploads/ufo37_fertig.mp3) lieferte nach Weiterleitung auf den Snapshot `20200616130443` HTTP 200 mit `Content-Type: text/html`. Damit ist nur eine Archiv-Wiedergabeseite nachgewiesen, kein abspielbarer MP3-Download. Es wurden keine MP3-Inhalte geladen.

Konsequenz für den Plan: Ziel bleibt das **vollständige verfügbare Archiv** mit vollständig neuen Transkripten. Der öffentliche Publisherfeed ist der Ausgangspunkt; zusätzliche einzeln geprüfte Audioquellen können fehlende Folgen ergänzen. Den Startbestand mit Datum und GUID-Liste festhalten und Nummernlücken sichtbar dokumentieren. Für Folge 37 ist eine abrufbare Audioquelle noch zu verifizieren. Nicht verfügbare Folgen bleiben ausdrücklich offene Quellenlücken; bis zu ihrer Klärung darf das Archiv nicht als vollständig bezeichnet werden. GUIDs zur Zuordnung verwenden; Titel und Folgennummern sind Anzeige-/Metadaten, keine verlässlichen Primärschlüssel. Eine Feed-Enclosure wurde hier nicht als inhaltlich korrekte Audiodatei validiert.

## Suche: belegte Pagefind-Fähigkeiten

[Pagefind unterstützt deutsches Stemming](https://pagefind.app/docs/multilingual/). Index und Oberfläche sollen `lang="de"` verwenden. Stemming erweitert Wortformen, ist aber keine automatische Synonym- oder Bedeutungssuche; semantische Paraphrasen benötigen eine zusätzliche, hier nicht vorgesehene Lösung.

Die [JavaScript-API](https://pagefind.app/docs/api/) arbeitet vollständig mit statisch ausgelieferten Indexdateien. Initialisierung kann beim Fokus auf das Suchfeld erfolgen. Eine Suche liefert zunächst Ergebnis-IDs; vollständige Ergebnisdaten werden mit `.data()` separat geladen. Dadurch muss die Startseite nicht alle Transkripte laden.

Die [Node-API](https://pagefind.app/docs/node-api/) kann pro Folge ein virtuelles HTML-Dokument indexieren und dessen Ergebnis-URL explizit setzen. Echte HTML-Folgenseiten sind dafür nicht erforderlich. Transkriptsegmente erhalten IDs mit ihrer Startzeit; [Anker und Wortpositionen](https://pagefind.app/docs/sub-results/) erlauben eigene Fundstellen mit Audiosprung. Automatische Subresults teilen nur an Überschriften; normale Segmentabsätze benötigen eigene Ergebnisdarstellung.

## Vorgeschlagene App-Logik

Die folgende Rangfolge ist eine Entscheidung für die App, keine native Pagefind-Funktion:

1. Jedes unterschiedliche eingegebene Stichwort separat suchen und die gefundenen Folgen vereinigen. Die Wortreihenfolge der Anfrage ist unerheblich.
2. Global nach Anzahl verschiedener getroffener Stichwörter gruppieren: bei drei Begriffen zuerst 3/3, danach 2/3, danach 1/3. Wiederholungen desselben Begriffs erhöhen die Abdeckung nicht.
3. Pagefind-Treffer einschließlich Stemming beibehalten. **Keinen nachträglichen Vergleich mit der exakten eingegebenen Wortform für die normale Stichwortsuche anwenden**; er würde gültige Flexionsformen wieder entfernen.
4. Nähe und beste Passage zunächst nur innerhalb einer geöffneten beziehungsweise bereits geladenen Folge aus den Trefferpositionen bestimmen. Keine globale Nähe-Sortierung versprechen: Dafür müssten auch die Positionsdaten aller anderen Kandidaten geladen werden. Die globale Abdeckung lässt sich dagegen bereits aus den Ergebnis-ID-Listen berechnen.

Wortstatistiken werden unabhängig aus den Transkripten vorbereitet; Suchergebniszahlen sind keine exakten Wortzählungen. Phrasensuche bleibt optional. Falls sie später hinzukommt: Im geprüften [Pagefind-Release v1.5.2](https://github.com/Pagefind/pagefind/blob/v1.5.2/pagefind_web/src/search.rs) stemmt auch der Phrasenpfad und liefert nur die erste zusammenhängende Phrase pro Dokument. Eine Funktion „alle exakten Phrasenfundstellen“ braucht daher eine gesonderte Prüfung.

## Kleine Abnahmeprüfung vor dem Vollaufbau

- Feedbestand: 537 GUIDs am Prüfdatum reproduzieren; Folge 37 und den Titel `UGO081` korrekt behandeln, Sonderfolgen erhalten.
- Suche: Drei Begriffe in beliebiger Reihenfolge, 3/3 vor 2/3 vor 1/3, Wortformen per deutschem Stemming und mehrere Vorkommen innerhalb einer Folge prüfen.
- Fundstellen über Segmentgrenzen sowie Audio-Sprungziele mit echten Transkripten prüfen; HTTP-Erreichbarkeit allein belegt keine richtige Audiostelle.
- Bei vollständigem Korpus auf einem Mobilgerät Erstsuche, nachgeladene Bytes und Folgenöffnung messen. Keine globale Neusortierung erzwingen, die das Gesamtarchiv nachlädt.
