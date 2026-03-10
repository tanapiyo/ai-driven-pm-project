---
name: repo-conventions
description: Repository-specific conventions and contracts. Apply when starting tasks, creating PRs, or questioning existing patterns. Triggers on "convention", "workflow", "PR", "commit", "branch", "DocDD".
globs:
  - "AGENTS.md"
  - "docs/00_process/**"
  - ".specify/**"
alwaysApply: false
---

# Repository Conventions

Conventions specific to this repository.

## Canonical Source

**AGENTS.md is the single source of truth.** If this skill conflicts with AGENTS.md, follow AGENTS.md.

## Workflow

1. **Worktree First**: Never work on main directly

   **Recommended: Auto-generate from Issue (推奨)**
   ```bash
   # Create worktree from issue number - auto-generates proper branch name
   ./tools/worktree/spawn.sh implementer --issue 123
   ```

   **Manual: Specify Branch Name (legacy, still supported)**
   ```bash
   ./tools/worktree/spawn.sh implementer feat/123-feature-name
   ```

2. **DocDD**: No implementation without Spec/Plan
   - Spec: `.specify/specs/<id>/spec.md`
   - Plan: `.specify/specs/<id>/plan.md`
   - Tasks: `.specify/specs/<id>/tasks.md`

3. **Golden Commands**: Use `./tools/contract` not raw commands

## Branch Naming (MUST)

### Issue Number Requirement

| Branch Type | Issue Number | Example |
|-------------|--------------|---------|
| `feat/` | **MUST** include | `feat/add-user-auth-123` |
| `fix/` | **MUST** include | `fix/login-null-pointer-456` |
| `docs/` | SHOULD include | `docs/api-reference-789` or `docs/typo-fix` |
| `chore/` | SHOULD include | `chore/update-deps-101` or `chore/cleanup` |
| `hotfix/` | **MUST** include | `hotfix/critical-bug-999` |

**Why Issue Numbers?**
- Traceability: Links code changes to requirements
- Auto-close: PR can use `Closes #123` to auto-close issue
- Context: Easy to find related discussion and decisions

### Recommended Workflow

```
Starting new work?
├─ Have Issue number? → ./tools/worktree/spawn.sh implementer --issue <number>
│                       (auto-generates branch name from issue title/labels)
└─ Hotfix/Trivial?    → Manual branch name, create Issue retroactively
```

### Branch Patterns

```
feat/<slug>-<issue>   # New feature (e.g., feat/add-auth-token-123)
fix/<slug>-<issue>    # Bug fix (e.g., fix/login-error-456)
docs/<slug>-<issue>   # Documentation (e.g., docs/api-reference-789)
chore/<slug>-<issue>  # Maintenance (e.g., chore/update-deps-101)
hotfix/<slug>-<issue> # Emergency fix (e.g., hotfix/critical-bug-999)
refactor/<slug>-<issue> # Refactoring (e.g., refactor/auth-module-102)
```

## PR Rules (MUST)

### 1 Issue = 1 PR (原則)

| Rule | Description |
|------|-------------|
| **1 Issue = 1 PR** | Each PR addresses exactly one Issue |
| **Issue Link Required** | Use `Closes #xxx` format (enables auto-close) |
| **No Orphan PRs** | PRs without linked Issues are prohibited (with exceptions) |

**Why 1:1 Mapping?**
- Clear scope and review
- Easy rollback if needed
- Traceable changes

### PR Checklist

- [ ] Title: Conventional Commits (`feat(scope): message`)
- [ ] Linear key in title if available (`feat(scope): [COD-XX] message`)
- [ ] Issue linked with `Closes #xxx`
- [ ] DocDD artifacts linked (Spec/Plan if applicable)
- [ ] CI passes
- [ ] Self-review completed

## Exception Cases

| Type | Definition | Branch Pattern | Allowed Skip |
|------|------------|----------------|--------------|
| **Hotfix** | 本番障害の緊急修正 | `hotfix/<slug>-<issue>` | Spec作成（Issue DoD は必須） |
| **Trivial** | typo修正、1-3行の明確な修正 | `docs/<slug>` or `chore/<slug>` | Issue linkは省略可、Spec/FR確認 |
| **Dependency Update** | セキュリティパッチ等 | `chore/update-deps-<issue>` | Spec作成 |

**Note:** Even for exceptions, quality gates (format/lint/typecheck/test) are **NOT skippable**.

## PR Body: Closes # Requirement (MUST)

### Auto-Insert from Worktree Context

When creating a PR with `gh pr create`, extract the issue number:

1. **From `.worktree-context.yaml`** (if `issue_number` field is present)
2. **From branch name** (e.g., `feat/add-auth-357` → `#357`)
3. **From `/kickoff` context** (issue number parsed at kickoff)

### PR Body Format

```
Closes #<issue-number>
```

### Exception Handling (Hotfix/Trivial)

If no issue number is available:

```
Exception: <Hotfix|Trivial|Dependency Update> — <brief reason>
```

Example: `Exception: Hotfix — critical auth bypass in production`

## Commit Format

```
<type>(<scope>): <subject>

Types: feat, fix, docs, refactor, test, chore, build, ci
```

## Directory Structure

```
projects/
├── apps/           # Applications (api, web)
└── packages/       # Shared packages
    ├── shared/     # Domain utilities
    └── guardrails/ # Architecture checks

docs/
├── 00_process/     # How we work
├── 01_product/     # What we build
├── 02_architecture/ # How it's built
├── 03_quality/     # Quality standards
└── 04_delivery/    # Shipping
```

## Issue Labels (MUST)

### Title Format

```
[Type] 簡潔な説明
```

| Type | ラベル | 用途 |
|------|--------|------|
| `Feature` | `type:feature` | 新機能の追加 |
| `Bug` | `type:bug` | バグ修正 |
| `Architect` | `type:architect` | アーキテクチャ・構造変更 |
| `Improvement` | `type:improvement` | 既存機能の改善 |
| `Chore` | `type:chore` | 雑用・メンテナンス・依存更新 |
| `Doc` | `type:doc` | ドキュメントの追加・更新 |
| `Spike` | `type:spike` | 調査・技術検証 |
| `Epic` | `type:epic` | 複数 Issue を束ねる大規模機能 |

### Required Label Groups (3 groups, all MUST be assigned)

| Group | Examples | Rule |
|-------|---------|------|
| `type:*` | `type:feature`, `type:bug`, `type:epic` | Exactly 1, exclusive |
| `role:*` | `role:frontend`, `role:backend`, `role:infra` | Exactly 1, exclusive |
| `priority:*` | `priority:must`, `priority:nice`, `priority:medium`, `priority:low` | Exactly 1, exclusive |

### SSOT

- **Label definitions**: `.github/labels.yml`
- **Operation rules**: `docs/00_process/issue-operation-rules.md`
- **Always-applied rules**: `.claude/rules/08-issue-labels.md`

## When to Question Conventions

Before changing established patterns:

1. **Read existing code** to understand why
2. **Check ADRs** for documented decisions
3. **Propose in PR** with rationale
4. **Don't silently deviate**

## Key Files to Read First

1. `AGENTS.md` - Repository contract (canonical)
2. `docs/00_process/git_and_pr_governance.md` - Full Git/PR governance
3. `docs/00_process/process.md` - Development process
4. `docs/02_architecture/adr/` - Past decisions
5. `docs/00_process/adr_guidelines.md` - ADR 運用ガイドライン（作成トリガー・ライフサイクル・フロー）

## See Also

- `.specify/specs/issue-number-in-branch/spec.md` - `--issue` flag implementation details
- `.github/pull_request_template.md` - PR template with checklist
- `prompts/skills/read_contract_first.md`
- `prompts/skills/docdd_spec_first.md`
