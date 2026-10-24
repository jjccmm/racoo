# 03: Process and publish the five real episodes locally

**What to build:** A documented local command builds a coherent five-episode search and statistics site from actual FP32 transcripts and real German lemma analysis, and the normal local website uses that selected data.

**Blocked by:** 01: Coarse passage playback and episode timing overview; 02: Compact measured transcription with temporary audio.

**Status:** resolved

- [x] Select the five existing representative candidates by stable identity and record the selection without audio-cache/hash matching requirements.
- [x] Provide a straightforward reproducible processing/analyzing/publication/build workflow using the same public pipeline commands.
- [x] Make the normal local build use the selected real data while routine checks explicitly choose controlled fixtures.
- [x] Process all five episodes on local GPU FP32 with one model per batch and no concurrent GPU workers; save normalized JSON and measured per-episode timings, then remove temporary audio.
- [x] Run the pinned real spaCy model, persist analyses, and build one coherent search/statistics/publication state for exactly five real episodes.
- [x] Verify that resume uses saved transcripts without another audio download and that the production build does not load a model or require retained audio.
- [x] Commit implementation and generated versioned data; generated web builds/audio/models remain untracked.

## Assignment

Both blockers are resolved. A dedicated implementer owns selection/default build and reproducible workflow; coordinator runs the actual single-worker GPU batch and persists its data.

## Integration evidence

Code merged as `c1ca2df`; real data committed as `3b341ff`. Five fresh serial CUDA FP32 runs completed in 629.906 s including 4.984 s shared model setup. Real pinned spaCy analyses persisted. Resume skipped 5/5 with unchanged transcript bytes, no model setup and empty audio directory. Normal environment-free npm build produced selected-pilot publication `6f5e43eba992`, exactly five episodes, 2,797,724 bytes; cache-only preparation loads no model.
