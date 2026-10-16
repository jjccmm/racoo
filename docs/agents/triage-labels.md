# Triage labels

The local tracker uses the default canonical role names as `Status:` values.

| Canonical role | Local status | Meaning |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | Maintainer needs to evaluate the issue. |
| `needs-info` | `needs-info` | Waiting for additional information. |
| `ready-for-agent` | `ready-for-agent` | Fully specified and suitable for agent implementation. |
| `ready-for-human` | `ready-for-human` | Requires human work or judgment. |
| `wontfix` | `wontfix` | Closed without implementation. |

Use these names when a skill asks to apply a triage role. Execution states and completion rules are defined in [the tracker workflow](issue-tracker.md).
