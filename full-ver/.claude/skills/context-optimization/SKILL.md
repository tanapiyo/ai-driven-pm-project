---
name: context-optimization
description: >
  Reduce always-loaded token cost by separating MUST/MUST NOT constraints (rules)
  from HOW-TO detail (skills). Apply when asked to optimize context, reduce tokens,
  compress rules, or audit always-loaded files.
  Triggers on "context optimization", "reduce tokens", "compress rules", "always-loaded".
globs:
  - ".claude/rules/**"
  - "CLAUDE.md"
alwaysApply: false
---

# Context Optimization

Reduce always-loaded token cost without degrading quality.

## Design Principle

| Location | Content | Load |
|----------|---------|------|
| `rules/*.md` | MUST / MUST NOT constraints only | Every turn |
| `skills/*.md` | HOW TO, examples, workflows, tables | On demand |
| `CLAUDE.md` | Overview + pointers | Every turn |

**Rules must not contain HOW TO.** They should answer "what is forbidden/required", not "how to do it".

## What Stays in Rules (Keep)

- MUST / MUST NOT directives
- Core layer dependency constraints (one-line each)
- Security prohibitions (NEVER)
- Short summary tables of constraints (≤ 6 rows)

## What Moves to Skills (Remove from rules)

- Directory structure listings
- Workflow step sequences
- Code examples / snippets
- Detailed checklists that duplicate MUST tables
- CLI call templates / option reference tables
- Color mapping tables / component checklists
- Fallback decision flowcharts

## What Moves Out of CLAUDE.md (Remove)

- 2-layer design explanation (keep one-line summary + pointer)
- Full skills table (keep pointer to `.claude/skills/`)
- Full slash commands table (keep pointer)
- Full `.claude/` directory listing (keep pointer)
- Rules vs Skills vs prompts/skills/ explanation table (move to skill-creator)
- Full security config explanation (keep summary + pointer)

## Measurement

```bash
# Measure current always-loaded line count
wc -l CLAUDE.md .claude/rules/*.md

# Target: 30%+ reduction from baseline
# Baseline: 524 lines (CLAUDE.md=181, rules/*=343)
# Target: ≤ 367 lines
```

## Optimization Workflow

1. Measure baseline: `wc -l CLAUDE.md .claude/rules/*.md`
2. For each rules file: delete HOW TO sections, keep MUST/MUST NOT tables
3. For CLAUDE.md: replace verbose sections with one-line pointers
4. If moved content is not already in a skill, add it there
5. Verify target skill already has `globs` set (update if missing)
6. Validate: `wc -l CLAUDE.md .claude/rules/*.md` shows ≥ 30% reduction
7. Check no MUST/MUST NOT was lost by diffing the constraints

## Zenn Insights (Token Efficiency)

- **Avoid skill nesting**: Calling skill A which calls skill B costs ~12k tokens vs ~7k for single skill
- **Prefer expansion**: Consolidate related content into one skill rather than chaining
- **Clear skill names**: Descriptive names save ~2k tokens via better auto-selection

## Per-File Targets

| File | Action |
|------|--------|
| `CLAUDE.md` | Replace 2-layer detail, full tables, and dir listing with pointers |
| `rules/01-core.md` | Remove Quick Reference table (duplicates CLAUDE.md) |
| `rules/02-backend.md` | Keep layer constraints table; move OpenAPI Sync details to skill |
| `rules/03-frontend.md` | Keep FSD rule + Dark Mode MUST table; move Dir Structure, Slice Structure, color map |
| `rules/04-security.md` | Keep NEVER/MUST tables; remove Quick Checklist (duplicates tables) |
| `rules/05-quality.md` | Keep Code Standards MUST NOT table; remove Pre-Commit checklist |
| `rules/06-codex-mcp.md` | Keep Model Priority + MUST NOT tables; move all CLI templates/flows |
