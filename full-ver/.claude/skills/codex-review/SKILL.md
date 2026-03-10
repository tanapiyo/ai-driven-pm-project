---
name: codex-review
description: Cross-model PR review using Codex MCP (GPT-based). Provides review prompt template, response parsing, and fallback handling. Triggers on "Codex review", "cross-model", "/pr-check".
globs:
  - ".claude/commands/pr-check.md"
alwaysApply: false
---

# Codex Cross-Model Review

Use Codex MCP (GPT-based) as an additional reviewer for PRs, providing a different LLM perspective alongside Claude's review.

## When to Use

- During `/pr-check` execution (automatically invoked)
- When explicitly requesting cross-model review

## Review Prompt Template

Send the following structured prompt to `mcp__codex__codex`:

```
You are a senior code reviewer. Review the following git diff for a TypeScript/Next.js monorepo.

## Review Context

Architecture rules:
- Backend: Clean Architecture + DDD (presentation -> usecase -> domain <- infrastructure)
- Frontend: Feature-Sliced Design (app -> widgets -> features -> entities -> shared)
- Security: Zod validation at boundaries, parameterized queries only, no secrets in code
- Quality: No console.log in production, no commented-out code, no magic numbers

## Diff to Review

<diff>
{DIFF_CONTENT}
</diff>

## Instructions

1. Check for security issues (hardcoded secrets, injection, missing validation)
2. Check architecture compliance (layer violations, cross-feature imports)
3. Check code quality (error handling, edge cases, naming)
4. Categorize findings as P0 (blocker), P1 (important), P2 (suggestion)
5. Question whether the change is necessary — does it solve the root cause or merely a symptom? Is there a simpler alternative?
6. Check for over-engineering or unnecessary changes beyond the stated requirements — flag any code that was not needed to satisfy the AC

Respond in this exact format:

### P0 (Blockers)
- [file:line] description

### P1 (Important)
- [file:line] description

### P2 (Suggestions)
- [file:line] description

### Summary
One-paragraph overall assessment.
```

## Context to Include

1. **Diff**: `git diff origin/main...HEAD` (with sensitive files excluded)
2. **Architecture rules**: Summarized from AGENTS.md (DDD, FSD, Security)

## Sensitive File Exclusion

MUST exclude these patterns from the diff before sending to Codex MCP:

- `.env*`
- `secrets/`
- `*.pem`
- `*.key`
- `*.secret`

Use the following to generate a safe diff:

```bash
git diff origin/main...HEAD -- . ':!*.env*' ':!secrets/' ':!*.pem' ':!*.key' ':!*.secret'
```

## Diff Size

- サイズ制限なし（Codex MCP は大きな diff も処理可能）
- diff が非常に大きい場合でもスキップせず、そのまま送信する

## Response Parsing

Parse Codex response into P0/P1/P2 sections:

1. Extract lines under `### P0`, `### P1`, `### P2` headers
2. If response does not follow expected format, treat entire response as P2 (suggestion)
3. Include raw response in output if parsing fails

## Fallback Handling

**Model Selection**: -> `.claude/skills/codex-mcp-model/SKILL.md` に従う

If Codex MCP call fails (timeout, connection error, unexpected response):

1. **Do NOT block** the PR check process
2. Log warning: `"Codex MCP review unavailable. Running Claude adversarial-enhanced fallback review."`
3. **Do NOT expose** error details (API keys, internal errors) in output
4. **Run Claude Adversarial-Enhanced Review** (see section below)
5. Add note in output: `"Cross-model review: Claude adversarial-enhanced fallback (Codex MCP unavailable)"`

## Claude Adversarial-Enhanced Review (Codex MCP Fallback)

When Codex MCP is unavailable, run a Claude-based review with a **heightened skeptical
stance** — more aggressive than the standard adversarial review in Phase 6 Step 2 — to
compensate for the missing cross-model perspective.

### Stance

Apply maximum skepticism. Default posture: **assume something is wrong until proven correct.**

### Mandatory Review Dimensions

Evaluate the diff against ALL of the following:

1. **Root cause validation** — Does the change fix the actual root cause, or only a symptom?
   Ask: "If this change is reverted, does the bug/gap resurface immediately?" If yes, the
   root cause is addressed. If no, flag as P1 (or P0 if critical).

2. **Over-engineering detection** — Does every added line of code map to a stated AC item?
   Enumerate each AC and flag any code that cannot be traced back to an AC as unnecessary
   over-engineering (P1 by default, P0 if it introduces risk).

3. **AC independent verification** — Re-read each AC item verbatim. For each one, identify
   the specific code that satisfies it. If no code satisfies an AC, flag as P0. Do NOT rely
   on the implementer's self-assessment.

4. **Change necessity** — Question whether the change is needed at all. Could the AC be
   satisfied with fewer files changed? Is there a simpler alternative approach?

5. **Blind-spot scan** — Look for subtle bugs or edge cases the implementer might have missed:
   - Off-by-one errors, null/undefined paths, missing error handling
   - Race conditions or incomplete async flows
   - State left in an inconsistent state on partial failure
   - Missing rollback / cleanup paths

6. **Architecture compliance** — Verify Clean Architecture layer boundaries and FSD slice
   rules are respected. Flag any dependency inversion violations as P0.

7. **Security regression** — Check for any new attack surface introduced (injection, auth
   bypass, secret exposure, missing Zod validation at boundaries).

### Output Format

```markdown
### Claude Adversarial-Enhanced Review (Codex MCP Fallback)
- Source: Claude (adversarial-enhanced, Codex MCP unavailable)
- P0 (Blockers): ...
- P1 (Important): ...
- P2 (Suggestions): ...
- Note: Cross-model findings are advisory, not blocking by default
```

### Non-Blocking Guarantee

This fallback review MUST NOT block the pipeline. Even if P0 issues are surfaced, the
caller decides whether to fix and re-run or proceed to PR creation as a Draft.

## Output Format

When successful, append to PR check results:

```markdown
### Codex Cross-Model Review
- Source: Codex MCP (GPT-based)
- P0 (Blockers): ...
- P1 (Important): ...
- P2 (Suggestions): ...
- Note: Cross-model findings are advisory, not blocking by default
```

## Subagent Usage (CLI Fallback)

MCP ツールはサブエージェントでは利用不可。サブエージェントから Codex レビューを実行する場合は `codex exec` を使用する。

### Prerequisites

- サブエージェントは Bash が使える型（`general-purpose` 等）で起動すること
- Read-only エージェント（`code-reviewer`, `architect` 等）からは実行不可

### CLI Review Template

```bash
# 1. Safe diff を取得
DIFF=$(git diff origin/main...HEAD -- . ':!*.env*' ':!secrets/' ':!*.pem' ':!*.key' ':!*.secret')

# 2. Codex CLI で review 実行
codex exec \
  -m gpt-5.3-codex-spark \
  --ephemeral \
  -s read-only \
  -o /tmp/codex-review-result.txt \
  "You are a senior code reviewer. Review the following git diff for a TypeScript/Next.js monorepo.

## Review Context
Architecture rules:
- Backend: Clean Architecture + DDD
- Frontend: Feature-Sliced Design
- Security: Zod validation at boundaries, parameterized queries only

## Diff to Review
<diff>
${DIFF}
</diff>

## Instructions
1. Check for security issues
2. Check architecture compliance
3. Check code quality
4. Categorize findings as P0 (blocker), P1 (important), P2 (suggestion)
5. Question whether the change is necessary — does it solve the root cause or merely a symptom?
6. Check for over-engineering or unnecessary changes beyond the stated requirements"

# 3. 結果を読み取り
cat /tmp/codex-review-result.txt
```

### Team Composition Pattern

```text
チーム構成（PR チェック時）:
├── code-reviewer (read-only) ── Claude レビュー
├── security-auditor (read-only) ── セキュリティ監査
├── codex-reviewer (general-purpose) ── Codex CLI で GPT レビュー ← Bash 必須
└── team-lead ── 結果統合
```

## Security Notes

- Diff is sent to Codex MCP via local stdio transport (no network exfiltration)
- Sensitive files are excluded before diff generation
- Prompt template uses explicit delimiters (`<diff>...</diff>`) to mitigate prompt injection
- MCP tool parameters specify `sandbox: "read-only"` for safety
- CLI mode uses `-s read-only` sandbox for safety
- Error messages never expose internal details
