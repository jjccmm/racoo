# 01: Inspect and reconcile the episode catalog

**What to build:** An operator can import the publisher feed, inspect every Folge and Quellenlücke, and reconcile source changes without changing existing Folgenidentität.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Spec coverage:** User stories 31, 32, 33, 34, 35 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public catalog commands, their saved records, exit status, and diagnostics; controlled feed/HTTP inputs plus a dated live snapshot.

- [ ] Import the configured publisher feed with redirects and a dated source snapshot; preserve special and nonstandard titles, including UGO081, without assuming a fixed episode count.
- [ ] Expose stable podcast/episode identities, GUIDs or supplemental source keys, display metadata, enclosures, and separate source/processing availability.
- [ ] Report duplicate GUIDs and malformed enclosures explicitly rather than silently dropping records.
- [ ] Preserve assigned identities and add a later GUID only after verified identity, following ADR 0001; title, number, and audio URL alone cannot merge records.
- [ ] Retain known episodes and transcripts after a feed omission or metadata change.
- [ ] Investigate an actual retrievable audio source for Folge 37; record an explicit Quellenlücke if unverified, distinct from a failed available input. Do not treat a playback HTML page as verified audio.
- [ ] Demonstrate these outcomes through catalog command fixtures and a live inventory report; neither claims an episode has been transcribed.
