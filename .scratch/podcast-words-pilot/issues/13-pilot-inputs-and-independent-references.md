# 13: Select pilot Folgen and independent passage references

**What to build:** The operator and reviewer have five verified real inputs, ten remembered-word queries, and fifteen independently annotated reference passage times to use for final acceptance.

**Blocked by:** 01: Inspect and reconcile the episode catalog.

**Status:** wontfix

**Spec coverage:** User stories 32, 33, 36, 38, 50, 51 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** Human review of the actual selected audio and a saved input/reference manifest tied to verified source identities and audio checksums.

**Human involvement:** Manual audio/reference judgment is required. An agent may prepare the candidate inventory and manifest but cannot mark missing annotations as complete.

- [ ] Select five available DAS PODCAST UFO episodes from the verified catalog and record why age, duration, audio conditions, or special metadata provide useful variation.
- [ ] Verify actual retrievable audio, record stable episode/source identity, checksum and duration, and distinguish an unavailable historic source from failure on a selected available input.
- [ ] Record ten manually reviewed keyword queries, each with the expected episode identity and reference passage, independently of the recognizer's final output.
- [ ] Annotate one reference passage near the beginning, middle, and end of each selected episode: fifteen exact-audio reference times in total.
- [ ] Make query/reference records and their reviewed state unambiguous and reusable by the public acceptance workflow without versioning heavy audio.
- [ ] Leave the checkpoint ready-for-human until real reference review is supplied; generated examples or guessed times do not satisfy it.

## Comments

2026-10-16: The user requested candidate preparation and confirmed that independent references remain pending. Prepared a [candidate inventory](../../../docs/pilot/candidate-inventory.md) and [machine-readable manifest](../../../data/podcast-ufo/pilot-candidates.json), tied to the dated live catalog snapshot. All five candidate audio files were downloaded completely, SHA-256 hashed and measured with FFprobe. Heavy audio remains ignored. Selection confirmation, subjective audio review, ten independent queries and fifteen annotated times remain pending; this ticket stays ready-for-human.

Scope superseded by the operator: the current [local pilot spec](../../local-five-episode-pilot/spec.md) replaces exact-audio/timestamp gates and covers real processing, technical browser/mobile checks and readiness reporting. Historical evidence above remains; independent human search review is not claimed and archive approval remains separate. This ticket closes without asserting that the old acceptance criteria were met.
