---
name: repo-cleanup
description: Repository hygiene checks and cleanup. Apply periodically or before releases to detect drift, stale artifacts, and tech debt. Triggers on "cleanup", "hygiene", "drift", "stale", "dead code", "repo health".
globs:
  - "**/*.md"
  - "**/*.json"
  - "**/*.ts"
  - "**/*.tsx"
alwaysApply: false
---

# Repository Cleanup

Systematic repository hygiene checks across 6 categories.

## Categories

### 1. git — Branch & Worktree Cleanup

Detect and clean stale git artifacts.

**Checks:**

```bash
# Merged branches (excluding main/develop)
git branch --merged main | grep -v -E '^\*|main|develop'

# Remote branches already merged
git branch -r --merged origin/main | grep -v -E 'main|develop|HEAD'

# Stale worktrees
git worktree list --porcelain | grep -E '^worktree'
```

**Actions:**

| Check | Dry-run | Execute |
|-------|---------|---------|
| Merged local branches | List only | `git branch -d <branch>` |
| Merged remote branches | List only | `git push origin --delete <branch>` |
| Stale worktrees | List only | `git worktree remove <path>` |

### 2. github — Labels & Stale Issues/PRs

Detect GitHub housekeeping items.

**Checks:**

```bash
# Issues with no activity in 90+ days
gh issue list --state open --json number,title,updatedAt \
  --jq '[.[] | select((.updatedAt | fromdateiso8601) < (now - 7776000))]'

# PRs with no activity in 30+ days
gh pr list --state open --json number,title,updatedAt \
  --jq '[.[] | select((.updatedAt | fromdateiso8601) < (now - 2592000))]'

# Labels defined but unused
gh label list --json name --jq '.[].name'
```

**Actions:**

| Check | Dry-run | Execute |
|-------|---------|---------|
| Stale Issues (90d+) | List with last update | Add `stale` label |
| Stale PRs (30d+) | List with last update | Comment and close |
| Unused labels | List candidates | Manual review required |

### 3. docs — Documentation-Implementation Drift

Detect mismatches between docs and actual implementation.

**Checks:**

```bash
# Technology references (e.g., Express/Fastify vs Hono)
grep -rn "Express\|Fastify" docs/ AGENTS.md README.md --include="*.md"

# Stale file references (files mentioned but missing)
grep -roh 'projects/[a-zA-Z0-9_/.-]*' docs/ | sort -u | while read f; do
  [ ! -e "$f" ] && echo "MISSING: $f"
done

# TODO/FIXME in docs
grep -rn "TODO\|FIXME\|PLACEHOLDER\|TBD" docs/ --include="*.md"

# Template placeholders not filled
grep -rn '{{[^}]*}}' docs/ README.md --include="*.md"
```

**Actions:**

| Check | Dry-run | Execute |
|-------|---------|---------|
| Wrong tech references | List with file:line | Edit to correct value |
| Stale file references | List missing paths | Update or remove refs |
| Unfilled placeholders | List with context | Fill or remove |

### 4. code — TODO / Dead Code / Console.log / Config Hygiene

Detect code-level cleanup targets.

**Checks:**

```bash
# TODO without issue link
grep -rn "TODO" projects/ --include="*.ts" --include="*.tsx" | grep -v "#[0-9]"

# console.log in production code (not test files)
grep -rn "console\.log" projects/ --include="*.ts" --include="*.tsx" \
  | grep -v "\.test\." | grep -v "\.spec\." | grep -v "__tests__"

# Commented-out code blocks (3+ consecutive commented lines)
grep -rn "^[[:space:]]*//" projects/ --include="*.ts" --include="*.tsx" \
  | awk -F: '{file=$1; line=$2} prev_file==file && line==prev_line+1 {count++} count>=3 {print file":"line} {prev_file=file; prev_line=line; if(prev_file!=file) count=1}'

# Unused exports (requires typecheck tooling)
# → Use ./tools/contract typecheck for detection

# Package name/description drift
grep -rn '"name"' projects/**/package.json package.json | head -20
```

**Actions:**

| Check | Dry-run | Execute |
|-------|---------|---------|
| TODO without issue | List with context | Add issue link or create issue |
| console.log | List locations | Replace with structured logger |
| Commented-out code | List blocks | Delete |
| Package name drift | Show current values | Update to correct name |

### 5. deps — Dependency Checks

Audit dependencies for security and freshness.

**Checks:**

```bash
# Vulnerabilities
./tools/contract audit

# Outdated packages
./tools/contract outdated

# Duplicate dependencies (devDeps vs deps)
node -e "
  const pkg = require('./projects/apps/api/package.json');
  const deps = Object.keys(pkg.dependencies || {});
  const devDeps = Object.keys(pkg.devDependencies || {});
  const dupes = deps.filter(d => devDeps.includes(d));
  if (dupes.length) console.log('DUPLICATES:', dupes.join(', '));
  else console.log('No duplicates found');
"

# Unused dependencies (heuristic: check imports)
# → Requires deeper analysis; flag for manual review
```

**Actions:**

| Check | Dry-run | Execute |
|-------|---------|---------|
| Vulnerabilities | List with severity | `./tools/contract audit` で確認 |
| Outdated (major) | List versions | Manual upgrade + test |
| Duplicate deps/devDeps | List duplicates | Remove from devDeps |

### 6. product — Product Quality Checks

Detect product-level inconsistencies.

**Checks:**

```bash
# Design token usage: defined vs actually used
DEFINED_TOKENS=$(jq -r 'paths | join(".")' design/tokens/tokens.json 2>/dev/null | wc -l)
USED_TOKENS=$(grep -roh 'var(--[a-zA-Z0-9-]*)' projects/apps/web/ 2>/dev/null | sort -u | wc -l)
echo "Design tokens: $DEFINED_TOKENS defined, $USED_TOKENS used in code"

# prompts/agents/ vs .claude/agents/ consistency
echo "=== prompts/agents/ ==="
ls prompts/agents/*.md 2>/dev/null | sed 's|.*/||;s|\.md||' | sort
echo "=== .claude/agents/ ==="
ls .claude/agents/*.md 2>/dev/null | sed 's|.*/||;s|\.md||' | sort

# Document template fill status (TODO remaining)
grep -rn "TODO\|TBD\|PLACEHOLDER\|{{" docs/01_product/ --include="*.md" | head -20

# Screen spec vs app route consistency
echo "=== Screen specs ==="
ls docs/01_product/screens/ 2>/dev/null | head -20
echo "=== App routes ==="
find projects/apps/web/src/app -name "page.tsx" 2>/dev/null | sed 's|.*/app/||;s|/page.tsx||' | sort

# Inline styles in frontend (should use design system)
grep -rn "style={{" projects/apps/web/src/ --include="*.tsx" | head -10
```

**Actions:**

| Check | Dry-run | Execute |
|-------|---------|---------|
| Unused design tokens | List unused | Manual review |
| Agent definition drift | Show diff | Sync or document |
| Unfilled templates | List with context | Fill from implementation |
| Screen-route mismatch | Show missing routes | Create or update |
| Inline styles | List locations | Refactor to design tokens |

## Execution Flow

```
/repo-cleanup [--dry-run] [--category <cat>]

Default: --dry-run (report only)
Categories: git, github, docs, code, deps, product, all (default)
```

### Dry-run (default)

1. Run all checks across selected categories
2. Output report with findings grouped by severity:
   - **P0 (Fix now)**: Security vulns, broken refs, secrets exposure
   - **P1 (Fix soon)**: Tech drift, stale branches, duplicate deps
   - **P2 (Nice to have)**: TODOs, minor inconsistencies
3. Suggest actions but do NOT execute

### Execute mode (--execute)

1. Run dry-run first
2. Prompt for confirmation per category
3. Execute safe actions (branch delete, doc fix)
4. Skip destructive actions (require manual confirmation)

## Report Format

```markdown
## Repository Cleanup Report

**Date**: YYYY-MM-DD
**Categories**: [selected categories]
**Mode**: dry-run | execute

### Summary

| Category | P0 | P1 | P2 | Total |
|----------|----|----|-----|-------|
| git      | 0  | 3  | 1   | 4     |
| github   | 0  | 2  | 0   | 2     |
| docs     | 1  | 5  | 3   | 9     |
| code     | 0  | 4  | 7   | 11    |
| deps     | 2  | 1  | 0   | 3     |
| product  | 0  | 3  | 5   | 8     |

### Findings

#### git
- [P1] 3 merged branches: feature/old-1, feature/old-2, fix/done-3
- [P2] 1 stale worktree: ./worktrees/abandoned

#### docs
- [P0] Template placeholder in README.md:191 — `{{license}}`
- [P1] Express/Fastify reference in AGENTS.md:88 (should be Hono)
...
```

## Integration

- Run before `/pr-check` for comprehensive hygiene
- Schedule periodically (monthly recommended)
- Pair with `./tools/contract audit` for security focus

## See Also

- `.claude/skills/quality-gates/SKILL.md` — CI quality checks
- `.claude/skills/repo-conventions/SKILL.md` — Repository conventions
- `.claude/skills/security-baseline/SKILL.md` — Security practices
