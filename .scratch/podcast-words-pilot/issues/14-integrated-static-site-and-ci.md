# 14: Use the complete static site at root and project prefix

**What to build:** A visitor can use search, Fundstellen, playback, links, and statistics together from one built publication at either deployment path, with the same checks runnable in CI.

**Blocked by:** 05: Explore, play, and share every Fundstelle; 07: Compare Grundformen across episode lengths; 12: Rebuild one coherent static publication.

**Status:** claimed

**Spec coverage:** User stories 13, 14, 17, 18, 19, 20, 28, 29, 30, 46, 48, 49 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Confirmed built-site browser boundary across root and project-prefix artifacts, with controlled network/media errors and a real Pagefind fixture index.

- [ ] Integrate the implemented search, passage/player navigation, word comparisons, vocabulary summaries, and common publication identity into one usable mobile-layout site.
- [ ] Verify assets, data/shards, Pagefind imports, result routes, and direct episode/time links at origin root and a GitHub Pages project prefix.
- [ ] Verify shared playback state without autoplay, stale-query protection, explicit missing/failed/incompatible data and unavailable media, and no automatic retry/reload loops across the combined app.
- [ ] Observe requests to establish that startup and global coverage do not load the entire transcript archive, retaining the initial ten-detail limit in the larger controlled corpus.
- [ ] Show pilot scope/data state, machine-transcript limitations, and audio-version alignment without claiming archive completeness.
- [ ] Run relevant public-command and built-browser checks through the existing common Windows/Linux CI workflow with locked dependencies and small fixtures, without downloading models/audio or invoking live ASR.
- [ ] Record reproducible local/CI verification outcomes; configure hosted checks without claiming a remote Actions run or public deployment happened if no remote exists.
