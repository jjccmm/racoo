# Pagefind-Freitextsuche und helle vertikale Minimap

Status: claimed
Blocked by: none

Am 10. November 2026 vom Nutzer zur Umsetzung beauftragt. Grundlage ist der [Plan](../../docs/planning/pagefind-and-minimap.md) samt [API-Nachweis](../../docs/research/pagefind-counting-2026-11-10.md). Integration auf `feature/pagefind-minimap`; Tests lokal, kein automatisches Merge/Deployment.

## Anforderungen

- Pagefind 1.5.2 als einzige aktive Such-/Zählquelle; unabhängige Einzelwortabfragen, alle Rohresultate vor Seitenauswahl zählen. Diagrammsummen sind Suchwort-/Positionspaare; Leser navigiert eindeutige Textstellen.
- Eingabe bis fünf verschiedener wirksamer Begriffe, Freitext ohne Dropdown oder Pflichtchips. Startdemo `Die Podcast Wort Suche`; bearbeitete Eingaben beim Podcastwechsel übernehmen. Statische Stopp-/Zusatzlisten mit sichtbaren Hinweisen.
- Top 10 nach Gesamtsumme, Alle chronologisch mit Nullfolgen. Dieselben Positionen liefern Einzelwerte, Markierungen und Minimap. Zahlenfehler nicht als Null ausgeben.
- Ein aufklappbarer vollständiger Transkriptleser mit heller, auch mobil vertikaler Minimap, Tastatur-/Touchnavigation und gemeinsamem Player an groben Segmentanfängen. Keine neuen Zeitstempel oder Audioabrufe im Verarbeitungsschritt.
- Pipeline/Veröffentlichung ohne spaCy, Analysen, Vokabular und Zählshards; validierte Episodentranskripte plus Metadaten genügen. Identität, Datenstandsbindung, vorhandene 106 Transkripte, Laufzeiten, mehrere Podcasts, bestehende Links und Pages bleiben erhalten.
- Kleine echte Engine-Prüffälle, vollständige lokale Prüfungen, realer 106er-Build mit Suchstichproben und Mobile-/Projektpfadprüfung. Suchqualität technisch belegen; eine unabhängige menschliche Qualitätsprüfung nicht behaupten.

## Tickets

1. [Suchvertrag und globale Trefferzählung](issues/01-pagefind-counts.md)
2. [Pipeline und Veröffentlichungsformat ohne NLP](issues/02-publication-without-nlp.md)
3. [Freitext und heller Transkriptleser](issues/03-free-text-minimap.md)
4. [Integration, Aufräumen und Abnahme](issues/04-validation-cleanup.md)

## Comments

- 2026-11-10: Nutzer hat Plan und Umsetzung bestätigt. Die dokumentierte Präfix-/Grundformabweichung gehört zur neuen Suchsemantik. Keine Neutranskription erforderlich.
