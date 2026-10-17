# 14: Use the complete static site at root and project prefix

**What to build:** A visitor can use search, Fundstellen, playback, links, and statistics together from one built publication at either deployment path, with the same checks runnable in CI.

**Blocked by:** 05: Explore, play, and share every Fundstelle; 07: Compare Grundformen across episode lengths; 12: Rebuild one coherent static publication.

**Status:** claimed

**Spec coverage:** User stories 13, 14, 17, 18, 19, 20, 28, 29, 30, 46, 48, 49 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Confirmed built-site browser boundary across root and project-prefix artifacts, with controlled network/media errors and a real Pagefind fixture index.

- [x] Integrate the implemented search, passage/player navigation, word comparisons, vocabulary summaries, and common publication identity into one usable mobile-layout site.
- [x] Verify assets, data/shards, Pagefind imports, result routes, and direct episode/time links at origin root and a GitHub Pages project prefix.
- [x] Verify shared playback state without autoplay, stale-query protection, explicit missing/failed/incompatible data and unavailable media, and no automatic retry/reload loops across the combined app.
- [x] Observe requests to establish that startup and global coverage do not load the entire transcript archive, retaining the initial ten-detail limit in the larger controlled corpus.
- [x] Show pilot scope/data state, machine-transcript limitations, and audio-version alignment without claiming archive completeness.
- [x] Run relevant public-command and built-browser checks through the existing common Windows/Linux CI workflow with locked dependencies and small fixtures, without downloading models/audio or invoking live ASR.
- [x] Record reproducible local verification outcomes; keep hosted Actions and public deployment claims limited to what has run.

## Comments

- 2026-10-17: `uv sync --locked --offline` and `uv run --frozen python scripts/check.py` passed on Windows after the Colab preparation integration. The check reports 67 Python tests passed, Ruff checks and format passed, workspace documentation/Notebook check passed for 42 Markdown files, Web lint passed, and 35 Chromium browser cases passed on each built base (`/podcast_words_v3/` and `/`). It builds the root artifact last. No model/audio download or live ASR was used; hosted Actions and public deployment were not run.
- 2026-10-17: Added combined mobile search/player/statistics/vocabulary coverage at 390 CSS pixels and direct shared-link/asset coverage. The mobile test found no document or body horizontal overflow. Local visual evidence: `.cache/artifacts/ticket14-mobile-integrated.png` (ignored build artifact). This is synthetic layout evidence, not the pilot's mobile time, transfer, or memory measurement.
- Status remains `claimed` pending integration-branch review and checks.
