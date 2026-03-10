---
name: quality-gates
description: Standard quality checks and fix order. Apply before commits, after code changes, or when CI fails. Triggers on "lint", "test", "typecheck", "CI", "build", "format", "quality".
globs:
  - "tools/_contract/**"
  - ".github/workflows/**"
alwaysApply: false
---

# Quality Gates

Standard verification sequence for all code changes.

## Golden Commands

Always use `./tools/contract` instead of raw commands:

```bash
./tools/contract format       # Prettier + auto-fix
./tools/contract lint         # ESLint
./tools/contract typecheck    # TypeScript
./tools/contract test         # Vitest/Jest
./tools/contract build        # Production build
./tools/contract guardrail    # Architecture checks
./tools/contract e2e          # Playwright E2E (requires ./tools/contract up)
./tools/contract adr-validate # ADR validation (architecture/refactor changes)
```

## Fix Order (When Things Break)

Fix in this order to avoid cascading failures:

```
1. format    → Fixes style issues that may cause lint errors
2. lint      → Fixes static analysis issues
3. typecheck → Fixes type errors (often from lint fixes)
4. test      → Fixes broken tests
5. build     → Fixes build issues
6. review    → Code review (Claude code-reviewer + Codex MCP)
7. e2e       → Fixes integration issues
```

## Minimal Diff Strategy

When CI fails:

1. **Identify ONE root cause** (not symptoms)
2. **Make smallest fix** for that cause
3. **Re-run gates** in order
4. **Repeat** if still failing (max 3 iterations)

If not fixed in 3 iterations:

- Document what you tried
- Ask for help
- Don't make random changes

## Pre-Commit Checklist

```markdown
- [ ] `./tools/contract format` - no changes needed
- [ ] `./tools/contract lint` - no errors
- [ ] `./tools/contract typecheck` - no errors
- [ ] `./tools/contract test` - all pass
- [ ] Code review passed (Claude code-reviewer + Codex MCP)
- [ ] Tests added for new code
- [ ] Docs updated if behavior changed
```

## CI Pipeline Mapping

| Gate         | CI Job                                 | Required        |
| ------------ | -------------------------------------- | --------------- |
| format       | `lint`                                 | ✅              |
| lint         | `lint`                                 | ✅              |
| typecheck    | `typecheck`                            | ✅              |
| test         | `test`                                 | ✅              |
| build        | `build`                                | ✅              |
| e2e          | `e2e-smoke`                            | ✅              |
| react-doctor | `react-doctor` (frontend changes only) | ✅              |
| adr-validate | pre-PR (architecture/refactor changes) | ⚠️ warning only |
| review       | pre-PR (agent)                         | ✅              |

## E2E Gate

Runs Playwright tests inside the dedicated `playwright` container via `docker compose exec`.

### Prerequisites

```bash
./tools/contract up   # Start web + api + playwright services
```

### Options

| Option             | Description                                       | Default |
| ------------------ | ------------------------------------------------- | ------- |
| `--scope smoke`    | Golden-route only — fast P0 gate                  | default |
| `--scope affected` | Tests in files touched by current git diff        | —       |
| `--scope full`     | All E2E tests                                     | —       |
| `--file <path>`    | Specific test file (overrides `--scope`)          | —       |
| `--project <name>` | Playwright project/role (e.g. `chromium:planner`) | —       |

### Examples

```bash
# Default: smoke scope (golden-route)
./tools/contract e2e

# Run all E2E tests
./tools/contract e2e --scope full

# Run only changed specs
./tools/contract e2e --scope affected

# Run a specific file as a specific role
./tools/contract e2e --file projects/apps/web/e2e/flows/planner.spec.ts --project chromium:planner
```

### Artifacts

After each run the command prints paths for copying artifacts from the container:

- `playwright-report/` — HTML report
- `test-results/` — traces, screenshots, videos

## Review Step (Pre-PR)

Run code review **after build passes, before creating PR**.

### Execution

1. **code-reviewer agent**: Launch with prompt covering architecture, DocDD, test coverage, rollback safety
2. **codex-review skill**: Run Codex MCP cross-model review (`.claude/skills/codex-review/SKILL.md`)
3. **Synthesize results**: Merge findings into P0/P1/P2 severity levels

### Severity and Response

| Severity        | Action                                | Examples                                      |
| --------------- | ------------------------------------- | --------------------------------------------- |
| P0 (Blocker)    | **Must fix** before PR                | Security vuln, broken contract, missing tests |
| P1 (Important)  | **Should fix**, recommended before PR | Naming, missing edge case, doc gap            |
| P2 (Suggestion) | **May fix**, at author discretion     | Style preference, minor optimization          |

### Codex MCP Fallback

If Codex MCP is unavailable (timeout, error, not configured):

- Log: `"Codex MCP review unavailable. Continuing with Claude-only review."`
- **Do NOT block** — continue with Claude code-reviewer results only
- Do NOT expose error details

### Relationship to `/pr-check`

Pre-PR review runs the **same** code-reviewer + Codex MCP logic as `/pr-check` Step 1 and Step 1.5. The difference:

| Aspect  | Pre-PR review (this step)         | `/pr-check`                                                 |
| ------- | --------------------------------- | ----------------------------------------------------------- |
| Timing  | Before PR creation                | After PR creation                                           |
| Scope   | Code review only                  | Full: Issue link, security, tests, frontend quality, review |
| Purpose | Catch issues early, reduce rework | Final gate before merge                                     |

## React Doctor Gate (Frontend Only)

[millionco/react-doctor](https://github.com/millionco/react-doctor) provides 60+ React-specific checks
(state & effects, performance, bundle size, accessibility, security, correctness, architecture).
It runs only when `projects/apps/web/src/` files are changed, via Docker to keep the host clean.

### When It Runs

- **CI**: Automatically on PRs with frontend changes (path-filtered `react-doctor` job in `ci.yml`)
- **Local**: Run manually before opening a PR if you modified React source files

### Local Usage

```bash
# Auto-detect frontend changes and run (recommended)
./tools/react-doctor/run.sh

# Force run on all files (no change detection)
./tools/react-doctor/run.sh --all --verbose

# Specify a custom diff base
./tools/react-doctor/run.sh --base origin/main

# Force rebuild the Docker image first
./tools/react-doctor/run.sh --build
```

### Configuration

Edit `projects/apps/web/react-doctor.config.json` to exclude files or rules:

```json
{
  "exclude": {
    "files": ["**/*.stories.tsx", "**/*.test.tsx"],
    "rules": ["rule-id-to-suppress"]
  }
}
```

### Health Score

| Score | Status     | Action                           |
| ----- | ---------- | -------------------------------- |
| 75+   | Great      | No action needed                 |
| 50–74 | Needs work | Fix reported issues before merge |
| < 50  | Critical   | Block merge, fix immediately     |

### Docker Image

The runner image is built on demand from `tools/react-doctor/Dockerfile` and tagged
`react-doctor-runner:local`. Rebuild manually with `./tools/react-doctor/run.sh --build`.

### Offline Mode (Security)

react-doctor runs with two layers of network isolation to prevent diagnostic metadata
(file paths, rule names, line numbers) from being sent to external APIs:

1. **Application layer**: `--offline` flag disables react-doctor's `calculateScore` POST call.
   Score calculation is skipped; rule diagnostics continue to work normally.
2. **Network layer**: `--network none` on `docker run` cuts all outbound container traffic
   (defense-in-depth).

npm packages are pre-installed in the Docker image at build time, so neither layer
affects the ability to run diagnostics.

## See Also

- `prompts/skills/fix_ci_fast.md` for CI troubleshooting
- `prompts/skills/minimize_diff.md` for minimal changes
- `.claude/skills/codex-review/SKILL.md` for Codex MCP cross-model review
- `tools/react-doctor/run.sh` for the runner script
- `projects/apps/web/react-doctor.config.json` for rule configuration
