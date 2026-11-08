# Racoo auf GitHub Pages einrichten

Stand: 8. November 2026. Repository: <https://github.com/jjccmm/racoo>. Das bisherige `jjccmm/podcast_words_v3` wurde umbenannt; die lokale Remote-Adresse zeigt auf `https://github.com/jjccmm/racoo.git`. Der lokale Checkout heißt weiterhin `podcast_words_v3`; der Verzeichnisname ist unabhängig vom GitHub-Namen.

## Einmalige Einrichtung

1. Repository öffnen und den Zugriff für Pages klären: GitHub Free unterstützt Pages bei öffentlichen Repositories; für ein privates Repository ist ein passender Tarif wie GitHub Pro nötig. Das Repository wurde durch die Umbenennung nicht öffentlich gemacht. Falls gewünscht, Sichtbarkeit unter **Settings → General → Danger Zone → Change repository visibility** auf Public ändern. Alternativ privat lassen und Pages mit einem passenden Tarif nutzen.
2. Unter [Settings → Pages](https://github.com/jjccmm/racoo/settings/pages) bei **Build and deployment → Source** **GitHub Actions** auswählen.
3. Unter [Settings → Secrets and variables → Actions → Variables](https://github.com/jjccmm/racoo/settings/variables/actions) eine **Repository variable** anlegen: Name `PAGES_ENABLED`, Wert `true` (kleingeschrieben). Dies ist eine normale Konfigurationsvariable, kein Secret. Sie schaltet den bereits vorbereiteten Veröffentlichungsjob frei.
4. Unter [Actions → Workspace checks](https://github.com/jjccmm/racoo/actions/workflows/ci.yml) **Run workflow**, Branch **main**, **Run workflow** wählen.
5. Warten, bis beide Offline-Prüfungen und **Build and deploy Racoo** erfolgreich sind. Der Job bzw. das Environment **github-pages** zeigt den endgültigen Website-Link. Ohne eigene Domain lautet die erwartete Adresse <https://jjccmm.github.io/racoo/>. Das ist bis zum ersten erfolgreichen Deployment eine Zieladresse, kein Nachweis einer laufenden Website.

Danach veröffentlichen weitere Pushes auf `main` automatisch, nachdem die Prüfungen auf Windows und Linux bestanden sind. Bei fehlgeschlagenen Prüfungen wird nicht veröffentlicht. `PAGES_ENABLED` entfernen oder auf `false` setzen stoppt zukünftige Veröffentlichungsjobs, entfernt aber keine bereits veröffentlichte Website.

## Was der Workflow veröffentlicht

Der [Workflow](../.github/workflows/ci.yml) baut aus den gespeicherten echten Pilottranskripten und Analysen, ohne Audio, ASR-Modell oder spaCy-Modell zu laden. Der normale Stand enthält fünf Folgen. Die Routineprüfungen verwenden zuerst ihre synthetischen Fixtures; der Veröffentlichungsjob arbeitet danach in einem frischen Checkout und baut die echte Auswahl. Ein zusätzlicher Check lehnt synthetische und leere Veröffentlichungen ab. Nur `web/dist` wird als Pages-Artefakt hochgeladen.

Der Basis-Pfad kommt von `actions/configure-pages`: aktuell `/racoo/`. Dadurch funktionieren Logos, Suchindex, Datenabrufe und Folge-/Zeitlinks unter dem Projektpfad. Die Browserprüfungen laufen lokal/CI ebenfalls gegen `/racoo/` und `/`. Für einen Projektpfad-Build von Hand:

```powershell
npm.cmd --prefix web run build -- --base /racoo/
```

Nach einer Umbenennung oder eigenen Domain die tatsächliche Pages-Adresse aus dem Environment verwenden. GitHub leitet alte Repository-Links weiter, alte Pages-Projektadressen hingegen nicht automatisch. Einen späteren Domainwechsel deshalb bewusst konfigurieren.

Die Veröffentlichung enthält weiterhin den Fünf-Folgen-Pilot; Archivtranskription und menschliche Suchqualitätsabnahme bleiben gesonderte Aufgaben.

## Quellen

- [GitHub: Publishing source einrichten](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub: Custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Vite: GitHub Pages und Basis-Pfad](https://vite.dev/guide/static-deploy.html#github-pages)
- [GitHub: Repository umbenennen](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository)
