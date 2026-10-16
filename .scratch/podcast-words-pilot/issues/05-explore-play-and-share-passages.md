# 05: Explore, play, and share every Fundstelle

**What to build:** A listener can inspect all matching passages in a Folge, choose one for contextual playback, and share a direct episode/time link.

**Blocked by:** 04: Rank remembered Stichwörter with lazy result details.

**Status:** ready-for-agent

**Spec coverage:** User stories 8, 10, 11, 12, 15, 16, 17, 18, 19, 20 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Built-site browser UI, selected passage/context, URL navigation, external media state, and controlled unavailable-audio responses.

- [ ] Recover every matching Fundstelle for an opened/loaded episode, retaining term-specific positions and occurrences across adjacent segment boundaries.
- [ ] Prefer nearby distinct terms within the loaded episode without a global proximity sort or eager archive download.
- [ ] Show original text, matched terms, episode title/date, and mapped passage time; repeated occurrences remain accessible.
- [ ] Use one shared player with a short lead-in plus backward/forward controls, bounded to the audio timeline; start audio only after user action.
- [ ] Share and directly reopen stable episode identity and seek time through query parameters without autoplay; handle an unknown episode explicitly.
- [ ] Show an unavailable-media error and original episode link without retry loops, and explain machine-transcript accuracy and audio-version alignment briefly.
- [ ] Exercise passage selection, cross-segment matches, repeated occurrences, seeking, forward/backward controls, direct links, and failed media through browser behavior. Preserve these behaviors during later root/project-prefix integration.
