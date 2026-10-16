# Domain docs

This repo has one domain context, shared by the Python pipeline and web app.

## Before exploring

Read the root [GLOSSARY.md](../../GLOSSARY.md) and the ADRs under `docs/adr/` that concern the task. The existing stable-identity decision is [ADR 0001](../adr/0001-stabile-folgenidentitaet.md).

Use the glossary's meanings in specs, tickets, tests, and implementation. When a needed concept is missing or ambiguous, resolve its meaning before adding it through `domain-modeling`. Keep the glossary limited to domain definitions; implementation details belong in the plan, contracts, or relevant technical documents.

If a proposed change conflicts with an ADR, identify that ADR and explain the trade-off before changing the decision. Preserve the rationale in an updated or superseding ADR when the decision is revised.

## Layout

The glossary lives at `GLOSSARY.md`; decisions live under `docs/adr/`. There is no multi-context glossary map. If a referenced domain document is absent in a future checkout, proceed silently; create it lazily only when a term or qualifying decision is resolved.
