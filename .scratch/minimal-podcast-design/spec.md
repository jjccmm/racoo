# Minimal podcast directory and search workspace

**Status:** resolved
**Baseline:** 27aab13

The operator approved the functionality and requests researched, modern, minimal visual design and a two-screen entry. The current local five-episode scope persists. Use primary sources; distinguish evidence from aesthetic judgment. No hosted deployment, new model work, source-data changes or dependencies.

## Agreed behavior

- Root landing: exact heading “Die Podcast Wort Suche”, exact subheading “Finde mit ein paar Schlüsselwörtern zu der gesuchten Folge”, then podcast overview containing only DAS PODCAST UFO with official cover and speakers Florentin Will / Stefan Titze.
- Selecting the podcast opens the search workspace. Small site-name home link and compact podcast identity precede the search field. Browser back, reload and existing shared episode/time links work at root and GitHub Pages project base without server routing.
- Preserve dropdown, removable words, exact absolute count stacks, Top 10/Alle, stable word colors, ranked episodes, original safe highlights, shared player and ad/coarse-time hint.
- Quiet neutral surfaces, restrained type/spacing hierarchy, subtle rules, a categorical five-word palette with readable neutral labels. The chart is the main data surface. A cover asset is used for identity, without generated branding or external runtime requests.
- Compact results show two original passage previews per episode, approximately 280 characters around a real hit; more passages and full original segments remain explicitly expandable. One ad/time hint per episode labels all its play buttons. No finer timestamps or stored schema changes.
- Technical metadata stays available in secondary disclosures. The directory loads no statistics or search corpus. Search detail loading stays limited to selected top-ten episodes.

## Evidence and implementation

See [primary-source research](../../docs/research/minimal-podcast-design.md) and [ticket](issues/01-minimal-design.md). Research was delegated by the research skill; implementation stays in the existing checkout. New navigation/disclosure browser checks augment existing behavioral checks; verify real desktop/mobile screens after production build. No universal AI-generated-design classifier is asserted.

## Delivered

The complete ticket is resolved; see [completion and validation](../../docs/pilot/minimal-design.md). The local real-five preview is restored.
