# 09: Resume selected episode processing without losing work

**What to build:** An operator can manually process a selected catalog subset, interrupt it, and resume while preserving completed transcripts and retrying unfinished work.

**Blocked by:** 01: Inspect and reconcile the episode catalog; 02: Transcribe one real Folge on Windows CPU.

**Status:** claimed

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

- Implementation and controlled public-CLI evidence are committed as `defb6dc` on `pilot/09-processing`; awaiting integration-branch merger before resolving this ticket.
- Checks: `uv run --frozen ruff check .`, `uv run --frozen ruff format --check .`, `uv run --frozen pytest` (48 tests), and `uv run --frozen python scripts/check_workspace.py` all pass. Real CPU inference remains the completed evidence from ticket 02; no new model download or real inference was run here.
