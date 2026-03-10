# Claude Code Notes

**Canonical instructions are in `AGENTS.md`.**

If anything conflicts, follow `AGENTS.md`.

---

## Configuration Architecture

Claude Code uses a 2-layer design: **Offense** (Agents, Skills, Commands, Hooks) for speed and quality,
and **Defense** (Deny Rules, PreToolUse Hooks, DevContainer) for safety.

→ `.claude/` directory: `rules/` (always-applied), `agents/`, `skills/`, `commands/`, `hooks/`

Always-applied rules (auto-loaded on every session):

| Rule File                  | Purpose                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `01-core.md`               | Non-negotiables, commit format                             |
| `02-backend.md`            | Clean Architecture, API rules                              |
| `03-frontend.md`           | FSD, dark mode                                             |
| `04-security.md`           | Secrets, auth, injection prevention                        |
| `05-quality.md`            | Golden Commands, fix order                                 |
| `06-codex-mcp.md`          | Codex model selection, rate-limit fallback                 |
| `07-epic-management.md`    | Epic Mermaid, status management                            |
| `08-issue-labels.md`       | Label groups, SSOT                                         |
| `09-ai-review.md`          | AI review comment format, P0/P1/P2                         |
| `10-user-communication.md` | AskUserQuestion format, 3-line summary, progress reporting |
| `11-language.md`           | Output language policy (Japanese for natural language)     |

---

## Sub-Agents

Parallel execution by default. Definitions in `.claude/agents/`.

→ `AGENTS.md#agents-役割定義`

---

## Skills

On-demand domain knowledge in `.claude/skills/`. Key skills:

| Skill                     | Purpose                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| `codebase-guide`          | Architecture overview, onboarding                                                              |
| `ddd-clean-architecture`  | Layer dependencies, domain purity                                                              |
| `fsd-frontend`            | Feature-Sliced Design, Next.js                                                                 |
| `issue-creation`          | GitHub Issue creation workflow                                                                 |
| `quality-gates`           | lint/test/typecheck execution order                                                            |
| `repo-conventions`        | DocDD, branch naming, PR rules                                                                 |
| `security-baseline`       | Input validation, auth, XSS                                                                    |
| `skill-creator`           | Skill design, template, validation                                                             |
| `tdd-workflow`            | Red-Green-Refactor                                                                             |
| `codex-review`            | Codex MCP cross-model PR review                                                                |
| `codex-mcp-model`         | Codex model selection, rate-limit fallback                                                     |
| `pr-review-governance`    | PR acceptance criteria, architecture review                                                    |
| `repo-cleanup`            | Drift detection, stale artifacts, tech debt                                                    |
| `epic-team-orchestration` | DEPRECATED: file scope detection and human review gate patterns (team-based execution removed) |
| `ux-psychology`           | UX psychology pack, dark pattern prevention                                                    |
| `context-optimization`    | Reduce always-loaded token cost                                                                |
| `epic-status-manager`     | Epic/Project lifecycle status transitions                                                      |
| `architect`               | ADR creation workflow, architecture review                                                     |
| `api-designer`            | RESTful resource modeling and OAS-driven API design                                            |

---

## Slash Commands

`/kickoff`, `/pr-check`, `/deps-audit`, `/up`, `/down`, `/repo-cleanup`, `/autopilot`, `/epic-autopilot`

---

## Security

### Deny Rules (DO NOT MODIFY)

- **Secrets**: `.env*`, `secrets/`, `*.pem`, `*.key`
- **Destructive**: `rm -rf /`, `sudo *`, `curl | bash`
- **Exfiltration**: `echo $*_KEY*`, `printenv *SECRET*`
- **Git Dangerous**: `git push --force`, `git reset --hard`

### Hooks

- **PreToolUse**: Block main branch ops, force push, pipe-to-shell
- **PostToolUse**: Auto-format TypeScript files

---

## MCP Servers

- **Context7**: Latest library docs — `Create Prisma user table use context7`
- **Playwright**: Browser automation — headless in DevContainer
- **Codex**: GPT-based review — default `gpt-5.3-codex-spark` (xhigh) → `.claude/skills/codex-mcp-model/SKILL.md`
