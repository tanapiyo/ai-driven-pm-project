---
description: Run PR checks (review, tests, security) before merge
allowed-tools: Bash, Read, Grep, Glob, Task
---

# PR Check

Run comprehensive quality checks before merge.

> **Relationship to Pre-PR review**: The code-reviewer (Step 1) and Codex MCP review (Step 1.5)
> share the same review logic as the Quality Gates `review` step. Pre-PR review runs these checks
> before PR creation to catch issues early. `/pr-check` runs them as part of the full PR gate
> (Issue link validation, frontend quality, security audit, and result synthesis).
> See: `.claude/skills/quality-gates/SKILL.md#review-step-pre-pr`

## Target

$ARGUMENTS

## Instructions

Execute ALL checks in parallel where possible:

### Step 0: Issue Link Validation (BLOCKING)

Before running quality checks, verify the PR body contains a valid issue link:

1. Read `.worktree-context.yaml` for `issue_number` if available
2. Check PR body for `Closes #<number>` pattern
3. If missing:
   - Check branch name for issue number pattern (e.g., `-357` suffix)
   - If found, warn that `Closes #<number>` should be added
   - If not found, check for documented exception (`Exception: <type>`)
4. **BLOCK** if neither `Closes #` nor documented exception is present

### Step 0.5: Frontend Change Detection

```bash
# Detect if PR includes frontend changes
FRONTEND_CHANGES=$(git diff --name-only origin/main...HEAD | grep "projects/apps/web/" | head -5)
IS_FRONTEND_CHANGE=$([ -n "$FRONTEND_CHANGES" ] && echo "true" || echo "false")
echo "Frontend change detected: $IS_FRONTEND_CHANGE"
if [ "$IS_FRONTEND_CHANGE" = "true" ]; then
    echo "Frontend files changed:"
    echo "$FRONTEND_CHANGES"
fi
```

### Step 1: Parallel Checks (run simultaneously)

Launch these agents **in a single message**:

1. **test-runner** (run_in_background: true)
   - Prompt: "Run quality gates in order: lint, typecheck, test, build. Report failures."

2. **security-auditor** (run_in_background: true)
   - Prompt: "Security audit for PR. Check: hardcoded secrets, auth changes, dependency vulnerabilities."

3. **code-reviewer** (run_in_background: true)
   - Prompt: "Code review for PR. Apply adversarial review stance: question requirements validity, verify assumptions independently, do not trust implementer claims at face value. Check: DocDD compliance, architecture alignment, test coverage, rollback safety. If frontend change detected, also check: Dark mode (all colors have dark: variants, neutral-* used not gray-*), Design system (no inline styles, design tokens used), FSD (no cross-feature imports, public API only via index.ts), UI states (Loading/Empty/Error states implemented), Screen spec (AC from docs/01_product/screens/ covered). BLOCK if: Frontend change detected but no evidence (screenshots/E2E) referenced in PR."

### Step 1.5: Codex MCP Cross-Model Review (inline, while agents run)

While waiting for background agents, run Codex MCP review:

1. **Collect safe diff**:
   ```bash
   git diff origin/main...HEAD -- . ':!*.env*' ':!secrets/' ':!*.pem' ':!*.key' ':!*.secret'
   ```

2. **Call Codex MCP**: Use `mcp__codex__codex` with the review prompt template from `.claude/skills/codex-review/SKILL.md`
   - Pass the safe diff wrapped in `<diff>...</diff>` delimiters
   - Include architecture rules summary (DDD, FSD, Security)

4. **Parse response** into P0/P1/P2 format

5. **Fallback**: If Codex MCP fails (timeout, error, unavailable):
   - Log: `"Codex MCP review unavailable. Running Claude adversarial-enhanced fallback review."`
   - Do NOT block the process
   - Do NOT expose error details
   - Run **Claude Adversarial-Enhanced Review** as defined in
     `.claude/skills/codex-review/SKILL.md#claude-adversarial-enhanced-review-codex-mcp-fallback`
   - Include fallback review results under "Codex Cross-Model Review" section with source
     label `Claude (adversarial-enhanced fallback)`

### Step 2: Collect Results

When all agents complete, synthesize findings into:

```markdown
## PR Check Results

### Quality Gates
| Gate | Status | Details |
|------|--------|---------|

### Security
- P0 (Blockers): ...
- P1 (Important): ...

### Code Review
- P0 (Blockers): ...
- P1 (Important): ...
- P2 (Suggestions): ...

### Codex Cross-Model Review
- Source: Codex MCP (GPT-based)
- P0 (Blockers): ...
- P1 (Important): ...
- P2 (Suggestions): ...
- Note: Cross-model findings are advisory, not blocking by default

### Combined Review Summary
| Reviewer | P0 | P1 | P2 |
|----------|----|----|-----|
| Claude code-reviewer | ... | ... | ... |
| Claude security-auditor | ... | ... | ... |
| Codex MCP | ... | ... | ... |

### Frontend Quality (if UI change)
| Check | Status | Details |
|-------|--------|---------|
| Dark mode | ✅/❌ | All colors have dark: variants, neutral-* used |
| Design system | ✅/❌ | No inline styles, design tokens used |
| FSD compliance | ✅/❌ | No cross-feature imports, public API only |
| UI states | ✅/❌ | Loading/Empty/Error states implemented |
| Evidence | ✅/❌ | Screenshots (light+dark) / E2E provided |

**BLOCK condition**: If `IS_FRONTEND_CHANGE=true` and no frontend evidence section in PR, BLOCK.

### Verdict
[ ] Ready to merge
[ ] Needs fixes (see blockers above)
```

### Step 3: Dependency Audit (if needed)

If security-auditor flags dependency issues:
```bash
./tools/contract audit
./tools/contract outdated
```
