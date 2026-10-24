# 01: Coarse passage playback and episode timing overview

**What to build:** Visitors find remembered words, play the start of the matching coarse segment with an explicit advertising hint, and inspect episode processing times without matching local audio files.

**Blocked by:** None (can start immediately).

**Status:** claimed-for-agent

- [ ] Remove local-file upload, audio hashing, byte identity and online-duration mismatch checks from the website.
- [ ] Use the matching segment's start as playback time, with a clear visible coarse-segment/advertising hint adjacent to every jump action; do not estimate word times.
- [ ] Preserve German word-form search, multiword coverage order, lazy details, shared links and ordinary online playback.
- [ ] Show an episode overview containing duration, download and transcription times from the compact published metadata; no archive-wide transcript preload.
- [ ] Exercise the changed public behavior in the built browser, including a different online duration, coarse passage lookup, timings and mobile layout.
- [ ] Commit the implementation and integrate the current integration tip before completion.

## Comments

The spec declares the agreed Episode/catalog fields and public test seams. The user's new instruction replaces second-accurate playback and audio identity requirements.

## Assignment

Claimed for an isolated implementer worktree; coordinator owns authoritative status and integration.
