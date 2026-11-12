# Hell/Dunkel, gleitender Diagrammschalter und FAQ

Stand: 12. November 2026. [Ticket 08](../../.scratch/pagefind-minimap/issues/08-themes-sliding-toggle-faq.md) ist auf `feature/pagefind-minimap` umgesetzt.

## Verhalten

Das Racoo-Logo auf der Podcastseite steht gegenüber der vorigen Version zehn Pixel weiter rechts. Zwischen Kopfzeile und Podcastinfos liegen zwanzig zusätzliche Pixel. Auf schmalen Mobilansichten bleibt die Rücknavigation als beschrifteter Pfeil zugänglich, damit sie neben dem Modusschalter Platz findet.

Der Sonnen-/Mondschalter wechselt die gesamte Seite zwischen Hell und Dunkel. Ohne gespeicherte Auswahl gilt beim ersten Seitenaufruf die Systemeinstellung. Eine manuelle Wahl wird unter `racoo-theme` im lokalen Browserspeicher gehalten. Das kleine Startskript im HTML wendet sie vor dem Seitenaufbau an. Gesperrter Speicher verhindert den Wechsel nicht; die Auswahl bleibt in diesem Fall nur auf der geöffneten Seite erhalten. Es gibt keine neue Bibliothek oder serverseitigen Einstellungen.

Flächen, Texte, Logo, Eingaben, Buttons, Wortfarben, Diagramm, Canvas-Minimap und nativer Player passen sich an. Das bereitgestellte Logo wird im Dunkelmodus durch CSS hell dargestellt; die Bilddatei bleibt unverändert. Balken, Farbpunkte und Minimap verwenden denselben zur Fläche passenden Farbton. Der Themewechsel behält Anfrage, markierte Fundstelle und Textposition bei.

Top10/Alle ist eine Kapsel mit gleitender Auswahl. Native Schaltflächen behalten ihre Zustände und Tastaturbedienung; reduzierte Bewegung deaktiviert die Animation. Der Diagrammuntertitel „Absolute Anzahl der passenden Textpositionen je Suchwort“ entfällt. Sortierung, Zahlen und chronologische Nullfolgen bleiben unverändert.

Unter der Podcastliste steht eine zunächst geschlossene native FAQ-Klappe. Sie öffnet sechs kurze Antworten zu Motivation, Unabhängigkeit, maschinellen Texten, groben Audiomarken, fehlenden neuen Folgen und der Namensherkunft aus der Folge „Waschbär“. Die Werbeabweichung von etwa ±2 Minuten ist als zusätzliche grobe Orientierung formuliert, ohne eine Genauigkeitsgarantie für die ohnehin groben Sprungpunkte zu behaupten.

## Lokale Abnahme

- Vollständiger `uv run --frozen python scripts/check.py` bestanden: Lint/Format, Links, TypeScript, Builds, **74 Python-Tests und 136 ausgeführte Chromium-Fälle**. Je 64 Fälle am Root-/Projektpfad und je vier Fälle für konfigurierte Podcasts. Die vier konfigurierten Fälle werden in den gewöhnlichen Durchläufen übersprungen und anschließend separat ausgeführt.
- Die Browserfälle sichern Systemvorgabe, manuelle Auswahl über Neuladen/Navigation, gesperrten Speicher, Umzeichnung der geladenen Minimap ohne Such-/Scrollverlust, FAQ per Tastatur und die tatsächliche Bewegung der Diagrammkapsel neben der weiterhin korrekten Alle-Reihe ab.
- Anschließend normaler Build mit **106 echten Folgen**, unveränderten Episoden-/Katalogdaten, Index `f376233a6636…` und Veröffentlichung `939d88ce3706…`. Artefakt **17.880.909 Byte**. Keine ASR, kein Feedimport und keine neuen Abhängigkeiten; Feedstand bleibt 8.11.2026.
- Beide Themen bei 1280, 390 und 320 Pixeln am echten Bestand geprüft: kein horizontaler Überlauf, zusammenpassende Karten-/Minimapflächen, 20 Pixel Kopfabstand. Die Logo-Bitmap steht zehn Pixel weiter rechts als im [vorigen Bericht](earliest-hit-reader-polish.md). Gemessene Kontraste des normalen Lesertexts auf seiner Fläche sind 16,24:1 hell / 13,24:1 dunkel. Das ist eine konkrete Stichprobe, keine vollständige Barrierefreiheitszertifizierung. [Layoutwerte](evidence/themes-faq-layout.json)
- Podcastkopf, dunkler Leser, dunkle Startseite, geöffnete FAQ sowie dunkler nativer Player zusätzlich anhand von Screenshots visuell geprüft. Die Playerprüfung verwendet kontrolliertes Testaudio, schließt erfolgreich und bewertet keine Live-Audioqualität.
- `node scripts/check_real_site.cjs http://127.0.0.1:4174/ docs/pilot/evidence/themes-faq-root.json` bestanden: alle zehn Referenzsuchen finden ihre erwartete Folge auf Rang 1; Alle enthält 106 Folgen mit passenden Achsentiteln. [Such-/Mobilmessung](evidence/themes-faq-root.json)

Im bisherigen emulierten Mobilprofil erschien der erste offene Originaltext nach **4.176 ms kalt / 667 ms warm**; 992.005 beobachtete Antwortkörper-Byte bis dahin und keine weiteren bei der Wiederholung. Profil: 390×844, DPR 2, Touch, CPU 4×, RTT 150 ms, 200.000 Byte/s Download und HTTP-Cache aus. Die Messung gilt für die beobachteten Anfragen dieser Suchfolge, nicht jede Browser-/Favicon-Nachladung. Sie ist keine Garantie für echte Mobilgeräte, das Internet oder einen echten 600-Folgen-Bestand. Technische Referenzsuchen ersetzen keine unabhängige menschliche Qualitätsbewertung.

Die lokale Vorschau unter `http://127.0.0.1:4174/` zeigt den echten Bestand. Kein Main-Merge und kein öffentliches Deployment im Rahmen dieser Änderung.
