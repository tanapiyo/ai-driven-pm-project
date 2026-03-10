---
description: Run repository hygiene checks and cleanup across 6 categories
allowed-tools: Bash, Read, Grep, Glob, Task
---

# Repository Cleanup

Run hygiene checks and optional cleanup across the repository.

## Arguments

$ARGUMENTS

Default: `--dry-run --category all`

## Instructions

Parse arguments:

- `--dry-run` (default): Report only, no changes
- `--execute`: Apply safe fixes (with confirmation)
- `--category <cat>`: One of `git`, `github`, `docs`, `code`, `deps`, `product`, `all` (default: `all`)

### Step 1: Load Skill

Read `.claude/skills/repo-cleanup/SKILL.md` for check definitions and actions.

### Step 2: Run Checks (parallel where possible)

Launch checks for the selected category (or all). Use background agents for independent categories:

**If `--category all`**, run these in parallel:

1. **general-purpose** (run_in_background: true)
   - Prompt: "Repository cleanup: Run 'git' category checks from .claude/skills/repo-cleanup/SKILL.md. List merged branches, stale worktrees. Also run 'github' category: stale issues (90d+), stale PRs (30d+). Use bash for git and gh commands."

2. **repo-explorer** (run_in_background: true)
   - Prompt: "Repository cleanup: Run 'docs' category checks from .claude/skills/repo-cleanup/SKILL.md. Find technology drift (Express/Fastify references), stale file references, unfilled placeholders, TODOs in docs. Use Grep/Glob for searches."

3. **repo-explorer** (run_in_background: true)
   - Prompt: "Repository cleanup: Run 'code' category checks from .claude/skills/repo-cleanup/SKILL.md. Find TODOs without issue links, console.log in production code, commented-out code blocks, package name drift. Use Grep/Glob for searches."

4. **general-purpose** (run_in_background: true)
   - Prompt: "Repository cleanup: Run 'deps' category checks. Execute: ./tools/contract audit, check for duplicate dependencies across deps/devDeps in all package.json files. Use bash for audit commands."

5. **repo-explorer** (run_in_background: true)
   - Prompt: "Repository cleanup: Run 'product' category checks from .claude/skills/repo-cleanup/SKILL.md. Check design token usage, prompts/agents/ vs .claude/agents/ consistency, document template fill status, screen spec vs app route consistency, inline styles. Use Grep/Glob for searches."

**If a specific category**, run only that category's checks inline (no background agent needed).

### Step 3: Collect & Classify Results

When all checks complete, classify findings:

| Severity | Criteria | Examples |
|----------|----------|---------|
| **P0** | Security risk or broken functionality | Secrets in code, vulnerable deps, broken refs |
| **P1** | Drift or inconsistency that causes confusion | Wrong tech name, stale branches, duplicate deps |
| **P2** | Minor improvement opportunity | TODOs, unused tokens, cosmetic issues |

### Step 4: Generate Report

Output the report in the format defined in the skill:

```markdown
## Repository Cleanup Report

**Date**: <today>
**Categories**: <selected>
**Mode**: dry-run | execute

### Summary
| Category | P0 | P1 | P2 | Total |
...

### Findings
<grouped by category and severity>
```

### Step 5: Execute (if --execute)

If `--execute` flag is set:

1. Show the report first
2. For each category with findings:
   - List proposed actions
   - Ask for confirmation before executing
3. Execute safe actions:
   - **git**: Delete merged branches, prune worktrees
   - **docs**: Fix technology references, fill placeholders
   - **code**: Remove console.log, add issue links to TODOs
   - **deps**: Remove duplicate devDependencies
   - **product**: Flag for manual review (no auto-fix)
4. **NEVER** auto-execute:
   - Closing GitHub issues/PRs
   - Deleting remote branches without confirmation
   - Modifying production code logic
5. Run `./tools/contract format` after any code changes

### Step 6: Summary

Report total findings and actions taken:

```
Cleanup complete.
- Found: X issues (P0: a, P1: b, P2: c)
- Fixed: Y items
- Remaining: Z items (manual review needed)
```
