# Interactive Racoo introduction

**Status:** resolved
**Baseline:** 6e93d56

The user requests a larger centered logo without the divider, selected-word chips in place of the static title, a short explanation with matching highlights, and an interactive word field that adds terms such as Folge and highlights related forms.

- Large centered original logo on the directory screen; the podcast workspace header remains compact.
- Default removable chips Die / Podcast / Wort / Suche use the explorer's shared palette. A semantic page heading remains available to assistive technology.
- Clear explanatory copy describes remembered words, counts across episodes and podcast selection. Initial colors match corresponding original text forms.
- A local-only accessible autocomplete adds up to five distinct selected words from this example, including Folge / Folgen. Known word families are explicitly defined only for this fixed copy; no browser lemmatizer, model or podcast fetch is needed. Never claim this is the real corpus search.
- Highlighting and removal update immediately; colors are stable while selected. Keyboard, touch, dismissal and an explicit limit/empty state work.
- Podcast selection, actual search, direct links and cover styling remain available. No data or dependency changes, deployment or transcription.
- Verify meaningful interactive behavior, desktop/mobile layouts and both static-host bases. Restore the real five-episode root build afterward.

## Delivered

Shared palette, interactive fixed-copy word families and accessible controls implemented. Lint/types/builds and 66 browser cases per base pass. Real-five desktop/mobile/narrow evidence checked; the normal pilot preview is restored. See [completion](../../docs/pilot/interactive-landing.md).
