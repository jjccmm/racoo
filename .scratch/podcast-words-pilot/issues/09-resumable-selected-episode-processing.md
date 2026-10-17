# 09: Resume selected episode processing without losing work

**What to build:** An operator can manually process a selected catalog subset, interrupt it, and resume while preserving completed transcripts and retrying unfinished work.

**Blocked by:** 01: Inspect and reconcile the episode catalog; 02: Transcribe one real Folge on Windows CPU.

**Status:** resolved

**Spec coverage:** User stories 32, 37, 38, 39, 40, 43, 47, 49 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public run/resume commands, saved completion records and validated episode artifacts, exit status, and controlled external download/model failures.

- [x] Consume catalog-assigned stable identities and an explicit selected episode set through the shared Python CLI, using one pinned run configuration and one model initialization per run.
- [x] Mark an episode complete only after a durable validated result exists; interrupted/partial writes cannot count as completion or replace an existing valid result.
- [x] Resume by skipping validated completed episodes and leaving failed or incomplete episodes retryable with bounded network retries and actionable diagnostics.
- [x] Preserve finished recognized text/times when metadata or default model configuration changes; expose provenance/configuration mismatches and require explicit selection for retranscription.
- [x] Record consumed audio/configuration and transcript revisions so later analysis and publication can identify relevant changes.
- [x] Keep temporary audio/models/runtime checkpoints out of versioned normalized data and avoid silently merging incompatible configurations.
- [x] Demonstrate interruption before completion, restart, a download failure, unchanged rerun, metadata change, and explicit retranscription through public outputs. Ordinary checks use controlled external inputs, while ticket 02 supplies real CPU evidence.

## Comments

- Implementation and controlled public-CLI evidence are committed as `defb6dc` on `pilot/09-processing`.
- Checks: `uv run --frozen ruff check .`, `uv run --frozen ruff format --check .`, `uv run --frozen pytest` (48 tests), and `uv run --frozen python scripts/check_workspace.py` all pass. Real CPU inference remains the completed evidence from ticket 02; no new model download or real inference was run here.


- Integration acceptance: merged with no fast-forward as `9383601`; follow-up safeguard commit `87fcf32` accepts a saved source GUID only when it is the catalog's verified alias, while stable source-key and unrelated GUID conflicts remain enforced. The public alias case failed before the fix and passed after it. Full integrated Python suite passed (49 tests), including `test_published_structural_schema_matches_python_contract`; Ruff check/format and documentation/local-link/Colab syntax checks passed. No browser rerun was needed because 09 has no UI changes.

2026-10-17: The shared `process` CLI reconciled the already validated real UFO537 CPU-proof result with the catalog: status `skipped`, no metadata mismatch, and an explicit missing legacy `configuration_revision` diagnostic. No recognition or audio/model download was invoked; the transcript remained byte-identical (SHA-256 `b30300ae860ec402982eb72c891b4030bd2b4c8a67ca91d4796efc1e6dd76e30`). The catalog now truthfully marks that existing result completed; pilot selection and manual references remain pending. Separately, `uv sync --locked --offline` succeeded on the integrated default CPU environment after ticket 10's dependency-group change.

2026-10-17 interim-review follow-up (`fb3a279`): completion now revalidates populated saved revisions before the resume skip path. Stale input/transcript revisions and partial revision triples report conflict, preserve the episode bytes, and set catalog processing status to `failed`; all-absent legacy revisions remain valid with the explicit diagnostic above. The public CLI regressions and full 70-test Python suite pass, alongside Ruff check/format and root/project-subpath builds. This follow-up fixes the interim completion defect and does not add real runtime or full pilot-gate evidence.
