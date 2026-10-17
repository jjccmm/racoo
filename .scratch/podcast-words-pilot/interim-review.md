# Interim review

**Fixed baseline:** `3d0564b..52a986b` (`pilot/review-fixes`, based on integrated tip `52a986b`)

This report covers interim review findings against that fixed range. It does not claim that the five-episode pilot specification is complete.

## Standards

No hard standards violations were found. One judgment call was duplicated atomic JSON persistence in `catalog.py`, `processing.py`, `analysis.py`, and `publication.py`. The review fix centralizes the writer in `json_io.py`, retains indented UTF-8 JSON for catalog/process/publication artifacts and compact sorted UTF-8 JSON for analysis artifacts, and keeps process-result validation before atomic replacement.

**Status:** fixed in implementation commit `fb3a279`. Ruff check/format and the 70-test Python suite pass. Root and project-subpath production builds also pass.

## Spec

### Saved processing provenance could be stale while completion was recorded

The process resume path previously treated every structurally valid saved episode as completed. It now checks populated revision triples against the audio SHA-256 and the saved ordered segments using the stored configuration revision. Partial triples and stale values produce an actionable conflict, preserve episode bytes, and set the catalog status to `failed`; all-absent legacy revisions remain valid and emit `complete-without-revision-fields`. Explicit retranscription continues through the existing replacement path, which preserves prior bytes if retranscription fails. Import and publication now share the same authoritative revision validator.

**Status:** fixed in implementation commit `fb3a279`. Public CLI evidence: the new stale-input, stale-transcript, partial-provenance, and valid-legacy regressions pass; the stale/partial cases preserve the file and leave the catalog failed. Existing retranscription failure preservation and import/publication checks also pass. RED evidence before the fix: the stale/partial CLI case skipped with exit 0 and the legacy case omitted its diagnostic.

### Custom-corpus Vite builds could mix recognition configurations

`PODCAST_WORDS_EPISODES` builds now invoke Python's public `validate --compatible-processing` check before indexing. It compares model, export, and recognition settings through the shared Python rule while allowing execution provider and runtime-version facts to differ. This closes the custom-corpus route without duplicating the rule in TypeScript.

**Status:** fixed in implementation commit `fb3a279`. A public npm build regression with two cached synthetic analyses and one changed model revision now fails with the compatibility diagnostic. The ordinary 17-episode fixture build succeeds at `/` and `/podcast_words_v3/` without loading an analysis model.

## Scope and remaining pilot gates

No scope creep was found. This interim review does not mark the entire pilot complete: tickets 10 and 13 still require human evidence, and tickets 15–18 remain explicitly blocked. No live GPU, model download, audio download, or ASR run was performed for these fixes.

## Verification evidence

- `pytest tests -q`: 70 passed.
- `ruff check .` and `ruff format --check .`: passed.
- `npm.cmd --prefix web run lint`: passed.
- `npm.cmd --prefix web run build`: passed, 17 cached fixture episodes.
- `npm.cmd --prefix web run build -- --base /podcast_words_v3/`: passed, 17 cached fixture episodes.
- Targeted Vite regression: incompatible custom corpus rejected; no model loaded.

Checks used the synchronized main `.venv` with `UV_PROJECT_ENVIRONMENT` pointing to that environment, shared `UV_CACHE_DIR`, `UV_NO_SYNC=1` for nested Vite CLI calls, and `PYTHONPATH` pointing at this worktree's `src`. npm dependencies were installed offline into the worktree using the shared npm cache.

After integration as merge `21621ff`, the main worktree passed the 70-test Python suite, Ruff check/format, the workspace checker (43 Markdown files and Colab cell syntax), web lint, and root and project-prefix production builds. The root build retained publication ID `0f1f4e865a8d`, matching the prior validated output. No browser rerun was needed because these changes do not modify UI code; hosted Actions and deployment remain unclaimed.

## Targeted re-review and handoff

Both original reviewers rechecked the integrated fixes at `f24a253`. Standards confirmed that shared atomic persistence addresses the judgment call; Spec confirmed both provenance and custom-corpus compatibility defects are resolved. Neither found a new consequential issue in those targeted paths. This is an interim review, not final pilot acceptance.

The existing real UFO537 CPU artifact was also resumed through the corrected public CLI: `skipped`, `complete-without-revision-fields`, no metadata mismatch, and unchanged SHA-256 `b30300ae860ec402982eb72c891b4030bd2b4c8a67ca91d4796efc1e6dd76e30`. No ASR or download occurred. Tickets 10 and 13 require operator/reviewer work before the dependent pilot-production and acceptance tickets may proceed.

## Ticket 19 investigation support

**Fixed review range:** `5a64fd3...509d16a`, with targeted re-review of notebook-only follow-up `037b394`. Integrated at `1507d1f` and `4b51b45`. The implementer, merger and both reviewers used `gpt-6-luna` with High effort.

### Standards

No documented-standard violations or additional consequential code smells were found. The documentation preserves the project's language, generated artifacts remain outside versioned source, and episode/provenance contracts are unchanged. The final single-sample notebook clarification introduced no further Standards issue.

### Spec

One reporting gap was found: one warm sample per profiling mode cannot establish variability. Commit `037b394` fixes it by recording repeat counts, n=1 and variability as unmeasured, with matching German instructions. The reviewer confirmed the fix and found no new consequential issue or scope creep. Comparable real Colab timings remain pending; this review does not resolve ticket 19.

**Findings:** Standards 0; Spec 1, fixed. No outstanding code-review finding.

### Verification and handoff

MAIN passed all 80 Python tests, including the frontend build regression, plus Ruff lint/format and the workspace checker (45 Markdown files and notebook syntax). The workspace checker passed again after the notebook-only follow-up; unchanged UI/browser behavior was not retested. Accepted transcript, original operator report and historical 797.015-second evidence remain unchanged.

A separately authorized real CPU retranscription took 582.125 seconds inside the CLI, including 566.922 seconds in the recognizer-generator boundary. It used the verified source audio and warm models, with profiling disabled. The raw report retains producer commit `080cc243`; its summary explains the boundary and does not infer the GPU cause. All three raw CPU artifacts were preserved and hash-verified under main `.cache/ticket19/cpu-baseline-080cc243/`.

Ticket 19 is `ready-for-human`: summarize the existing Drive profiles and saved episode metadata first, then collect missing matched timings and profiling comparisons. No measured GPU bottleneck, speed ratio, optimization, or remaining pilot acceptance is claimed.
