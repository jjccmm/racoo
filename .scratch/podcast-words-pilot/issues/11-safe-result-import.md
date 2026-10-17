# 11: Import transferred results without silent conflicts

**What to build:** An operator can import completed episode results from another run, skip identical work, and receive explicit conflicts while preserving existing valid data.

**Blocked by:** 09: Resume selected episode processing without losing work.

**Status:** claimed

**Spec coverage:** User stories 34, 38, 42, 43, 44 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public import/reconcile command, persisted episode/run state, exit status, and repeat import observations.

- [ ] Validate every incoming episode's semantic contract, stable identity, aliases, audio/model provenance, and completion state before accepting it.
- [ ] Skip identical existing results idempotently and report what was accepted or skipped.
- [ ] Report differing existing transcript, audio, identity, or configuration data as a conflict without silent overwrite; preserve the existing validated result.
- [ ] Keep verified catalog identity and metadata reconciliation separate from recognition replacement; a metadata change alone must not run ASR.
- [ ] Expose relevant changed transcript/analysis inputs to downstream rebuilds without falsely retaining obsolete completion/publication state.
- [ ] Verify valid import, repeat import, incomplete/invalid input, identity mismatch, conflicting output, and preserved previous data using public artifacts and diagnostics.
- [ ] Do not require a live Colab session for deterministic import checks; the real cross-runtime transfer is evidenced with the later pilot run.
