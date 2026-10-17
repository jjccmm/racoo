# 03: Find a known passage using a real Pagefind index

**What to build:** A visitor can search one remembered word in a built fixture site and see a known Folge, transcript context, and its correctly mapped passage time.

**Blocked by:** None (can start immediately).

**Status:** claimed

**Spec coverage:** User stories 1, 4, 8, 49 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Public fixture build and the actual built site in a browser using a real Pagefind index.

- [ ] Build a pinned real Pagefind index from valid controlled episode records, with one virtual German-language document per episode and transcript segment anchors.
- [ ] Demonstrate a browser query through the actual Pagefind API and show title, date, original context, and an episode-time Fundstelle.
- [ ] Prove search-ID to stable episode identity/date mapping before loading every candidate fragment, establishing the compact index-bound metadata interface needed by later coverage ordering.
- [ ] Verify native word-form matches, segment position/anchor interpretation, and preserved per-query positions against the pinned package rather than assuming immutable result-detail objects.
- [ ] Index spoken text separately from display metadata so a title-only word does not become a spoken match.
- [ ] Handle empty input, no match, and failed index/detail loads explicitly without reload loops.
- [ ] Add the first browser behavior checks at the confirmed built-site boundary; a successful bundle or mocked search engine is insufficient.

## Comments

### Implementation evidence — 17 October 2026, awaiting integration

All seven criteria are implemented and verified on `pilot/03-search`; status remains `claimed` until the coordinator integrates and reviews the branch.

- The build runs the authoritative Python validator over two controlled canonical episode records, then indexes one virtual `lang="de"` document per episode with paragraph anchors using exactly Pagefind 1.5.2. Only transcript text enters the lexical index. Display metadata and canonical episode JSON are separate lazy files because this Pagefind version also searches metadata.
- A hash-bound compact search-ID→stable episode-ID/publication-date map is generated from the actual Pagefind fragment filenames and virtual episode URLs, with a checked version-specific gzip/header adapter. The browser test obtains both independently known identities and dates for “Eimer” before any fragment is fetched.
- The built React UI finds “Münzen” and stemmed “Münze”, shows the original first-segment text, title, 16.10.2026 and 0:10; a subsequent “Kleingeld” query maps to the second segment at 1:00. Native API evidence records raw positions `[3]`/`[14]` and anchors `0`/`8`. The installed public `.data()` calls returned distinct objects and preserved earlier positions; the app still copies raw `.words` rather than relying on detail-cache behavior.
- Empty input, loading, no match and failed loads have distinct visible states. Title-only “Titelgeheimnis” produces no spoken result. Controlled HTTP 503 responses for manifest, module, metadata, index chunk, fragment and canonical episode JSON produce errors with a deliberate successful retry and no reload loop. The isolated worker captures Pagefind's internally swallowed chunk failures so they cannot become false zero results.
- `uv run --frozen python scripts/check.py` passed: Ruff lint/format, 16 Python tests, Markdown/notebook checks, validation, project-path production build, web lint/typecheck, root build and 12 real Chromium browser checks. Host setup required `New-Item -ItemType Directory -Force .cache` and `PYTEST_ADDOPTS=--basetemp=.cache/pytest-search-check` because the shared host pytest temp directory was inaccessible. `UV_CACHE_DIR` used `C:/Users/User/Code/podcast_words_v3/.uv-cache`; `PW_PORT=4188` isolated the local preview.
- Pagefind 1.5.2 and Playwright 1.64.1 are exact npm dependencies; the pinned Chromium Headless Shell is 156.0.8078.4. The reusable built-site harness and CI browser installation are committed. Ordinary checks require no audio, recognition model or GPU downloads.

Later tickets retain multiword ranking, more than ten candidates and explicit additional loads, every passage/player/share behavior, real ASR/Colab evidence, mobile measurements and pilot quality gates.
