# Current scope update — 2026-10-24

Scope update: The operator replaced retained/hash-matched audio and second-accurate timestamps with ephemeral audio, coarse segments and an advertising hint. Current local five-episode implementation and acceptance are in [the new spec](../local-five-episode-pilot/spec.md). This older spec records the preceding scope; it does not reinstate superseded gates.

The user selected local GPU FP32 as the only active ASR path, accepted the complete UFO537 transcript quality and chose about 25× real time for planning. Former remote runtime/result-import requirements are retired and archived; the statements below describe the current local workflow. The five-episode search, reference-timestamp and mobile gates remain active. See [current operation](../../docs/asr.md) and [the investigation](../../docs/research/asr-investigation.md).

# Podcast Words V3: five-episode pilot

**Status:** ready-for-human

**Category:** enhancement

## Problem Statement

A listener remembers a few words from DAS PODCAST UFO but cannot reliably identify the Folge or the Fundstelle where they were spoken. Exact quotation and word order are usually unavailable. The listener also wants to explore how particular Grundformen occur across Folgen without confusing approximate search matches with exact word statistics.

The repository currently provides a Python CLI, an initial validated episode contract, synthetic examples, a React/TypeScript/Vite starter, dependency locks, and offline workspace checks. It does not yet provide real transcription, a feed catalog, word analysis, an operational search index, passage playback, or evidence that the chosen ASR and search integrations work.

Processing the entire archive before proving these connections would make transcription errors, timestamp drift, unsupported runtimes, or an unsuitable search integration expensive to discover. The immediate deliverable is a complete, measured pilot using five real representative Folgen. Bulk archive processing and public release remain later stages.

## Solution

Extend the existing workspace into one manually operated processing workflow and a static German-language site. Ingest the publisher feed and explicitly verified supplemental sources, preserve stable Folgenidentität, transcribe five selected Folgen with the agreed Parakeet model, derive versioned word analyses, and build a coherent publication containing catalog data, statistics, transcripts, and a Pagefind index.

Listeners search using remembered Stichwörter, see results grouped by Suchabdeckung, inspect all relevant Fundstellen within a Folge, and start a shared player at the chosen time. They can compare exact lemma statistics, switch between normalized and absolute frequencies, and share episode/time links.

The pilot is complete only when the real runtime integrations, reproducible build, failure/restart behavior, browser behavior, and agreed manual quality and mobile performance gates have documented evidence. Passing the pilot permits a later decision to start bulk processing; this spec does not perform that archive run or claim the available archive is complete.

## User Stories

1. As a listener, I want to enter several remembered Stichwörter, so that I can find a Folge without recalling an exact quotation.
2. As a listener, I want word order and letter case to have no effect on search coverage, so that an approximate memory is enough to search.
3. As a listener, I want repeated or empty query terms to be ignored, so that they do not artificially increase Suchabdeckung.
4. As a listener, I want matching German word forms to remain eligible, so that inflection does not hide a relevant passage.
5. As a listener, I want Folgen matching all distinct Stichwörter before partial matches, so that I can start with the strongest candidates.
6. As a listener, I want partial matches labeled with their coverage, so that I understand which remembered words were found.
7. As a listener, I want reproducible ordering within a coverage group, so that the same data and query give a stable result order.
8. As a listener, I want result titles, dates, matching words, original transcript context, and timestamps, so that I can judge whether a passage is familiar.
9. As a listener, I want a useful initial result set and an explicit way to request more, so that I can search without loading every episode's details.
10. As a listener, I want nearby occurrences of different Stichwörter emphasized within a loaded Folge, so that likely passages are easier to inspect.
11. As a listener, I want access to every matching Fundstelle in an opened Folge, so that repeated mentions are not hidden behind a single excerpt.
12. As a listener, I want passages crossing transcript segment boundaries to remain discoverable, so that segmentation does not change what I can find.
13. As a listener, I want empty, loading, no-result, and failed-search states to be distinguishable, so that I know what happened and can retry deliberately.
14. As a listener, I want a newer search to remain authoritative, so that a slow older request cannot replace my current results.
15. As a listener, I want to choose a Fundstelle and hear it with a short lead-in, so that I can recognize the conversation in context.
16. As a listener, I want one shared player with backward and forward controls, so that playback remains manageable while I inspect results.
17. As a listener, I want playback to start only after my action, so that opening a page or shared link does not unexpectedly play audio.
18. As a listener, I want a working episode/time link, so that I can share or reopen a particular passage.
19. As a listener, I want an understandable audio error and a link to the episode page when playback fails, so that I have another way to reach the source.
20. As a listener, I want the limits of machine transcripts and audio-version timestamps explained briefly, so that I can interpret occasional mistakes or shifted jumps.
21. As a listener, I want to select several Grundformen using bounded suggestions, so that I can compare words without navigating an enormous vocabulary list.
22. As a listener, I want stopwords hidden from suggestions initially and available through a toggle, so that the default suggestions are useful without losing access to common words.
23. As a listener, I want word-frequency trends per 1,000 Gesamtwörter by default, so that episodes of different lengths can be compared.
24. As a listener, I want an absolute-count alternative, so that I can inspect actual occurrences as well as normalized frequency.
25. As a listener, I want Top-10-Folgen for selected words, so that I can find episodes associated with those words.
26. As a listener, I want Gesamtwörter, verschiedene Wörter, and neue Wörter reported with clear definitions, so that the statistics have a consistent meaning.
27. As a listener, I want newly appearing words determined by publication chronology, so that processing order does not change the result.
28. As a listener, I want a missing known word/episode count to mean zero and a failed data request to remain an error, so that unavailable data is not presented as a genuine zero.
29. As a listener, I want the page to identify the pilot data and its processing state, so that five selected Folgen are not mistaken for the full archive.
30. As a mobile listener, I want a readable, usable search and player without downloading the entire transcript archive, so that the service works on a modest device and connection.
31. As an operator, I want all feed entries retained regardless of title prefix, so that special Folgen and unusual titles are not silently excluded.
32. As an operator, I want a dated catalog snapshot with stable source identities, so that I can explain which inputs a run used.
33. As an operator, I want missing historical sources distinguished from failed processing, so that an unavailable Folge is not mistaken for completed work or a retryable download error.
34. As an operator, I want verified supplemental sources and GUID aliases to preserve existing Folgenidentität, so that a recovered episode does not create duplicates or break shared links.
35. As an operator, I want known Folgen retained when a later feed omits them, so that a feed change alone does not delete the existing catalog or transcripts.
36. As an operator, I want five representative real Folgen selected with a recorded rationale, so that the pilot exercises meaningful audio and metadata variation.
37. As an operator, I want the Python package to run locally with the tested FP32 GPU configuration, so there is one supported recognition path.
38. As an operator, I want the chosen model, export, runtime versions, actual execution provider, audio checksum, and duration recorded, so that processing results have verifiable provenance.
39. As an operator, I want long audio decoded and segmented without losing its original timeline, so that later passages still seek to the correct position.
40. As an operator, I want interrupted or failed episodes to remain retryable and completed episodes to be skipped, so that a resumed session does not repeat finished work.
41. As an operator, I want each completed episode validated and saved locally before the next one proceeds, so interruption preserves completed work.
42. As an operator, I want existing results preserved and provenance conflicts reported until explicit reprocessing is selected, so a new model or audio version cannot silently replace accepted work.
43. As an operator, I want metadata or model-configuration changes to leave finished transcripts intact until retranscription is explicitly selected, so that routine updates do not trigger expensive implicit work.
44. As an operator, I want changed transcript or analysis inputs to invalidate their dependent derived outputs, so that statistics and search are rebuilt without unnecessary retranscription.
45. As an operator, I want lemma analyses versioned separately from original transcript text, so that an analysis change can be applied without losing the recognition output.
46. As an operator, I want catalog, transcript, statistics, and search artifacts to refer to the same publication state, so that visitors do not combine incompatible data.
47. As an operator, I want public build outputs separated from audio, model, and runtime caches, so that the repository and static site contain the intended data only.
48. As an operator, I want a build that works at the site root and a GitHub Pages project subpath, so that deployment location does not break asset loads or shared links.
49. As an operator, I want fixture-based checks to run on Windows and Linux without large downloads or a GPU, so that ordinary code changes receive fast, repeatable feedback.
50. As a pilot reviewer, I want ten independently reviewed passage searches with expected episodes recorded, so that search acceptance is based on known examples rather than generated assertions.
51. As a pilot reviewer, I want reference timestamps near the beginning, middle, and end of every pilot Folge, so that accumulated drift is detected.
52. As a pilot reviewer, I want real local FP32 GPU runs recorded separately from fixture checks, so an available provider or passing model double is not mistaken for working inference.
53. As a pilot reviewer, I want mobile timing, bytes, and memory observations tied to a documented profile and cache state, so that performance claims can be reproduced.
54. As an operator, I want archive processing withheld when a required pilot gate fails or lacks evidence, so that incomplete verification cannot authorize a costly full run.

## Implementation Decisions

### Scope and existing foundations

The agreed first delivery is the five-Folgen pilot, including the ASR and Pagefind integration proofs needed to make it real. Reuse and extend the current installable Python package, CLI, episode validator, schema export, React/TypeScript/Vite app, locks, and shared offline checks. Recharts supplies charts; Pagefind supplies the static lexical index and search API. Integrations are added with their real compatibility checks rather than assumed working because a package installs.

Keep one podcast in the pilot: DAS PODCAST UFO. Preserve per-podcast data namespaces and reusable formats for later additions without implementing a multi-podcast product interface now. The production architecture remains static files with no running database or custom request-time API. Recognition happens during an operator-triggered update, never during visitor search.

### Catalog and stable identity

Use the configured [publisher-linked Acast feed](https://feeds.acast.com/public/shows/podcast-ufo). Follow redirects and preserve all entries, including special titles and `UGO081 Freestyle Karate`. Capture the dated catalog, GUIDs, audio enclosures, and processing/source state. The earlier observation of 537 feed entries is historical evidence, not an invariant or future acceptance count.

Derive initial stable episode identity from podcast identity and RSS GUID; use an explicitly assigned stable source key for a verified supplemental source without a GUID. Preserve the assigned identity as required by ADR 0001. A later verified GUID becomes an alias; title, episode number, and audio URL are mutable metadata and never sufficient evidence to merge records. Duplicate GUIDs and malformed enclosures must produce explicit, actionable findings rather than data loss.

Retain known episodes and completed transcripts when a subsequent feed omits them. Represent current source/audio availability separately from preservation of the record. Metadata reconciliation must leave recognized text and timings intact unless an explicit retranscription is selected.

Investigate an actually retrievable source for Folge 37. A historic HTML playback page or a guessed URL is not sufficient proof of downloadable episode audio. If no source can be verified, record a Quellenlücke without blocking the pilot. A Quellenlücke is distinct from failure to process an available selected episode. The five pilot episodes must be real available inputs; the catalog may describe a larger inventory without implying those other episodes have been processed.

### Audio processing, recognition, and runtime evidence

Use Parakeet-TDT-0.6B-v3 through onnx-asr with pinned revisions and local FP32/CUDA. Python 3.12, Windows GTX 1050 Ti and the tested CUDA-11 runtime are the supported processing path; approximately 25× real time is the planning value. VAD and NumPy preprocessing run on CPU.

Decode feed audio explicitly into the model's supported input. Keep temporary audio and models outside versioned source. Bound download time and retries; load the model once per processing run. Long episodes use speech-activity segmentation, while all saved segment and token times refer to the original episode timeline. Establish the pinned recognizer's time units and reference frame before converting them exactly once. Native token points must not be mislabeled as guaranteed word start/end intervals.

Store schema version, podcast and episode identity, source provenance and aliases, display metadata, audio URL/checksum/duration, model/export/runtime provenance, and recognition time. Preserve original recognized text and ordered segments with stable within-episode IDs. Retain available native token points. Validate finite time values, bounds, ordering, unique IDs, and required provenance before treating an episode as complete. Extend the existing contract deliberately when needed and keep its structural export consistent; do not bypass semantic validation by relying solely on JSON Schema.

Select five representative episodes and record why they exercise useful variation in age, duration, audio conditions, or special metadata. Verify difficult excerpts and a complete episode on the supported runtime paths, then process the selected pilot set with one fixed model configuration. A successful environment check, detected GPU, or synthetic transcript is not runtime evidence.

### Durable local progress and explicit reruns

Keep operator starts manual. A completed episode requires a successfully persisted and validated result. An interruption or partial write must never be interpreted as completion or silently replace a previously valid result. A restart skips completed episodes and permits failed or incomplete work to be retried.

Use the public local processing commands, retain each exact transcribed audio version by content hash, and persist validated completed episodes before proceeding. Resume skips completed results. Runtime prerequisites and explicit retranscription are documented in the local ASR guide.

Import validates episode identity and provenance before accepting results. Identical existing results are skipped. Conflicting existing results are reported with sufficient context for an explicit decision, without silent overwrite. Finished transcripts remain preserved when metadata or the chosen default model configuration changes; report the mismatch and require explicit selection for retranscription.

Track the revisions and content inputs consumed by each stage. A transcript change invalidates its dependent analysis and publication outputs; an analysis-version change invalidates analysis-derived output without rerunning ASR. Routine metadata updates must not trigger recognition. Results from incompatible processing configurations must not silently become one allegedly uniform pilot.

### Word analysis and publication artifacts

Use spaCy with the pinned German large model. Alphabetic token occurrences, including stopwords, contribute to Gesamtwörter. Lowercase lemmas define verschiedene Wörter and neue Wörter, also including stopwords. Determine first occurrence by publication date and then stable episode identity, not processing order. Preserve original transcript text independently of normalization and lemmatization.

Cache and version analysis per episode. Produce catalog, vocabulary, aggregate and episode statistics, sparse lemma-to-episode counts, transcripts, and search output. Start with 64 count shards per podcast and include each lemma's shard assignment in the vocabulary. Use sufficiently large ordinary integer counts. A missing entry for a known word/episode pair means zero; failed retrieval or incompatible data means an error. If an episode has no countable words, its normalized rate is unavailable rather than a division by zero.

Give all public artifacts an identifiable common publication state and reject a build that mixes incompatible catalog, transcript, analysis, or index inputs. Construct public output intentionally from the versioned normalized episode and analysis data; exclude runtime checkpoints, temporary audio, and model weights. Keep generated web and search builds untracked. Preserve the agreed build budget: warn above 800 MB and reject a publication artifact above 1 GB. This pilot checks artifact construction, not public deployment.

### Search contract and lazy loading

Build one virtual German-language HTML document per episode containing spoken transcript text. Stable segment anchors associate indexed positions with episode times. The result route points to the app; physical episode HTML pages are unnecessary. Titles and metadata may identify results but must not be counted as spoken words or create false spoken-term coverage.

Search each distinct nonempty, case-insensitive input Stichwort separately, union the returned episode candidates, and rank them by the number of distinct query terms found. For three terms, 3/3 precedes 2/3 and 1/3. Within equal coverage, use the sum of Pagefind result ranks, lower first, then publication date descending and stable episode identity as the deterministic final tie-breaker. Preserve Pagefind's German stemming; do not discard valid inflection matches using an exact-spelling filter. Search matches are not exact lemma counts.

Initially load details for only the first ten results and load further details on demand. Compute global coverage from raw result-ID lists. Establish a compact mapping from index-scoped search IDs to episode identity and date, or prove an equivalent way to apply the complete ranking before loading all candidate fragments. Search IDs are not permanent episode identity and cannot be reused across index builds without their corresponding mapping.

Use a real small Pagefind index to prove the mapping, complete sort, multiple-term positions, and segment anchoring early. Preserve positions for each query term rather than assuming result-detail objects are immutable across searches. Handle matches across adjacent transcript segments. Within already loaded or opened episodes, favor passages with nearby distinct terms while making every matching Fundstelle accessible. Do not require loading every transcript for a global proximity sort.

Represent empty input, loading, no match, partial coverage, fetch failure, and missing episode state explicitly. A superseded query cannot overwrite a newer one. Errors must not cause automatic reload or retry loops.

### Statistics, player, and shareable navigation

Offer bounded vocabulary suggestions and multiple selected Grundformen. Hide stopwords from suggestions by default and provide a toggle; this control changes neither Gesamtwörter nor the denominator used for normalized rates. Default frequency trends to occurrences per 1,000 Gesamtwörter of the episode, with an absolute-count alternative. Present Top-10-Folgen, total counts, distinct lemmas, and first-occurring lemmas with clearly labeled meanings and units.

Show episode title, publication date, original transcript context, matched Stichwörter, and time for Fundstellen. Use a shared audio player with a short lead-in and forward/backward controls. Start playback only following a user action. Handle unavailable audio with a visible error and the original episode link. Shared query parameters encode stable episode identity and seek time, work on direct navigation, and do not cause automatic playback.

All app assets, static data, Pagefind imports, result routes, and episode/time navigation must work both at the origin root and below a GitHub Pages project prefix. Make search, statistics, and playback usable on a mobile viewport. Show the pilot's data state and a short explanation of machine-transcript accuracy and time alignment to the transcribed audio version. Do not imply that later ad-inserted audio has been automatically resynchronized.

### Delivery order and completion state

Prove real ASR timestamp/runtime behavior and real Pagefind ranking/position behavior before relying on them throughout the pilot. Integrate the source catalog, durable processing/import workflow, analysis, static build, and browser behavior into a verifiable end-to-end pilot. Preserve the existing Windows/Linux offline check workflow and use locked dependencies; fixture checks and ordinary web builds must not download model weights or transcribe real episodes.

The user has confirmed both public test boundaries, and this spec is ready for ticket decomposition. Implementation is complete only after the five real episodes, required runtime reports, automated behavior checks, manual quality evidence, measured mobile targets, and root/project-prefix build checks are present. A required external runtime or human review that has not happened remains explicitly pending; neither ticket nor spec completion can be inferred from scaffolding alone.

## Testing Decisions

### Confirmed public test boundaries

Use two high-level boundaries for new feature behavior. Keep the existing episode-contract tests as established coverage, but avoid introducing a separate unit-test seam for every helper or internal module.

1. **Processing command to validated publication artifacts.** Extend the existing public CLI and exercise the processing/build workflow from declared inputs through persisted outputs, exit status, and diagnostics. This covers catalog identity and source gaps, download/processing failures, completion and restart, saved-result provenance conflicts, provenance, timestamp normalization, analysis counts, invalidation, and coherent publication/index metadata. It does not establish subjective recognition accuracy or prove a real GPU executes inference when those external operations use controlled fixtures.
2. **Built static site in a browser.** Serve the actual built app with generated data and a real Pagefind index. Test searches, ordering, lazy detail loads, all accessible Fundstellen, vocabulary selection, statistics, direct links, fetch errors, superseded requests, and audio controls through visible UI, URLs, browser requests, and media state. Exercise root and project-prefix builds. This covers producer/consumer integration and visitor behavior; it does not establish the accuracy or continued remote availability of publisher audio.

Real local FP32 GPU checks, manual listening and performance measurements use the same public paths with real inputs. They are separate integration evidence; ordinary checks remain fixture-only.

### Test quality and prior art

Assert external behavior against independently worked expectations, fixed known examples, or human-reviewed references. Avoid private-method tests, internal call-count assertions, implementation-shaped mocks, and expected output computed by the same production logic being tested. Use deterministic inputs at genuinely external boundaries such as HTTP, model output, or browser media where an offline test requires them, while retaining separate live integration proof.

Existing public episode-model tests already check provenance, finite absolute token times across a long pause, ordering and bounds, and duplicate IDs. Existing CLI tests check validation status across both valid and invalid files. Reuse these fixture and invalid-input patterns. The current synthetic web example is not prior art for a passing browser behavior suite; add browser tests around the implemented site rather than treating its successful bundle as an end-to-end test.

The processing boundary tests the catalog/provenance, ASR normalization and run state, analysis, and static-publication responsibilities through their public outputs. The browser boundary tests the actual search/index integration, statistics, and player/navigation responsibilities. The Python contract remains authoritative for episode data; its structural schema export must stay synchronized.

### Required deterministic cases

- Catalog inputs include special prefixes, no-prefix special episodes, duplicate GUIDs, malformed enclosures, supplemental sources, a verified later GUID alias, a subsequent feed omission, and an explicit unresolved historical source gap. Do not hardcode the historical feed item count as a live requirement.
- Simulate download failure, interruption before durable completion, restart, repeated processing, identical import, and conflicting import. Verify preserved valid results and appropriate exit status. Verify metadata changes and changed analysis settings do not trigger recognition, while consumed-data changes invalidate the appropriate derived outputs.
- Use controlled multiple speech sections and long pauses to verify absolute episode time and reject invalid relative, nonfinite, reversed, overlapping, or out-of-duration data through the existing semantic contract. Test against known time values rather than the adapter's own conversion formula.
- Work out lemma/count examples independently, including counts above 255, stopwords, changed analysis versions, publication-date ties, processing-order independence, normalized frequency, and a zero-word episode. A failed shard load is not a zero count.
- Build a real controlled Pagefind corpus with more than ten candidate episodes to verify the full coverage ordering, rank/date/identity ties, result-detail loading limit, case, duplicate terms, German inflections, umlauts, sharp S, repeated occurrences, segment-boundary passages, and title-only words excluded from spoken coverage.
- Observe browser requests to ensure opening the site and computing coverage do not fetch the entire transcript collection. Exercise stale query responses, failed data/index loads, unknown direct episode links, unavailable media, user-triggered playback, seek targets, and back/forward controls without self-triggered reload loops.
- Verify statistics keep their agreed denominator and total counts when the stopword suggestion toggle changes. Test exact lemma statistics independently of approximate search results.
- Run the same offline processing checks and production web checks on Windows and Linux. Use small data and avoid model/audio downloads in the normal check path. Real recognition is an explicitly selected integration run.

### Real pilot acceptance and evidence

**Runtime and inputs:** Record the five selected real episodes and rationale, source snapshot, exact reference audio/checksum/duration, pinned model/export/runtime configuration, actual local GPU sessions and durable completion/resume evidence. Keep heavy inputs untracked while retaining reports and normalized results.

**Search quality:** Record ten manually reviewed passage queries with expected episode identities and reference passages before scoring the final run. At least nine must find the correct episode among the first five results. A result-count assertion or query generated only from the recognizer's own output is not a replacement for independently reviewed references.

**Time accuracy:** For each pilot episode, record a reference passage near the beginning, middle, and end: fifteen reference checks in total. Each mapped transcript time must be within five seconds of its reference in the exact transcribed audio version. Evaluate the mapped passage time separately from the player's deliberate lead-in. Do not treat later advertisement changes as evidence that the transcript time conversion was correct or incorrect for its original input.

**Performance:** On a documented mobile browser/device or emulated profile, record viewport, network bandwidth/latency, CPU conditions, cache state, query, timing start/end, transferred bytes, and browser memory observations. The first usable results must meet the agreed five-second target, subsequent searches the one-second target, and transfer through the first results the 10 MB budget. Include relevant startup/prewarming transfers in the payload report rather than hiding them behind measurement start. First results must be usable with their required visible context, not merely an unloaded candidate count.

**Build and coherence:** Produce a complete static pilot artifact from one publication state, pass the existing offline checks and new confirmed boundary checks, and verify app/data/index/media-link behavior at root and project prefix. A partial or failed build is not the completed pilot.

All required gates need recorded outcomes. Failure or missing required evidence prevents pilot completion and any claim that bulk processing is approved by the pilot. A five-episode top-five check is a small-corpus recall check; the larger controlled search corpus validates ranking behavior, and the later full archive must undergo its own quality and performance qualification.

## Out of Scope

- Bulk transcription of the entire available archive or a public launch claiming archive completeness.
- Creating a remote repository, supplying hosting credentials, or publishing the pilot publicly as part of this spec.
- Migrating old transcripts, word counts, episode identities, or database schemas.
- A new ASR model competition or mandatory local GTX 1050 Ti acceleration.
- Semantic/synonym search, exact-quotation search, or a global proximity ranking that loads every transcript.
- Comprehensive manual transcript correction, speaker identification, or synchronization between audio versions with different inserted advertisements.
- Scheduled unattended processing, a custom live HTTP API, a running database, or paid hosting/notebook infrastructure.
- A multi-podcast visitor interface or processing additional podcasts during the pilot.
- Demonstrating that five episodes satisfy full-archive scale, size, or performance requirements; these checks must be repeated after the later archive build.

## Further Notes

This spec synthesizes the confirmed project plan, completed planning interview, existing domain glossary, stable-identity ADR 0001, current workspace contracts, and dated source/runtime research. It does not reopen settled product decisions. Exact processing commands, internal module layout, episode selection, and the reproducible mobile measurement profile are implementation details to establish and document while delivering the confirmed behavior.

The known integration questions are concrete work: demonstrate the pinned ASR timestamp reference frame and supported runtime providers, and demonstrate the Pagefind metadata/position strategy without eagerly loading all candidate details. Research notes are starting evidence, not proof that either integration has already passed.

The subsequent ticket breakdown should create independently verifiable vertical slices with explicit blockers, retain the real runtime/manual acceptance work, and prevent downstream archive work from bypassing the pilot gates. Do not mark an externally blocked runtime or manual review as complete because its instructions have been written.

The repository uses a local Markdown tracker with the default triage vocabulary. The user has confirmed both public test boundaries. This spec is published as ready-for-agent for ticket decomposition; additional triage is unnecessary. Later branch/worktree execution requires a committed baseline; this spec-writing step does not create commits or start implementation.

## Comments

2026-10-17: Implementation uses `integration/podcast-words-pilot` and isolated ticket worktrees. After usage-limit interruptions, the user requested smaller subagent models to reduce token use. Subsequent subagent runs explicitly use `gpt-6-luna` with high reasoning effort and context pointers. Earlier runs inherited the coordinator's model and effort without explicit overrides; their resolved model/effort values were not exposed by the agent tools. Individual tickets remain authoritative for execution status and evidence.

2026-10-24: The local FP32 runtime and transcript quality decision supersede the former remote-runtime frontier. Tickets 10 and 11 are archived; 19 records the completed investigation. Independent five-episode selection, reference timestamps, search quality and mobile performance remain required before archive processing or publication.

The [interim review](interim-review.md) compares the original baseline through `52a986b`; its two Spec defects and one Standards judgment call were fixed and integrated through `f24a253`. Both original reviewers rechecked their respective fixes and found no remaining consequential issue in those paths. Integrated verification: 70 Python tests, lint/format, documentation/notebook checks, web lint and both production builds passed. The 35 browser cases at each path were previously passed by the unchanged UI; the fixes preserved the root publication ID. The existing real UFO537 CPU artifact also passed the new legacy-resume path with an explicit diagnostic and unchanged SHA-256, without recognition or downloads.

All newly assigned/reused smaller agents used `gpt-6-luna` at high effort. Only the main Git worktree remains registered; ticket branches and the mobile screenshot under `.cache/artifacts/` are retained. Source/build worktree files were removed, while Windows permissions prevented removal of some ignored pytest/temp caches under `.cache/worktrees/`. Model/audio caches were preserved outside removed worktrees.
