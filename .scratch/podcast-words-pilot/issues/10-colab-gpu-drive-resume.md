# 10: Resume the shared workflow on Colab GPU and Drive

**What to build:** An operator can manually start the same processing workflow in Colab, persist each completed episode on Drive, and resume in a new session with a verified GPU provider.

**Blocked by:** 09: Resume selected episode processing without losing work.

**Status:** ready-for-agent

**Spec coverage:** User stories 37, 38, 39, 40, 41, 52 of the confirmed five-episode pilot spec. Its settled decisions and confirmed public test boundaries apply.

**Verification:** The same public CLI invoked by the thin notebook, validated Drive checkpoints, and a separately captured actual Colab execution report.

**Human involvement:** The operator must make a Colab runtime and Drive available and start the notebook. Implementation alone cannot substitute for the real run evidence.

- [ ] Keep the notebook thin and use the shared Python package/run-resume commands rather than reimplementing the pipeline.
- [ ] Establish a locked compatible GPU runtime for the same model/export configuration; record the allocated GPU, driver/runtime facts, and execution provider actually used for inference.
- [ ] Keep temporary audio on the VM and persist a validated completed result to Drive after each episode before proceeding.
- [ ] Demonstrate a new-session resume from durable Drive results without reprocessing completed episodes; partial results remain explicitly incomplete.
- [ ] Record difficult excerpts and at least one complete real episode on Colab GPU, including absolute-time behavior across speech sections and pauses.
- [ ] Document actual start, resume, checkpoint, and result-transfer steps; unavailable GPU access or a notebook that has not run stays an unmet criterion.
- [ ] Keep live Colab/Drive/GPU work separate from the fixture-only Windows/Linux check path.
