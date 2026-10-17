# 05: Explore, play, and share every Fundstelle

**What to build:** A listener can inspect all matching passages in a Folge, choose one for contextual playback, and share a direct episode/time link.

**Blocked by:** 04: Rank remembered Stichwörter with lazy result details.

**Status:** claimed

**Spec coverage:** User stories 8, 10, 11, 12, 15, 16, 17, 18, 19, 20 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Built-site browser UI, selected passage/context, URL navigation, external media state, and controlled unavailable-audio responses.

- [ ] Recover every matching Fundstelle for an opened/loaded episode, retaining term-specific positions and occurrences across adjacent segment boundaries.
- [ ] Prefer nearby distinct terms within the loaded episode without a global proximity sort or eager archive download.
- [ ] Show original text, matched terms, episode title/date, and mapped passage time; repeated occurrences remain accessible.
- [ ] Use one shared player with a short lead-in plus backward/forward controls, bounded to the audio timeline; start audio only after user action.
- [ ] Share and directly reopen stable episode identity and seek time through query parameters without autoplay; handle an unknown episode explicitly.
- [ ] Show an unavailable-media error and original episode link without retry loops, and explain machine-transcript accuracy and audio-version alignment briefly.
- [ ] Exercise passage selection, cross-segment matches, repeated occurrences, seeking, forward/backward controls, direct links, and failed media through browser behavior. Preserve these behaviors during later root/project-prefix integration.

## Comments

- Implemented the built-site passage and player behavior on `pilot/05-passages`. Browser cases use the real Pagefind build and a controlled valid WAV media source. Repeated hits, term proximity, successive segments, late token-point seek, direct links without autoplay, unknown identities, bounded controls, and unavailable audio/source links are covered.
- After merging integration `68d3ecd`, `uv run --frozen python scripts/check.py` passed with scoped pytest basetemp: 49 Python tests, lint/format, workspace/data validation, root build, and 29/29 browser tests. A separate `/podcast_words_v3/` build and browser run also passed 29/29. The ticket remains claimed pending integration acceptance.
