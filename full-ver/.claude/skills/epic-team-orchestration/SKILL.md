---
name: epic-team-orchestration
description: >
  DEPRECATED (team-based parallel execution): This skill previously defined team-based
  multi-implementer orchestration. As of ADR-0010 amendment (2026-03), /epic-autopilot
  uses serial execution in the main session. Retained for reference; active patterns
  moved to epic-autopilot.md.
  See: docs/02_architecture/adr/0010_epic_autopilot.md
globs:
  - ".claude/commands/epic-autopilot.md"
alwaysApply: false
---

# Epic Team Orchestration (Simplified — Serial Execution)

> **Status: Simplified.** Team-based parallel execution (TeamCreate/TeamDelete/SendMessage) has been
> removed from `/epic-autopilot`. The command now runs serially in the main session.
> This skill is retained for the patterns that remain relevant: file scope detection,
> human review gates, context persistence, and error handling.
>
> See `.claude/commands/epic-autopilot.md` for the current implementation.

## File Scope Detection

Used by `/epic-autopilot` Step 2a to estimate which files each Issue will modify.

### Scope Detection Priority

1. `.specify/specs/<id>/tasks.md` `files:` metadata (most accurate)
2. Issue Body Impact Points checklist
3. Issue title/label inference (fallback)
4. **Unknown → treat as overlapping** (safe-side fallback — triggers PR merge wait)

### Scope Output Format

```json
{
  "issues": {
    "#123": { "files": ["src/features/auth/"] },
    "#124": { "files": ["src/features/search/"] }
  },
  "overlapping_pairs": [],
  "unknown_scope": ["#125"]
}
```

**Rules:**
- Overlapping file scopes → PR merge wait before next Issue (AskUserQuestion)
- Shared files (index.ts, container.ts, schema.prisma) → always treated as overlapping
- Unknown scope → treated as overlapping (safe-side)

## Human Review Gates

Used by `/epic-autopilot` Steps 3a and 3e.

### Gate Triggers (priority order)

| Condition                                   | Action        | Timing                |
| ------------------------------------------- | ------------- | --------------------- |
| Label: `spike`                              | Human review  | After execution       |
| Title: `[Spike]` or `[設計]`                | Human review  | After execution       |
| Label: `architecture`                       | Human review  | After design          |
| Label: `security` or `auth`                 | Human review  | After implementation  |
| DB migration changes                        | Human review  | Before implementation |
| API breaking changes                        | Human review  | Before implementation |
| `execution-plan.json`: `human-review: true` | Human review  | At specified time     |
| None of above                               | Auto-continue | -                     |

### Gate Implementation

```
main session:
  1. Execute Issue implementation via implementer subagent
  2. Display results summary and PR URL
  3. AskUserQuestion:
     - "承認して次に進む"
     - "修正指示を出す"
     - "スキップして次に進む"
  4. Route based on response:
     - 承認 → mark completed, next Issue
     - 修正 → apply feedback, re-run implementer
     - スキップ → mark skipped, next Issue
```

## Context Persistence

### Storage Locations

| Method                        | Content                                     | Update Timing                   |
| ----------------------------- | ------------------------------------------- | ------------------------------- |
| Epic Body (`gh api PATCH`)    | Execution order, progress, completed Issues | Phase 0/1, each Issue completion  |
| `.claude/autopilot/epic-<N>/` | File scope matrix, progress, review results | Phase 1, each review completion |

### Workspace Files

```
.claude/autopilot/epic-<N>/
├── execution-plan.json     # Execution order, state
├── file-scope-matrix.json  # Issue → file scope mapping
└── progress.json           # Completed Issues, PR URLs, state transitions
```

**MUST**: Add `.claude/autopilot/` to `.gitignore`. Execution state is local only.

### Epic Body PATCH Safety (MUST)

| Rule                                         | Why                            |
| -------------------------------------------- | ------------------------------ |
| Validate body ≥ 100 chars before PATCH       | Prevent body erasure           |
| Use Python for string replacement (not sed)  | macOS BSD compatibility        |
| Pass body via temp file                      | Prevent shell expansion damage |
| Verify placeholder counts before/after       | Detect replacement failures    |
| On failure: print manual update instructions | Body update is non-critical    |

## Issue State Machine

| State           | Meaning                              | Trigger                          |
| --------------- | ------------------------------------ | -------------------------------- |
| `pending`       | Queued, not yet started              | Initial state in execution plan  |
| `in_progress`   | Currently being implemented          | Implementer subagent launched    |
| `in_review`     | PR created, awaiting merge           | PR URL available                 |
| `completed`     | PR merged, Issue closed              | Human approval gate passed       |
| `failed`        | Quality gates failed after 3 retries | 3 consecutive QG failures        |
| `human_blocked` | Awaiting human review gate           | Gate trigger condition matched   |
| `skipped`       | User instructed to skip              | User response to AskUserQuestion |

### Fail-Fast Policy

- **Per-Issue retry**: 3 retries within a single Issue → Draft PR → mark `failed`
- **Global consecutive**: 2 **consecutive** Issues marked `failed` → stop entire Epic, report to user
- **Reset**: A successful Issue resets the consecutive failure counter to 0

## Error Handling

| Error                            | Action                                | Stop?                |
| -------------------------------- | ------------------------------------- | -------------------- |
| Implementation failure (QG fail) | 3 retries → Draft PR → `failed`       | 2 consecutive = stop |
| Codex rate limit                 | spark → codex → skip                  | No                   |
| Epic Body PATCH failure          | Manual update instructions → continue | No                   |
| File scope unknown               | Treat as overlapping, ask user        | No                   |

## References

- ADR-0010: Epic Autopilot Architecture (amended 2026-03: serial execution)
- `.claude/commands/epic-autopilot.md` — Current command implementation
- `.claude/commands/autopilot.md` — Single Issue pipeline (unchanged)
- `.claude/skills/epic-status-manager/SKILL.md` — Epic/Project status transitions
- `.claude/agents/issue-project-manager.md` — Status management sub-agent
