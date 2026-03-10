---
name: pr-review-governance
description: >
  AC-centric pull request review for this repository. Primary gate is AC
  Verification — reviewers confirm that every AC is correctly defined and
  evidenced. Applies when reviewing PRs for acceptance criteria coverage,
  Spec/Plan/Test traceability, and rule compliance including FSD, DDD,
  OpenAPI-first, guardrails, and Golden Commands. Triggers on "PR review",
  "pull request", "受け入れ条件", "Spec", "AC", "FSD", "DDD", "OpenAPI",
  "guardrail".
globs:
  - "AGENTS.md"
  - ".github/**"
  - ".specify/**"
  - "docs/**"
  - "projects/**"
  - "tools/**"
  - ".claude/skills/**"
alwaysApply: false
---

# PR Review Governance

Review pull requests with explicit rule links and evidence.
**The primary gate is AC Verification** — confirm that every AC is correctly
defined, testable, and evidenced before reviewing implementation details.

## Quick Start

1. Run rule discovery for the current repository state.
   ```bash
   .claude/skills/pr-review-governance/scripts/discover-review-rules.sh
   ```
2. Open `references/rule-map.md` and select files relevant to changed code.
3. Verify AC definition quality first (Step 2), then review business behavior
   and architecture.
4. Report findings with `P0/P1/P2`, code evidence, and rule-source links.

## Human Reviewer Scope

> AI agents verify code form. Humans verify AC correctness.

| Responsibility | Owner |
|---------------|-------|
| lint / typecheck / test / build passing | AI (automated quality gates) |
| Code style, formatting, static analysis | AI (automated) |
| **AC が正しく定義されているか（ビジネス要件の妥当性）** | **Human Reviewer** |
| **AC Verification テーブルが存在し証跡が示されているか** | **Human Reviewer** |
| **AC がエラーパス・境界条件を網羅しているか** | **Human Reviewer** |
| ロールバック安全性・セキュリティ設計の意図 | Human Reviewer |
| 優先度・トレードオフの判断 | Human Reviewer |

## Workflow

### 1. Collect Review Context

Collect:
- PR scope and changed files
- Linked issue number
- DocDD artifacts (`spec.md`, `plan.md`, `tasks.md`, ADR)

Guardrail:
- Raise `P1` if non-trivial changes do not provide Spec/Plan/AC traceability.

### 2. Verify AC Definition (Primary Gate)

**Before reviewing implementation, verify that the AC themselves are correct.**

Apply adversarial stance: do not assume the AC is correct merely because it
was written in the Issue.

Ask the following questions for each AC:

- **各 AC は Given/When/Then 形式か、またはそれに準ずるか**
  (Is each AC expressed in Given/When/Then or equivalent testable form?)
- **各 AC に対してテスト証跡が示されているか**
  (Is test evidence provided for each AC in the AC Verification table?)
- **AC の前提条件は正しいか（ビジネス要件の妥当性）**
  (Are the preconditions and assumptions behind each AC sound?)
- **AC がエラーパス・境界条件を網羅しているか**
  (Do the AC cover error paths and boundary conditions, not just the happy path?)
- Is the problem definition accurate? Could the root cause be different from
  what the Issue states?
- Was an alternative approach considered? Is this the simplest solution that
  satisfies the user need?
- Do the AC rest on assumptions that may be incorrect? What evidence supports
  those assumptions?

If any AC appears based on questionable assumptions, raise at minimum a `P1`
finding with the specific assumption questioned and an alternative framing.
If the assumption is demonstrably incorrect and invalidates the entire change,
escalate to `P0`.

### 3. Review Business Behavior

Verify end-to-end traceability:
- Requirement source: `.specify/specs/<id>/spec.md` or `docs/01_product/**`
- Implementation plan: `.specify/specs/<id>/plan.md`, `tasks.md`
- Runtime behavior: usecase/controller/handler implementation
- Verification evidence: unit/integration/e2e tests

Check:
- AC is explicit and testable (Given/When/Then preferred)
- Implementation satisfies AC, including error paths
- Tests cover behavior changes, not only structural changes
- Docs are updated if behavior changed

### 4. Build Rule Link Set (Future-Proof)

Run discovery every review:
```bash
.claude/skills/pr-review-governance/scripts/discover-review-rules.sh
```

Then:
- Start from canonical sources (`AGENTS.md`, `docs/00_process/process.md`)
- Add category-specific rule links from discovery output
- Include newly discovered rule files in the review output
- Append stable new sources to `references/rule-map.md` in the same PR

### 5. Review Architecture and Rules

Verify:
- DDD/Clean Architecture dependency direction
  `presentation -> usecase -> domain <- infrastructure`
- FSD dependency direction
  `app -> widgets -> features -> entities -> shared`
- OpenAPI-first process for HTTP API changes
- Guardrail alignment with `projects/packages/guardrails/src/guards/*`
- Golden Commands usage via `./tools/contract`

Minimum evidence per blocking finding:
- One concrete code location
- One rule source path that justifies the finding

### 6. Output Format (Required)

```markdown
## PR Review

### Scope & Traceability
- Issue: `#...`
- Spec/Plan/Tasks: `<path list>`
- Rule Sources Used:
  - `<path>`
  - `<path>`

### P0 - Blockers
- `<path:line>`: `<issue>`
  - Why: `<risk>`
  - Rule: `<rule path>`
  - Fix: `<minimal fix>`

### P1 - Important
- ...

### P2 - Suggestions
- ...

### AC Verification Coverage
- AC-1: ✅/⚠️ — Evidence: `<test/code/doc path>`
- AC-2: ✅/⚠️ — Evidence: `<test/code/doc path>`

### New Rule Sources Detected
- `<path>` or `None`
```

## Severity Definition

- `P0`: Merge blocker — includes:
  - Security issue, contract break, critical layer violation
  - **AC Verification テーブルが存在しない、または 1 つ以上の AC に証跡がない（feat/fix PR）**
  - Requirements based on demonstrably incorrect assumptions that invalidate
    the entire change
- `P1`: Must fix in normal flow — includes:
  - Missing behavior tests, DocDD gaps, major rule mismatch
  - AC that appear to rest on questionable assumptions
  - AC missing error paths or boundary conditions
- `P2`: Improvement suggestion (structure/readability without immediate risk)

## References

- CONTRIBUTING.md `#pr-での-ac-定義検証フロー` — AC review workflow (SSOT for
  review policy)
- Curated baseline: `references/rule-map.md`
- Dynamic discovery: `scripts/discover-review-rules.sh`
