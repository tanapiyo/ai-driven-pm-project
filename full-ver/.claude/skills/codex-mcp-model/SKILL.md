---
name: codex-mcp-model
description: Codex MCP model selection with rate-limit fallback. Defines model chain, error detection patterns, and MCP call templates.
alwaysApply: false
---

# Codex MCP Model Selection & Rate-Limit Fallback

## Model Chain

| Order | Model | Reasoning Effort | Use Case |
|-------|-------|------------------|----------|
| Primary | `gpt-5.3-codex-spark` | `xhigh` | Default for all Codex MCP calls |
| Fallback | `gpt-5.3-codex` | `xhigh` | When Primary is rate-limited |

## MCP Call Templates

### Primary Call

```
mcp__codex__codex(
  prompt: "<your prompt>",
  model: "gpt-5.3-codex-spark",
  config: { "model_reasoning_effort": "xhigh" }
)
```

### Fallback Call

```
mcp__codex__codex(
  prompt: "<same prompt>",
  model: "gpt-5.3-codex",
  config: { "model_reasoning_effort": "xhigh" }
)
```

## Error Detection Patterns

Check the MCP response for ANY of these patterns (case-insensitive):

| Pattern | Typical Source |
|---------|---------------|
| `rate_limit` | OpenAI API error code |
| `429` | HTTP status code |
| `Too Many Requests` | HTTP status message |
| `exceeded.*quota` | Quota exhaustion |
| `throttled` | Rate throttling |
| `capacity` | Capacity limit |
| `resource_exhausted` | gRPC-style error |
| `try again later` | Generic retry message |

## Fallback Decision Flow

```text
1. Send prompt to Primary (gpt-5.3-codex-spark / xhigh)
   |
   +-- Success? --> Use response, continue
   |
   +-- Rate limit pattern detected?
       |
       +-- Log: "Codex MCP: gpt-5.3-codex-spark rate-limited, falling back to gpt-5.3-codex"
       |
       +-- Send SAME prompt to Fallback (gpt-5.3-codex / xhigh)
           |
           +-- Success? --> Use response, continue
           |
           +-- Rate limit pattern detected?
               |
               +-- Log: "Codex MCP: all models rate-limited"
               +-- Notify user: "Codex MCP review unavailable due to rate limiting. Continuing without Codex."
               +-- Skip Codex step (do NOT block workflow)
```

## User Notification Format

When both models are rate-limited:

```
**Codex MCP**: Rate-limited on all available models. Skipping Codex review.
Processing continues with Claude-only analysis.
```

When falling back:

```
**Codex MCP**: Primary model rate-limited, using fallback (gpt-5.3-codex).
```

## Integration with codex-review Skill

When this skill is used during `/pr-check` via the `codex-review` skill:

1. The review prompt template from `codex-review` is used as-is
2. Model selection follows THIS skill's protocol
3. Fallback handling from `codex-review` (connection errors, timeouts) still applies independently
4. Rate-limit fallback (this skill) is checked BEFORE connection-error fallback (codex-review)

## CLI Call Templates (サブエージェント用)

MCP ツールはサブエージェントでは利用不可。Bash が使えるサブエージェント（`general-purpose` 型等）では `codex exec` (CLI) を使用する。

### Primary Call (CLI)

```bash
codex exec \
  -m gpt-5.3-codex-spark \
  --ephemeral \
  -o /tmp/codex-result.txt \
  "<your prompt>"
```

### Fallback Call (CLI)

```bash
codex exec \
  -m gpt-5.3-codex \
  --ephemeral \
  -o /tmp/codex-result.txt \
  "<same prompt>"
```

### CLI Fallback Decision Flow

```text
1. Run codex exec with Primary model (gpt-5.3-codex-spark)
   |
   +-- Exit code 0 + output file exists? --> Read output, continue
   |
   +-- Rate limit pattern in stderr/stdout?
       |
       +-- Log: "Codex CLI: gpt-5.3-codex-spark rate-limited, falling back to gpt-5.3-codex"
       |
       +-- Run codex exec with Fallback model (gpt-5.3-codex)
           |
           +-- Success? --> Read output, continue
           |
           +-- Failure?
               |
               +-- Log: "Codex CLI: all models unavailable"
               +-- Skip Codex step (do NOT block workflow)
```

### CLI Options Reference

| Option | Purpose | Required |
|--------|---------|----------|
| `-m <model>` | モデル指定 | Yes |
| `--ephemeral` | セッションファイルを残さない | Yes |
| `-o <file>` | 最終メッセージをファイル出力 | Recommended |
| `--json` | JSONL 形式で stdout 出力 | Optional |
| `-C <dir>` | 作業ディレクトリ指定 | Optional |
| `--skip-git-repo-check` | Git リポジトリ外で実行 | Optional |
| `-s read-only` | サンドボックスを読み取り専用に | Recommended for review |

### MCP vs CLI 選択基準

| Context | Method | Reason |
|---------|--------|--------|
| メインセッション | `mcp__codex__codex` | MCP ツール利用可、レスポンス直接取得 |
| サブエージェント (Bash 可) | `codex exec` | MCP 不可、CLI で回避 |
| サブエージェント (Read-only) | **使用不可** | Bash も MCP もない。メインセッションに委譲 |

## Constraints

- **Never** reduce `model_reasoning_effort` below `xhigh` as a workaround
- **Never** expose raw API error messages to the user
- **Never** block the overall workflow if Codex is unavailable
- **Never** call MCP tools (`mcp__codex__codex`) from subagents (will always fail)
- **Always** pass `model` and `config` explicitly (do not rely on config.toml defaults)
- **Always** use `general-purpose` agent type when subagent needs Codex CLI (requires Bash)
