# Local five-episode pilot

**Status:** resolved

## User authorization and target

The operator explicitly requests the entire implementation with subagents, after committing the previous work. The goal is a working local website that searches and analyzes five real episodes processed through the local FP32 GPU pipeline. Publishing a public site and processing the whole archive are outside this scope.

The new instruction supersedes prior requirements to preserve audio, hash-match playback, retain token timestamps or independently verify second-accurate jumps. Advertising offsets are accepted. About 25x real time remains a planning value, not a pass/fail performance guarantee.

## Confirmed behavior

- Download an episode once during processing, transcribe it, validate and store the transcript, then delete downloaded/computed audio. Clean up temporary audio after failures too. The saved transcript is the basis for search and analysis. Resume uses stored valid transcripts without downloading or checking the online audio again.
- Remove audio SHA-256 identity, content-addressed audio retention, local-file matching, browser hash verification and online-duration mismatch blocking. Model-download integrity and text/build revision hashes serve different purposes and remain where required for deterministic analysis/publication.
- Store only coarse segments: stable segment ID, text, start_seconds and end_seconds. Aggregate recognized speech in order into approximately five-minute groups, at most 300 seconds from first speech start to last speech end; split before adding a speech chunk that would exceed this. Preserve every recognized text exactly apart from joining adjacent chunks with whitespace. No word/token timestamps, no interpolation of word positions into times and no compatibility branch that continues producing fine timestamps.
- Active Episode JSON is schema version 2: audio contains only url and duration_seconds. Add required timings with download_seconds, transcription_seconds and total_seconds, all finite and nonnegative. Remove input_revision tied to audio bytes. Configuration/transcript revisions may remain based on persisted transcript content/configuration. Update producers, consumers, exported schema and active fixtures together. Historical investigation evidence is historical, not active application input.
- Transcription uses existing pinned local FP32/CUDA runtime, CPU VAD/NumPy preprocessing and one shared model per batch. No CPU/INT8 or remote inference workflow is introduced.
- Always persist download and transcription durations per completed episode. Always print a human-readable console line identifying the episode, audio duration, total elapsed episode time, download seconds per audio minute and transcription seconds per audio minute. Model setup is shared and reported separately; define the timing boundaries so nested times are not double-counted. Keep machine-readable CLI output usable by writing progress to stderr.
- Public compact statistics catalog includes episode durationSeconds and timings with downloadSeconds, transcriptionSeconds, totalSeconds. The website can show the five episodes and their download/transcription timings without eagerly downloading all transcripts. Missing timing data in explicitly synthetic/legacy fixtures must not be fabricated as real measurements.
- Search keeps multiword coverage ranking, German word forms, lazy loading and lexical positions. Playable Fundstellen map to the matching coarse segment start, with one clear action per segment rather than duplicate word-time buttons. Every jump action has a visible adjacent hint that it starts at the segment beginning and advertising may shift the online audio.
- The common online player, source page and shared episode/time links remain usable. Remove local audio file upload and every later identity/duration check against the transcribed MP3.
- Use the five already prepared representative candidates: UFO001 Prolog, UGO081 Freestyle Karate, UFO300 Moll, UFO Experiment (KI-generiert), UFO537 Festival. Process the actual feeds afresh using one local GPU worker; keep the explicitly artificial episode correctly identified by its published title. Obtain real word counts using the pinned German spaCy model.
- A normal documented local build/start must show the five real episodes, search and statistics, not silently fall back to the synthetic corpus. Routine checks explicitly select controlled fixtures and remain independent of GPU/network/models. Generated publication/build data remains untracked; normalized transcripts, analyses and the pilot selection are versioned.
- Demonstrate technical search queries against the real five-episode build and record source/result identities plus actual timings. These checks do not pretend to be independent human accuracy review. The user's accepted coarse timeline replaces the old fifteen five-second timestamp gate for this local pilot; broader archive approval remains separate.

## Tests at existing agreed public seams

1. CLI to persisted Episode JSON, reports and filesystem: compact text preservation, durations/normalized console output, cleanup on completion/failure and resume without network. External model results may be controlled in routine tests; FFmpeg/contracts remain real.
2. Built browser app: real Pagefind coverage/segment anchors, approximate playback with an advertising hint, timing overview, lazy data loading, direct links, statistics and mobile layout at root/project base paths.
3. Actual selected processing/publication: five real FP32 transcripts, real spaCy analysis, coherent publication IDs and a locally reachable five-episode website. Run GPU inference serially.

## Task graph

- 01: Simplified coarse passage playback and episode timing overview — no blockers.
- 02: Compact transcripts, temporary audio and measured local processing — no blockers.
- 03: Reproducible five-real-episode processing and default publication — blocked by 01 and 02.
- 04: Verify and deliver the real local pilot — blocked by 03.

## Coordination

Tickets 01 and 02 are independent worktree implementations against the agreed schema/catalog shape above. Ticket 01 owns web source/tests; ticket 02 owns Python contracts/pipeline/schema/fixtures and statistics export. The coordinator owns plan/agent documentation and authoritative ticket state. Each implementation is committed, merged and checked on the integration branch before blocked work starts. The final review compares the integration branch with baseline 05885c90772e0dc3f96203cc122cd66aba93927b.

## Delivered

All four tickets are resolved on `codex/local-five-episode-pilot`. See [pilot report](../../docs/pilot/local-five-episode-pilot.md) and [separate-axis review](../../docs/pilot/review.md). The local five-episode target is complete. Mobile repeat search remains above the historical1s target under the documented throttle; independent human search quality, archive processing and public deployment remain separate.
