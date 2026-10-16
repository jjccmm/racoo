# 03: Find a known passage using a real Pagefind index

**What to build:** A visitor can search one remembered word in a built fixture site and see a known Folge, transcript context, and its correctly mapped passage time.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

**Spec coverage:** User stories 1, 4, 8, 49 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public fixture build and the actual built site in a browser using a real Pagefind index.

- [ ] Build a pinned real Pagefind index from valid controlled episode records, with one virtual German-language document per episode and transcript segment anchors.
- [ ] Demonstrate a browser query through the actual Pagefind API and show title, date, original context, and an episode-time Fundstelle.
- [ ] Prove search-ID to stable episode identity/date mapping before loading every candidate fragment, establishing the compact index-bound metadata interface needed by later coverage ordering.
- [ ] Verify native word-form matches, segment position/anchor interpretation, and preserved per-query positions against the pinned package rather than assuming immutable result-detail objects.
- [ ] Index spoken text separately from display metadata so a title-only word does not become a spoken match.
- [ ] Handle empty input, no match, and failed index/detail loads explicitly without reload loops.
- [ ] Add the first browser behavior checks at the confirmed built-site boundary; a successful bundle or mocked search engine is insufficient.
