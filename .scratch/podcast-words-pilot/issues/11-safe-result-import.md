# 11: Import transferred results without silent conflicts

**What to build:** An operator can import completed episode results from another run, skip identical work, and receive explicit conflicts while preserving existing valid data.

**Blocked by:** 09: Resume selected episode processing without losing work.

**Status:** resolved

**Spec coverage:** User stories 34, 38, 42, 43, 44 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public import/reconcile command, persisted episode/run state, exit status, and repeat import observations.

- [x] Validate every incoming episode's semantic contract, stable identity, aliases, audio/model provenance, and completion state before accepting it.
- [x] Skip identical existing results idempotently and report what was accepted or skipped.
- [x] Report differing existing transcript, audio, identity, or configuration data as a conflict without silent overwrite; preserve the existing validated result.
- [x] Keep verified catalog identity and metadata reconciliation separate from recognition replacement; a metadata change alone must not run ASR.
- [x] Expose relevant changed transcript/analysis inputs to downstream rebuilds without falsely retaining obsolete completion/publication state.
- [x] Verify valid import, repeat import, incomplete/invalid input, identity mismatch, conflicting output, and preserved previous data using public artifacts and diagnostics.
- [x] Do not require a live Colab session for deterministic import checks; the real cross-runtime transfer is evidenced with the later pilot run.

## Comments

- Implemented the public `import-results` command. It validates each schema-v1 episode, required model/export/runtime provenance, non-empty completion, stable catalog identity and verified GUID aliases before durable acceptance. Existing invalid outputs and transcript/audio/identity/configuration conflicts remain unchanged; identical results skip, and metadata drift is reported separately.
- The command reports audio, configuration and transcript fingerprints for publication diagnostics. Complete legacy schema-v1 provenance with all optional 09 revision fields absent remains importable; partial or inconsistent revisions are rejected. No audio/model download or ASR call is part of import.
- Public CLI fixture coverage: acceptance, repeat import, verified alias, malformed/semantically invalid/incomplete inputs, unverified identity, metadata drift, transcript/audio/config conflicts, byte preservation and legacy provenance. Full Python suite: 57 passed. Ruff check/format and workspace documentation/Colab syntax checks passed. `uv run --frozen pytest` could not bootstrap the isolated worktree because PyPI access was denied; tests ran with the installed Python 3.12 environment and worktree `PYTHONPATH` instead.
- Integration acceptance: merged with no fast-forward as `4b392c9`. The full suite passed (57 tests), including import acceptance/repeat, alias, incomplete/invalid inputs, identity/audio/transcript/config conflicts, and byte preservation. Ruff check/format and workspace documentation/Colab syntax checks passed. A focused public CLI assertion also confirms accepted import preserves all runtime-version provenance in the stored episode.