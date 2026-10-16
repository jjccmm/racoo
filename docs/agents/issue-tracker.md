# Issue tracker: Local Markdown

Specs and issues live as versioned Markdown in `.scratch/`. These files are tracker records, not disposable cache files.

## Files

- Feature spec: `.scratch/<feature-slug>/spec.md`.
- Implementation tickets: `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01` in dependency order. Use one file per ticket.
- Each ticket records `Status:` and `Blocked by:` near the top; bold Markdown field names are also accepted. Blockers reference ticket numbers in the same feature or explicit paths across features.
- Append comments and evidence under `## Comments`; preserve earlier discussion.
- `TASKS.md` remains the project-level outline. The feature spec and individual tickets carry the detailed requirements and execution state.

## Tracker operations

- **Publish:** create the appropriate spec or ticket file, creating its directory when needed.
- **Fetch:** read the referenced file and all comments. Resolve a bare number within the current feature; ask if it is ambiguous.
- **List:** inspect feature ticket files and filter by their status and blockers.
- **Claim:** only start a `ready-for-agent` ticket when every blocker is `resolved`; record `Status: claimed` before work. During `implement-spec`, the coordinator owns assignment and the integration branch's tracker state is authoritative.
- **Resolve:** meet the acceptance criteria, record checks and commit references under `## Comments`, check off satisfied criteria, and set `Status: resolved`. Completion must include integration into the integration branch when that workflow is in use.
- **Close without implementation:** use `Status: wontfix` and record the reason. This does not satisfy another ticket's implementation dependency.
- **Resolve a spec:** mark it `resolved` after every required ticket is resolved and the integration review and checks pass. Keep the files as history.

Triage statuses use the [configured vocabulary](triage-labels.md). `claimed` and `resolved` are additional execution states, not triage labels. Incoming reports may record `Category: bug` or `Category: enhancement`.

## Wayfinding records

When `wayfinder` is explicitly used, its map is `.scratch/<effort>/map.md`; child decision tickets live under that effort's `issues/` directory. Record their `Type: research`, `prototype`, `grilling`, or `task` and the same blocking and execution states. On resolution, append the answer under `## Answer` and a brief linked decision to the map.
