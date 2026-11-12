# Pagefind-Freitextsuche und helle vertikale Minimap

Status: claimed
Blocked by: none

Am 10. November 2026 vom Nutzer zur Umsetzung beauftragt. Grundlage ist der [Plan](../../docs/planning/pagefind-and-minimap.md) samt [API-Nachweis](../../docs/research/pagefind-counting-2026-11-10.md). Integration auf `feature/pagefind-minimap`; Tests lokal, kein automatisches Merge/Deployment.

## Anforderungen

- Pagefind 1.5.2 als einzige aktive Such-/Zählquelle; unabhängige Einzelwortabfragen, alle Rohresultate vor Seitenauswahl zählen. Diagrammsummen sind Suchwort-/Positionspaare; Leser navigiert eindeutige Textstellen.
- Eingabe bis zehn verschiedener Begriffe, Freitext ohne Dropdown oder Pflichtchips. Startdemo `Die Podcast Wort Suche`; bearbeitete Eingaben beim Podcastwechsel übernehmen. Alle eingegebenen Wörter durchsuchen, keine aktiven Stopp-/Zusatzlisten; Grenzhinweis erst beim Überschreiten von zehn Begriffen.
- Top 10 nach Gesamtsumme, Alle chronologisch mit Nullfolgen. Dieselben Positionen liefern Einzelwerte, Markierungen und Minimap. Zahlenfehler nicht als Null ausgeben.
- Direkt offene vollständige Transkriptkarten mit integrierten Folgeninfos, Start bei der frühesten chronologischen Fundstelle aller Suchwörter und heller, auch mobil vertikaler Minimap. Tastatur-/Touchnavigation, Headerstart ab 0:00 und schließbarer gemeinsamer Player an groben Textabschnittsanfängen. Diagramme ohne horizontales Scrollen. Keine neuen Zeitstempel oder Audioabrufe im Verarbeitungsschritt.
- Pipeline/Veröffentlichung ohne spaCy, Analysen, Vokabular und Zählshards; validierte Episodentranskripte plus Metadaten genügen. Identität, Datenstandsbindung, vorhandene 106 Transkripte, Laufzeiten, mehrere Podcasts, bestehende Links und Pages bleiben erhalten.
- Kleine echte Engine-Prüffälle, vollständige lokale Prüfungen, realer 106er-Build mit Suchstichproben und Mobile-/Projektpfadprüfung. Suchqualität technisch belegen; eine unabhängige menschliche Qualitätsprüfung nicht behaupten.

## Tickets

1. [Suchvertrag und globale Trefferzählung](issues/01-pagefind-counts.md)
2. [Pipeline und Veröffentlichungsformat ohne NLP](issues/02-publication-without-nlp.md)
3. [Freitext und heller Transkriptleser](issues/03-free-text-minimap.md)
4. [Integration, Aufräumen und Abnahme](issues/04-validation-cleanup.md)
5. [Direkt offene Transkriptkarten und kompakte Diagramme](issues/05-open-transcript-cards.md)
6. [Kompakte Karten und ungefilterte Zehnwortsuche](issues/06-compact-cards-unfiltered-search.md)
7. [Früheste Fundstelle und ruhiger Transkriptleser](issues/07-earliest-hit-reader-polish.md)
8. [Hell/Dunkel, Diagrammschalter und FAQ](issues/08-themes-sliding-toggle-faq.md)

## Comments

- 2026-11-10: Nutzer hat Plan und Umsetzung bestätigt. Die dokumentierte Präfix-/Grundformabweichung gehört zur neuen Suchsemantik. Keine Neutranskription erforderlich.

- Umsetzung und Integration: `309441f`. Alle vier Tickets erfüllt. [Abnahme und Messgrenzen](../../docs/pilot/pagefind-minimap.md); Originaltranskripte unverändert, keine neue ASR und kein Main-Merge.

## Bestätigte Verfeinerung

Das [fünfte Ticket](issues/05-open-transcript-cards.md) ersetzt Kurzvorschau/optionalen Einzelleser durch direkt offene Karten mit integrierten Angaben und Start-Abspielknopf. Minimap ohne zusätzliche rechte Farbspuren oder Labels, schließbarer Player und Diagramme ohne horizontales Scrollen.

- 2026-11-10: Verfeinerung in `406aa04` auf `feature/pagefind-minimap` integriert. Alle fünf Tickets erfüllt; [Abnahme der offenen Transkriptkarten](../../docs/pilot/open-transcript-cards.md) mit 74 Python-/120 Browserprüfungen und realem 106er-Bestand.

- 2026-11-11: In `d4b7994` auf `feature/pagefind-minimap` integriert. Alle sechs Tickets erfüllt. [Prüfnachweise und Grenzen](../../docs/pilot/compact-cards-unfiltered-search.md); 74 Python-/122 Browserfälle plus elf ergänzende Projektpfadfälle bestanden.


Der [weitere UI-Auftrag](issues/07-earliest-hit-reader-polish.md) bestätigt den Sprung zur frühesten Fundstelle über alle Wörter, Rand-Fades, nochmals 15 Prozent weniger Texthöhe, weiße Minimap, kompaktere Abstände, Website-/Quellenlinks und Racoo-Favicon. Laufzeit-/Datendiagnosen entfallen ausschließlich aus der öffentlichen Oberfläche.

- 2026-11-12: In `47d8373` auf `feature/pagefind-minimap` integriert. Alle sieben Tickets erfüllt. [Abnahme](../../docs/pilot/earliest-hit-reader-polish.md) mit 74 Python-/128 Browserprüfungen und realem 106er-Bestand.


Der [achte Auftrag](issues/08-themes-sliding-toggle-faq.md) ergänzt Hell-/Dunkelmodus, einen gleitenden Kapselschalter für Top10/Alle und eine kompakte FAQ. Auf der Podcastseite steht das Logo 10 Pixel weiter rechts und der Kopfbereich hat 20 Pixel mehr Abstand zu den Podcastinfos. Suchsemantik und Daten bleiben unverändert.

- 2026-11-12: In `6e7afe2` auf `feature/pagefind-minimap` integriert. Alle acht Tickets erfüllt. [Abnahme](../../docs/pilot/themes-sliding-toggle-faq.md) mit 74 Python-/136 Browserprüfungen und echtem 106er-Bestand.


Der [neunte Auftrag](issues/09-landing-alignment-default-query.md) verschiebt den Startseiten-Modusschalter neben die Suche, vereinheitlicht Podcast-/FAQ-Kartenbreiten, vergrößert die Fades und verwendet Eimer als normale UFO-Einstiegssuche. Suchlinks und bewusst leere Eingaben bleiben erhalten.
