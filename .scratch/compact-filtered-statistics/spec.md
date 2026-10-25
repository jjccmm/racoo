# Compact, filtered word-frequency publication

**Status:** implementing

## Authorization and scope

The user requests local tickets followed immediately by implementation through the to-tickets and implement/implement-spec workflows. This supersedes the old optional stopword toggle. Complete the two vertical slices and the integrated real five-episode check; no further approval interview is needed for this expressly authorized scope.

## Confirmed behavior

- Keep stable Episode IDs in saved transcripts, analyses, links and the public statistics catalog. Publish sparse count pairs as `[episodeIndex, count]`, using the zero-based position in the same publication's chronologically ordered catalog episodes array. The index has meaning only within that publication, never as a persistent identity.
- Bump the public statistics envelope to schemaVersion 2; update all producers, build validation, browser consumers and representative tests together. Episode JSON remains schema v2 and full saved Analysis remains schema v1. Count values remain safe positive integers, including values above 255. Missing combinations are zero; failed or malformed files are errors. Reject noninteger, negative, duplicate and out-of-range indices, mixed publications and old statistics formats.
- Preserve exactly the current frequency chart, top ten, absolute counts, counts per 1,000 total words and zero-count episodes after index decoding. Order the catalog deterministically by publication date then stable ID, including when input order changes.
- Exclude automatic spaCy stopword lemmas and manually ignored lemmas from the published frequency vocabulary AND count shards. If any selected analysis flags a lemma as a stopword, exclude that lemma throughout the selected publication. Do not merely hide suggestions in the browser.
- Maintain additional ignored lemmas in one tracked UTF-8 text file shipped with the Python package: one lemma per line, blank lines and whole-line # comments allowed. Trim, normalize NFC, lowercase and deduplicate entries; reject nonalphabetic/multiword entries with useful file/line errors. Seed only the observed fillers `äh` and `ähm`. Document the exact file and editing workflow.
- All ordinary publishing routes use this list by default, including analyze --publish, publish --cache-only and normal/fixture Vite builds. Support an explicit --ignored-lemmas override for operator experiments. List changes require only republication/rebuild from saved analyses, without ASR or spaCy. A malformed or missing explicitly requested list fails visibly, preserving an existing selected publication.
- Include the effective normalized exclusion policy/list in the statistics identity. Equal effective lists produce equal identities; an actual policy/list change invalidates the identity even when a listed word has no occurrence. Existing publication binding still protects catalog/index coherence.
- Preserve the complete source transcript, Pagefind search corpus and saved analyses. Total words, distinct words and chronological new words remain defined over all alphabetic lemmas including excluded words. Normalized frequencies still divide by all alphabetic word occurrences, including stopwords. No model download or reanalysis is needed for this change.
- Remove the include-stopwords control. Show a clear visible website notice near the frequency selection that automatic stopwords and a maintained additional list are excluded from this comparison, while total-word metrics and their denominator include all words.
- Keep the existing 64 hash-based count shards and the single loaded vocabulary file. Document alphabetically partitioned vocabulary (load a first-letter file for suggestions, include shard pointers) and count shards ordered by global word frequency as DEFERRED options. Only implement these after measured performance problems. Discuss uneven letter/frequency file sizes, substring suggestion behavior, rebuilding and the difference between browser HTTP cache and an explicit parsed-file cache. Do not implement them, new caches, worker refactors, a database or API now.

## Existing agreed test seams

1. Public CLI to saved analysis/publication artifacts: deterministic index mapping, exact known counts, filtering, policy identity, invalid input behavior and unchanged saved analyses/transcripts. This observes published contracts, not private helpers. External models may be controlled in fixtures; no live GPU, network or model downloads.
2. Actual built browser app at root and /podcast_words_v3/: known frequencies and zero rows, exclusions and notice, malformed index/shard/publication errors and unchanged search/vocabulary metrics. These are the seams agreed in the previous pilot workflow and retained by this task.
3. Real five-episode publication rebuilt cache-only: coherent artifacts, exact raw-analysis references, list exclusions, reduced sizes and a locally reachable site. This is technical verification, not archive approval or independent search-quality review.

## Task graph and coordination

01 has no blockers. 02 is blocked by 01 because both change the same publication contract and browser consumer; each remains independently usable. Implementer subagents use separate branches/worktrees, apply the TDD skill at the existing seams, and merge the latest integration tip before reporting. A merger subagent integrates each completed ticket. The coordinator owns authoritative ticket statuses, plan and glossary alignment, deferred-option documentation, final checks and two-axis code review.

Integration branch: codex/compact-filtered-statistics. Fixed review baseline: 143a37b. After both implementations, run the full fixture suite once, rebuild and check the real five-episode website, review Standards and Spec separately, fix findings, close tickets with evidence, commit and remove temporary worktrees.
