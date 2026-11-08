# Working in Podcast Words V3

This project builds a static podcast passage search and word-statistics site, backed by an offline transcription pipeline.

## Context

- Planning, architecture, or scope changes: read [PLAN.md](PLAN.md). It is the design baseline; proposals remain open until confirmed.
- Picking up implementation: read [TASKS.md](TASKS.md) for the next unproven step. The planning interview is complete; workspace setup and the documented product direction are confirmed.
- Naming domain concepts or changing their meaning: read and maintain [GLOSSARY.md](GLOSSARY.md).
- Continuing the planning interview: read [docs/planning/refinement.md](docs/planning/refinement.md) for confirmed decisions and the current frontier.
- Updating podcasts or adding a podcast: read [docs/updates.md](docs/updates.md) for configuration, bounded processing, resumption and the static publication layout.
- Running local commands or setting up tools: read [docs/development.md](docs/development.md), including this Windows host's npm, uv-cache, and scoped Git-ownership handling.
- Changing feed import or search: consult [the source research](docs/research/v3-feed-and-search.md). Its observations are dated; verify mutable facts when needed.
- Changing ASR or audio playback: read [local FP32 operation](docs/asr.md) and the [investigation](docs/research/asr-investigation.md). The active pipeline is local FP32/CUDA; audio is temporary and is deleted after processing. Playback starts at coarse segment boundaries and can shift because of advertising. For Pagefind positions, consult [runtime findings](docs/research/runtime-and-search-contracts.md).
- Changing episode JSON: read [data contracts](docs/data-contracts.md); Python is authoritative and the JSON Schema export must stay in sync.

## Data and validation

Keep normalized episode JSON and analysis results versioned as specified in the plan. Keep model weights, caches, and generated web/search builds untracked. Download audio once per processing run and delete it afterward, including on failure. The stored transcript is the data basis; never hash-match it against later online audio. Active Episode schema v2 contains coarse segments without word timestamps and measured processing timings. The original pilot interfaces are in `.scratch/local-five-episode-pilot/spec.md`; configured updates and multi-podcast publication are specified in `.scratch/podcast-updates/spec.md`.

When a data contract changes, update its producers, consumers, and representative fixtures together. Keep stable episode identity separate from feed metadata, display numbers, and search-index identifiers.

Use package manifests for individual commands and `uv run --frozen python scripts/check.py` for the complete local check before pushing. GitHub Actions only builds and deploys the saved publication; run relevant tests locally during development. Routine checks use small fixtures without model downloads, audio downloads, or GPU access; validate real local GPU inference separately as integration work. Report which checks ran and any remaining integration gaps.

Preserve the language of existing documentation. Add an ADR only when a hard-to-reverse, non-obvious trade-off needs its rationale recorded.

## Agent skills

### Issue tracker

Local Markdown specs and individual tickets in `.scratch/<feature>/`. See [tracker workflow](docs/agents/issue-tracker.md).

### Triage labels

Default triage roles are local status values. See [triage labels](docs/agents/triage-labels.md).

### Domain docs

Single context: root glossary and `docs/adr/`. See [domain rules](docs/agents/domain.md).
