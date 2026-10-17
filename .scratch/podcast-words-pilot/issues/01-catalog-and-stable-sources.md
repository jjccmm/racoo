# 01: Inspect and reconcile the episode catalog

**What to build:** An operator can import the publisher feed, inspect every Folge and Quellenlücke, and reconcile source changes without changing existing Folgenidentität.

**Blocked by:** None (can start immediately).

**Status:** resolved

**Spec coverage:** User stories 31, 32, 33, 34, 35 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public catalog commands, their saved records, exit status, and diagnostics; controlled feed/HTTP inputs plus a dated live snapshot.

- [x] Import the configured publisher feed with redirects and a dated source snapshot; preserve special and nonstandard titles, including UGO081, without assuming a fixed episode count.
- [x] Expose stable podcast/episode identities, GUIDs or supplemental source keys, display metadata, enclosures, and separate source/processing availability.
- [x] Report duplicate GUIDs and malformed enclosures explicitly rather than silently dropping records.
- [x] Preserve assigned identities and add a later GUID only after verified identity, following ADR 0001; title, number, and audio URL alone cannot merge records.
- [x] Retain known episodes and transcripts after a feed omission or metadata change.
- [x] Investigate an actual retrievable audio source for Folge 37; record an explicit Quellenlücke if unverified, distinct from a failed available input. Do not treat a playback HTML page as verified audio.
- [x] Demonstrate these outcomes through catalog command fixtures and a live inventory report; neither claims an episode has been transcribed.

## Comments

### 2026-10-17 — Implementation and verification evidence

Implemented on `pilot/01-catalog`, incorporating integration tip `fb33d63`. Status remains `claimed` until coordinator merger and review.

- Public `catalog import`, `show`, `add-source`, `alias`, and `schema` commands expose catalog v1 and structured diagnostics. The [operator guide](../../../docs/catalog.md) documents identity derivation, independent source/audio/processing states, explicit alias evidence and preservation rules. Failed snapshots remain inspectable without replacing the catalog.
- 22 controlled CLI cases cover redirected input, special titles, metadata changes, omissions and unchanged transcript bytes, duplicate GUIDs, malformed enclosures, HTML/invalid feeds, explicit gaps, actual audio prefixes, verified later aliases, conflicting ownership, repeated supplements, ambiguous saved identity and schema synchronization. Each behavior was added as a failing public-boundary test before implementation; no internal helper seam was introduced.
- [Live inventory evidence](../../../docs/research/catalog-inventory-2026-10-17.md): two complete publisher snapshots contain the same 537 entries/checksum; reimport adds zero and preserves IDs. The saved catalog additionally contains one verified supplement: 538 records total, all `not-processed`.
- Folge 37: complete raw Wayback MP3 retrieval returned 179,888,758 bytes matching Content-Length, SHA-256 `0fe922d9af143454d59881e485c4580cfec96ab17d2c77b95c6323dbde799956`. FFprobe identifies 5617.423878 seconds, stereo 44.1 kHz and matching embedded podcast/artist metadata; FFmpeg decoded the first ten seconds successfully. The ordinary HTML wrapper was explicitly rejected. Evidence is versioned; audio is ignored. Publication date remains unknown rather than guessed.
- `uv run --frozen python scripts/check.py` passed on Windows/Python 3.12.9: Ruff lint/format, all 38 Python tests, Markdown links/notebook syntax, episode validation, TypeScript, ESLint and project-prefix/root builds. Offline npm CI and `git diff --check` passed.
- Scope limits: this ticket performs no ASR inference, full listening, full-file decode, Colab/GPU run or pilot reference judgment. It does not claim a transcribed archive or verify all 537 feed audio files. These limits do not block the completed catalog criteria.

### Integrated verification — 17 October 2026

- Merged `pilot/01-catalog` at `1e4b19f030479a9fc1321572639420a38f125a1b` into `integration/podcast-words-pilot` with merge commit `9a4dc97a2af59df27b3b602da030d3ec6e5ec1db`, following the search integration `eb78ed9014fcbefa0ad75035ed3df047c3220708`.
- The combined integrated `uv run --frozen python scripts/check.py` passed Ruff lint/format, all 38 Python tests, Markdown/notebook checks, episode validation, project-prefix and root builds, ESLint/TypeScript and all 12 real Chromium search checks. The integrated XML snapshot bytes retain their recorded SHA-256 `9a6fb8b0807438637b28932bbd473afae33bb1b1ef9e45aff03875e24a7d0715`.
- The full check exited 0 after scoped elevated cleanup of its own preview tree: this host's sandbox denied the Windows `taskkill` operation used by Playwright after all browser cases had passed. No catalog or search implementation change was needed.
- All catalog criteria are satisfied and the corresponding `TASKS.md` catalog proof is checked. Audio/ASR, Colab and pilot quality proofs remain separate open work.
