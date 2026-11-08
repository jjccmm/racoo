# Solid word chips and an immediately useful podcast search

**Status:** resolved
**Baseline:** 85e0dc9

The user requests fully colored bold word buttons with black/white contrast-aware text, a subtly tinted page, fewer separators, search-like fields, a default haus selection on opening a podcast and removal of Diagrammdaten anzeigen.

- Share solid chip styling across landing demo and podcast explorer; retain each term's existing color and choose black/white foreground by relative luminance.
- Soft tinted canvas, fewer ornamental lines and recognizable magnifier search controls; retain thin podcast-cover borders and useful chart gridlines.
- Automatically select/load haus once if present in the published vocabulary. Manual removal must persist during the visit; errors remain retryable and obsolete/aborted responses must not restore removed words. Directory/demo remains independent of podcast data.
- Remove the chart-data disclosure and table completely. Exact counts stay in tooltips, episode cards and accessible labels on the actual visible episode axis; no hidden replacement table.
- Preserve top-ten and chronological zero episode behavior, query dropdowns, original highlights, player and coarse advertising hint.
- Update meaningful browser checks for the new initial state and the actual chart instead of the removed table. Verify both bases and actual five-episode desktop/mobile screens. No schema, dependency or transcript changes.

## Delivered

Completed with shared contrast-aware solid chips, search controls, a once-per-visit default selection, cancellation/retry and actual chart accessibility instead of the removed table. Lint/types/builds, 68 browser cases per base and real-five desktop/mobile/narrow checks pass. See [completion](../../docs/pilot/solid-search-design.md). The actual root pilot is restored.
