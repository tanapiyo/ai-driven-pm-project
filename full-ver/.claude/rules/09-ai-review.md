# AI Review Rules (Always Applied)

## MUST: Post AI Review as PR Comment

Every PR created by a coding agent **MUST** have an AI review comment posted before the pipeline completes.

| MUST | Why |
|------|-----|
| Post `## 🤖 AI Review (automated)` comment on PR | Ensures review evidence is visible and traceable |
| Attempt Codex cross-model review | Provides independent LLM perspective |
| Include AC Verification table in review comment | Proves each AC has evidence |
| Categorize findings as P0/P1/P2 | Machine-parseable by coding agents |

## Review Dimensions (MUST cover all 4)

| Dimension | What to Check |
|-----------|---------------|
| **AC Verification** | Each AC has evidence (test, code, doc) |
| **Security** | Secrets, injection, validation, auth bypass |
| **Architecture** | Layer violations, cross-slice imports, OpenAPI-first |
| **Code Quality** | Error handling, edge cases, over-engineering |

## Non-Blocking Fallback (MUST)

| MUST | Why |
|------|-----|
| Never block PR merge on AI review failure | AI review is advisory |
| Record `"unavailable"` if Codex fails | Transparency without blocking |
| Post fallback comment if full review fails | Always leave a trace |

## Coding Agent Consumption (Reproducibility)

AI review comments follow a fixed structure so coding agents can:
1. Fetch: `gh pr view --json comments`
2. Parse: Look for `## 🤖 AI Review (automated)` header
3. Extract: P0/P1/P2 sections with `[file:line]` format
4. Fix: Apply minimal-diff fixes for P0 items
5. Re-push: Triggers fresh review cycle

## MUST NOT

| MUST NOT | Why |
|----------|-----|
| Skip AI review comment posting | Breaks traceability and guardrail |
| Block pipeline on Codex failure | Codex is supplementary |
| Expose raw API errors in comments | Security |
| Post review without AC Verification | AC is the primary gate |

## Detailed Reference

→ `.claude/commands/autopilot.md` (Phase 6: AI Review)
→ `.claude/skills/codex-review/SKILL.md` (Codex review prompt)
→ `.claude/skills/pr-review-governance/SKILL.md` (Review governance)
→ `docs/00_process/ai-review-pipeline.md` (Pipeline documentation)
