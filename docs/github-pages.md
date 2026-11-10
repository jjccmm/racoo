# Racoo auf GitHub Pages einrichten

Stand: 8. November 2026. Repository: <https://github.com/jjccmm/racoo>. Das bisherige `jjccmm/podcast_words_v3` wurde umbenannt; die lokale Remote-Adresse zeigt auf `https://github.com/jjccmm/racoo.git`. Der lokale Checkout heißt weiterhin `podcast_words_v3`; der Verzeichnisname ist unabhängig vom GitHub-Namen.

## Einmalige Einrichtung

1. Repository öffnen und den Zugriff für Pages klären: GitHub Free unterstützt Pages bei öffentlichen Repositories; für ein privates Repository ist ein passender Tarif wie GitHub Pro nötig. Das Repository wurde durch die Umbenennung nicht öffentlich gemacht. Falls gewünscht, Sichtbarkeit unter **Settings → General → Danger Zone → Change repository visibility** auf Public ändern. Alternativ privat lassen und Pages mit einem passenden Tarif nutzen.
2. Unter [Settings → Pages](https://github.com/jjccmm/racoo/settings/pages) bei **Build and deployment → Source** **GitHub Actions** auswählen.
3. Unter [Settings → Secrets and variables → Actions → Variables](https://github.com/jjccmm/racoo/settings/variables/actions) eine **Repository variable** anlegen: Name `PAGES_ENABLED`, Wert `true` (kleingeschrieben). Dies ist eine normale Konfigurationsvariable, kein Secret. Sie schaltet den bereits vorbereiteten Veröffentlichungsjob frei.
4. Unter [Actions → Deploy Racoo](https://github.com/jjccmm/racoo/actions/workflows/pages.yml) **Run workflow**, Branch **main**, **Run workflow** wählen.
5. Warten, bis **Build and deploy Racoo** erfolgreich ist. Der Job bzw. das Environment **github-pages** zeigt den endgültigen Website-Link. Ohne eigene Domain lautet die erwartete Adresse <https://jjccmm.github.io/racoo/>. Das ist bis zum ersten erfolgreichen Deployment eine Zieladresse, kein Nachweis einer laufenden Website.

Danach veröffentlichen weitere Pushes auf `main` automatisch. Der Veröffentlichungsworkflow baut die Webseite und prüft ihre Veröffentlichungsdaten; er startet keine Python- oder Browser-Tests und wartet nicht auf Testworkflows. Bei fehlgeschlagenem Build oder ungültigen Veröffentlichungsdaten wird nicht veröffentlicht. Tests laufen lokal während der Entwicklung; vor einem Push auf `main` die passenden Prüfungen ausführen. `PAGES_ENABLED` entfernen oder auf `false` setzen stoppt zukünftige Veröffentlichungsjobs, entfernt aber keine bereits veröffentlichte Website.

## Lokal prüfen, auf GitHub veröffentlichen

GitHub Actions enthält ausschließlich den Workflow **Deploy Racoo**. Er läuft bei Pushes auf `main` oder manuell auf `main`, sofern `PAGES_ENABLED=true` gesetzt ist. Pull Requests starten keinen Workflow. Python- und Browser-Tests laufen lokal während der Entwicklung; vor einem Push die zur Änderung passenden Prüfungen ausführen. Der vollständige lokale Check ist in der [Entwicklungsanleitung](development.md) beschrieben.

## Was der Workflow veröffentlicht

Der [Veröffentlichungsworkflow](../.github/workflows/pages.yml) baut aus den gespeicherten echten Transkripten, ohne Audio oder Modelle zu laden. Der aktuelle Bestand enthält 106 Folgen. Die [Podcastkonfiguration und lokale Aktualisierung](updates.md) bestimmen die gespeicherten Daten; der Build veröffentlicht automatisch alle vollständigen Katalogfolgen je konfiguriertem Podcast. Die lokalen Routineprüfungen verwenden synthetische Fixtures. Der Veröffentlichungsworkflow arbeitet in einem frischen Checkout und baut die echte Auswahl. Ein zusätzlicher Check verlangt die Zusammenfassung des konfigurierten Builds (`schemaVersion: 2`, `state: published-corpus`) mit mindestens einer Folge; synthetische Einzel-Korpus-Builds und ein leerer Gesamtbestand werden abgelehnt. Nur `web/dist` wird als Pages-Artefakt hochgeladen.

Der Basis-Pfad kommt von `actions/configure-pages`: aktuell `/racoo/`. Dadurch funktionieren Logos, Suchindex, Datenabrufe und Folge-/Zeitlinks unter dem Projektpfad. Die lokalen Browserprüfungen laufen ebenfalls gegen `/racoo/` und `/`. Für einen Projektpfad-Build von Hand:

```powershell
npm.cmd --prefix web run build -- --base /racoo/
```

Nach einer Umbenennung oder eigenen Domain die tatsächliche Pages-Adresse aus dem Environment verwenden. GitHub leitet alte Repository-Links weiter, alte Pages-Projektadressen hingegen nicht automatisch. Einen späteren Domainwechsel deshalb bewusst konfigurieren.

Weitere lokal gespeicherte Folgen erscheinen mit der nächsten Veröffentlichung. Menschliche Suchqualitätsabnahme und die vollständige Archivabdeckung bleiben gesonderte Prüfungen.

## Quellen

- [GitHub: Publishing source einrichten](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub: Custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Vite: GitHub Pages und Basis-Pfad](https://vite.dev/guide/static-deploy.html#github-pages)
- [GitHub: Repository umbenennen](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)
