# Codex Rules (Always Applied)

## Model Priority (MUST follow)

| Priority | Model | Reasoning Effort |
|----------|-------|------------------|
| 1 (Primary) | `gpt-5.3-codex-spark` | `xhigh` |
| 2 (Fallback) | `gpt-5.3-codex` | `xhigh` |

## Execution Context (MUST follow)

| Context | Method |
|---------|--------|
| **メインセッション** | `mcp__codex__codex` (MCP) |
| **サブエージェント** | `codex exec` (CLI via Bash) |

**MCP ツールはサブエージェントから利用不可。必ず CLI を使うこと。**

## Rate Limit & Fallback (MUST follow)

- Detect rate limit: `rate_limit`, `429`, `Too Many Requests`, `exceeded.*quota`, `throttled`
- Fallback: Primary → `gpt-5.3-codex` → skip (do NOT block)
- Team: MCP tasks → main session, CLI tasks → general-purpose subagent

## MUST NOT

| MUST NOT | Why |
|----------|-----|
| Set effort below `xhigh` | Quality guarantee |
| Expose raw error details to user | Security |
| Block workflow on Codex failure | Codex is advisory |
| サブエージェントから MCP ツールを呼び出す | 必ず失敗する |
| Read-only エージェントに Codex を委譲する | Bash がないため CLI も実行不可 |

## Detailed Reference

→ `.claude/skills/codex-mcp-model/SKILL.md`
