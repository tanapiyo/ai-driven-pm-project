# ADR-0014: AI レビューパイプラインをローカルエージェントに統合

## Status

Accepted

## Context

AI レビュー（Claude code-reviewer + Codex MCP）は現在、手動で実行されており、
パイプラインとして自動化されていない。実行漏れのリスクがあり、
AI レビュー結果が PR に組み込まれている保証もない。

Issue #35（Part of Epic #30）でこの自動化が求められている。

### 検討した選択肢

**Option A: GitHub Actions（CI）で実行**

- PR の open/synchronize/reopen イベントで Claude API を呼び出す
- 結果を PR コメントとして投稿

→ **却下**: API キーをリポジトリ Secret として管理する必要がある。
P0 自動修正ができない（別ワークフローが必要）。
フィードバックループが非同期で遅い。コスト管理が困難。

**Option B: ローカルコーディングエージェントのパイプラインに統合**

- `/autopilot` の Phase 6 で AI レビューを実行
- 結果を PR コメントとして投稿
- P0 は即座に自動修正 → 再プッシュ

→ **採用**: API キーはローカル認証で完結。P0 自動修正が同期的に可能。
エージェント実行時のみ API コールが発生しコスト効率が良い。

**Option C: サードパーティ Action（claude-pr-reviewer 等）**

→ **却下**: サプライチェーンリスク。プロンプトテンプレートの制御が困難。

**Option D: P0 でマージブロック**

→ **却下**: DoD が「AI レビュー失敗時のフォールバック（ブロックしない）」を要求。

## Decision

AI レビューを**ローカルコーディングエージェントのパイプライン**に統合する。

具体的には:

1. `/autopilot` の Phase 6 を強化し、AI レビューを必須ステップとする
2. レビュー結果を `🤖 AI Review (automated)` コメントとして PR に投稿する
3. `.claude/rules/09-ai-review.md` を always-loaded ガードレールとして追加する
4. P0 は自動修正サイクル（最大 2 回）で対応する
5. Codex MCP クロスモデルレビューは MUST attempt だが失敗時は non-blocking

### レビュー観点（4 次元）

| 次元 | 内容 |
|------|------|
| AC 検証 | 受け入れ条件のエビデンス確認（Primary Gate） |
| セキュリティ | 秘密情報、インジェクション、認証バイパス |
| アーキテクチャ | レイヤー違反、FSD 準拠、OpenAPI-first |
| コード品質 | エラーハンドリング、オーバーエンジニアリング |

### モデル選定

- Claude: 自己レビュー（adversarial stance）— エージェント内で実行
- Codex MCP (`gpt-5.3-codex-spark`): クロスモデルレビュー — 異なる LLM の視点

## Consequences

### Positive

- AI レビューがエージェントパイプラインの必須ステップとなり、実行漏れがなくなる
- P0 自動修正により、レビュー指摘の即時反映が可能
- PR コメントとして結果が残り、トレーサビリティが確保される
- コーディングエージェントが `[file:line]` 形式で指摘を消費でき、再現性が保たれる
- API キーのリポジトリ Secret 管理が不要

### Negative

- CI では実行されないため、エージェント外で作成された PR にはレビューが付かない
- エージェントのコンテキストウィンドウを消費する
- `.claude/rules/` に always-loaded ルールが 1 ファイル増える

### Mitigations

- エージェント外の PR は人間が `/pr-check` を手動実行することでカバー
- ルールファイルは簡潔に保ち（40 行以下）、コンテキストコストを最小化

## References

- Issue: #35
- Epic: #30
- `docs/00_process/ai-review-pipeline.md` — 運用ドキュメント
- `.claude/rules/09-ai-review.md` — ガードレールルール
- `.claude/commands/autopilot.md` — Phase 6 定義
- `.claude/skills/codex-review/SKILL.md` — Codex レビュープロンプト
