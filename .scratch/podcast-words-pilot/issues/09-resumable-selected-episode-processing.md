# 09: Resume selected episode processing without losing work

**What to build:** An operator can manually process a selected catalog subset, interrupt it, and resume while preserving completed transcripts and retrying unfinished work.

**Blocked by:** 01: Inspect and reconcile the episode catalog; 02: Transcribe one real Folge on Windows CPU.

**Status:** ready-for-agent

**Spec coverage:** User stories 32, 37, 38, 39, 40, 43, 47, 49 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public run/resume commands, saved completion records and validated episode artifacts, exit status, and controlled external download/model failures.

- [ ] Consume catalog-assigned stable identities and an explicit selected episode set through the shared Python CLI, using one pinned run configuration and one model initialization per run.
- [ ] Mark an episode complete only after a durable validated result exists; interrupted/partial writes cannot count as completion or replace an existing valid result.
- [ ] Resume by skipping validated completed episodes and leaving failed or incomplete episodes retryable with bounded network retries and actionable diagnostics.
- [ ] Preserve finished recognized text/times when metadata or default model configuration changes; expose provenance/configuration mismatches and require explicit selection for retranscription.
- [ ] Record consumed audio/configuration and transcript revisions so later analysis and publication can identify relevant changes.
- [ ] Keep temporary audio/models/runtime checkpoints out of versioned normalized data and avoid silently merging incompatible configurations.
- [ ] Demonstrate interruption before completion, restart, a download failure, unchanged rerun, metadata change, and explicit retranscription through public outputs. Ordinary checks use controlled external inputs, while ticket 02 supplies real CPU evidence.
