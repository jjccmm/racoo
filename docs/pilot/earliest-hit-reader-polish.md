# Früheste Fundstelle und ruhiger Transkriptleser

Stand: 12. November 2026. [Ticket 07](../../.scratch/pagefind-minimap/issues/07-earliest-hit-reader-polish.md) ist auf `feature/pagefind-minimap` umgesetzt und lokal abgenommen.

## Ursache und Korrektur

Die bisherige Startwahl priorisierte die Reihenfolge der eingegebenen Wörter. Bei UFO070 blieb nach `kratzeis` → `kratzeis urlaub` deshalb Kratzeis aktiv, obwohl Urlaub früher im Text stand. Der echte Browser-Repro schlug vor der Korrektur fehl: aktive Stelle Kratzeis, früheste DOM-Fundstelle Urlaub, Originaltranskript-Abrufe vorher/nachher jeweils eins.

Die Änderung einer einzigen Auswahlregel auf die erste chronologisch sortierte Fundstelle ließ denselben Repro bestehen: Urlaub aktiv, weiterhin nur ein Originalabruf. Cache und neue Trefferpositionen waren korrekt. Jede bestätigte Suche erzeugt bereits durch ihren bestehenden Suchlauf-Schlüssel eine neue Karteninstanz; ein separater Cache-Reset oder erneuter Download ist nicht nötig. Die frühere Anforderung „erstes passendes Eingabewort“ ist durch „früheste Textstelle über alle Suchwörter“ ersetzt. Ein Browser-Regressionsfall mit kleinem echtem Pagefind-Index und derselben gecachten Folge sichert die Erweiterung ab; Fokus bleibt auf der Suche.

## Oberfläche

- 22-Pixel-Fades maskieren ausschließlich überlaufende obere/untere Textränder. Am tatsächlichen Textanfang beziehungsweise -ende entfällt der jeweilige Fade; Scrollen und Größenänderungen aktualisieren die Kanten ohne React-Neurendern pro Scrollereignis. Text, Auswahl und Zeitknöpfe bleiben echte DOM-Inhalte.
- Minimap und Karte haben weißen Hintergrund. Die Fensterhöhe sinkt um weitere 15 Prozent von `clamp(280px, 50dvh, 512px)` auf `clamp(238px, 42.5dvh, 435.2px)`. Zählungen und Wortlegende rücken zusammen.
- Derselbe leichte Schatten liegt auf Transkriptkarten, Diagramm und Podcastauswahl. Vor/nach dem Suchfeld sind die Abstände kompakter. Der sichtbare Waschbär steht bündig zum Podcastcover; transparente Ränder des unveränderten Logos werden dabei berücksichtigt.
- Datenbestand-, Laufzeit- und Veröffentlichungsdiagnosen entfallen aus der öffentlichen Seite. Der kleine Footer lautet „Inhalte: DAS PODCAST UFO · Maschinelle Transkripte können Fehler enthalten.“ und verwendet den jeweiligen Podcastnamen. Das ist eine Quellenangabe ohne Aussage über eine erteilte Lizenz. Laufzeiten bleiben in den gespeicherten Daten und lokalen Logs/Berichten.
- Optionales `website_url` in der Podcastkonfiguration wird als `websiteUrl` veröffentlicht und als Link neben den Sprechern sowie beim Podcastnamen im Footer verwendet. Für DAS PODCAST UFO ist die [offizielle Webseite](https://www.daspodcastufo.com/) hinterlegt. Beide Vertragsgrenzen akzeptieren ausschließlich HTTP-/HTTPS-Adressen. Konfigurierte andere Podcasts zeigen ihre eigenen Angaben.
- Das Tab-Icon verwendet einen quadratischen SVG-Ausschnitt des unveränderten bereitgestellten PNG-Logos mit dem Waschbären auf heller Fläche. Keine externen Bildabrufe oder Neuzeichnung. Der Link funktioniert auch unter `/racoo/`.

## Prüfungen und Grenzen

`uv run --frozen python scripts/check.py` bestand vollständig: Lint/Format, Links, TypeScript, Builds, **74 Python-Tests und 128 ausgeführte Chromium-Fälle**. Je 60 Browserfälle am Root- und Projektpfad sowie je vier Fälle mit konfigurierten Podcasts. Die vier konfigurierten Fälle sind im gewöhnlichen Lauf übersprungen und werden anschließend separat ausgeführt. Abgedeckt sind unter anderem gecachte Anfrageerweiterung, früheste Stelle/Fokus, Scroll-/Resize-Fades, White-Minimap, dynamische Quellen-/Websitelinks und Favicon.

Danach normaler Build mit **106 echten Folgen**, unveränderten Episoden-/Katalogdaten und Pagefind-Index `f376233a6636…`; Artefakt **17.874.186 Byte**. Keine neue Transkription und kein Feedimport. Der größere Umfang enthält vor allem das zusätzliche SVG mit eingebettetem Original-Logo; der gespeicherte Feedstand bleibt 8.11.2026.

Der echte Cache-Repro besteht auch mit allen UI-Änderungen. [Repro und Layoutwerte](evidence/reader-polish-layout.json) dokumentieren bei 1280, 390 und 320 Pixeln weiße Minimap, identische Schatten, 359 Pixel gerundete Textfensterhöhe bei 844 Pixel Viewport, 16 Pixel Abstand zum Diagramm und keinen Seitenüberlauf. Die sichtbare Logo-Ausrichtung weicht um weniger als 0,3 Pixel vom Coverrand ab. Desktop-/Mobilkarten, Kopfbereich, Startseite und das tatsächlich dekodierte Favicon wurden anhand von Screenshots visuell geprüft; Scrollanfang/-ende prüfen beide Fade-Zustände.

`node scripts/check_real_site.cjs http://127.0.0.1:4174/ docs/pilot/evidence/reader-polish-root.json` bestand: zehn bekannte Referenzsuchen finden ihre erwartete Folge auf Rang 1, Alle enthält 106 Folgen ohne horizontalen Überlauf. [Such-/Mobilbefunde](evidence/reader-polish-root.json) enthalten 4.231 ms kalt / 710 ms warm bis zum ersten offenen Text, 990.177 beobachtete Antwortkörper-Byte bis dahin und keine zusätzlichen bei der warmen Wiederholung. Das bekannte CDP-Profil ist 390×844, DPR 2, Touch, CPU 4×, RTT 150 ms, 200.000 Byte/s Download und HTTP-Cache aus. Diese Messung umfasst die beobachteten Anfragen dieser Suchfolge, nicht jede Browser-/Favicon-Nachladung. Sie ist keine Garantie für physische Mobilgeräte, das Internet oder einen echten 600-Folgen-Bestand. Die technischen Suchfälle ersetzen keine unabhängige menschliche Qualitätsbewertung.

Die Vorschau unter `http://127.0.0.1:4174/` zeigt den echten Bestand. Kein Main-Merge und kein öffentliches Deployment als Teil dieser Arbeit.
