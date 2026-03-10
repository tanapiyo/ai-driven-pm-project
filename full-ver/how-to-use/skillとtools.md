| スキル名 | 目的・用途 | 主な起動トリガー |
|---|---|---|
| api-designer | RESTful リソース設計と OpenAPI 駆動の API 設計ワークフロー | API design, resource modeling, OpenAPI spec, endpoint design, OAS first |
| architect | アーキテクチャレビュー、ADR 作成、インパクト分析 | create ADR, review architecture, migration, layer dependencies |
| codebase-guide | コードベース構造・アーキテクチャの理解とナビゲーション支援 | what is, how does, explain, overview, onboarding, structure |
| codex-mcp-model | Codex MCP のモデル選択とレートリミット時のフォールバック | （MCP 呼び出し時） |
| codex-review | Codex MCP による複数モデルを使った PR レビュー | Codex review, cross-model, /pr-check |
| context-optimization | 常時読み込みルールと HOW-TO の分離によるトークン削減 | context optimization, reduce tokens, compress rules, always-loaded |
| ddd-clean-architecture | DDD・クリーンアーキテクチャのレイヤーと依存関係の適用 | domain, usecase, entity, repository, clean architecture, DDD, layer |
| epic-status-manager | Epic/Project のライフサイクルと GitHub Projects の状態管理 | （autopilot 実行時） |
| epic-team-orchestration | DEPRECATED チーム単位の並列実行（現行は epic-autopilot に集約） | epic-autopilot |
| fsd-frontend | React/Next.js の Feature-Sliced Design 準拠の構造化 | feature, component, React, Next.js, frontend, UI, FSD, slice |
| issue-creation | 自由記述のフィードバックから GitHub Issue を整理・作成 | create issue, フィードバック, Issue作成, アイディア |
| pr-review-governance | AC 検証を軸とした PR レビュー（Spec/Plan/Test のトレーサビリティ） | PR review, 受け入れ条件, Spec, AC, FSD, DDD, OpenAPI, guardrail |
| quality-gates | 品質チェック（format/lint/test/build など）の実行順序と修正方針 | lint, test, typecheck, CI, build, format, quality |
| repo-cleanup | リポジトリのドリフト・不要物・技術的負債の検出とクリーンアップ | cleanup, hygiene, drift, stale, dead code, repo health |
| repo-conventions | リポジトリ固有の運用ルール（Worktree/PR/commit/DocDD など） | convention, workflow, PR, commit, branch, DocDD |
| security-baseline | Node.js/TypeScript アプリのセキュリティ設計・実装指針 | auth, security, validation, XSS, CSRF, injection, secrets |
| skill-creator | 新規スキル作成・更新・構造レビューのガイド | create skill, new skill, skill template, init skill |
| tdd-workflow | DocDD に組み込んだテスト駆動開発（Red-Green-Refactor） | TDD, test first, write test, red green refactor, test coverage |
| ux-psychology | UX 設計支援（概念選定・ダークパターン回避・影響評価） | UX, 心理学, psychology, dark pattern, Impact Assessment, cognitive load |


# コマンド一覧

## Slash Commands（`.claude/commands/`）

| コマンド | 目的 | 定義ファイル |
|---------|------|---------------|
| `/kickoff` | 開発セッション開始（Worktree + DevContainer + contract 確認、並列サブエージェント探索） | `kickoff.md` |
| `/autopilot` | 単一 Issue → PR の完全自動パイプライン | `autopilot.md` |
| `/epic-autopilot` | Epic の子 Issue を依存順に順次実行（人間レビューゲートあり） | `epic-autopilot.md` |
| `/parallel-implement` | 1 Issue 内のタスクを tasks.md 依存グラフで Wave 単位に並列実装 | `parallel-implement.md` |
| `/pr-check` | PR の包括チェック（レビュー、テスト、セキュリティ） | `pr-check.md` |
| `/up` | フルスタック開発環境起動（DevContainer + Traefik） | `up.md` |
| `/down` | 開発環境停止・worktree 削除 | `down.md` |
| `/repo-cleanup` | リポジトリのドリフト・不要物・技術的負債のチェックとクリーンアップ | `repo-cleanup.md` |
| `/deps-audit` | 依存パッケージの脆弱性監査と更新確認 | `deps-audit.md` |

---

## Golden Commands（`./tools/contract` 経由）

必ず `./tools/contract <cmd>` で実行。直接 `pnpm` や `npm` は使わない。

| コマンド | 目的 |
|---------|------|
| `./tools/contract format` | フォーマット（Prettier による自動修正） |
| `./tools/contract lint` | 静的解析（ESLint） |
| `./tools/contract typecheck` | 型チェック |
| `./tools/contract test` | ユニットテスト |
| `./tools/contract build` | ビルド |
| `./tools/contract e2e` | E2E テスト（WebUI がある場合） |
| `./tools/contract migrate` | DB マイグレーション |
| `./tools/contract audit` | 依存パッケージの脆弱性チェック |
| `./tools/contract outdated` | 依存パッケージの更新確認 |
| `./tools/contract deploy-dryrun` | デプロイのドライラン |
| `./tools/contract guardrail` | アーキテクチャ制約検証 |
| `./tools/contract adr-validate` | ADR バリデーション |
| `./tools/contract openapi-generate` | OpenAPI コード生成 |
| `./tools/contract dev` | 開発サーバー起動 |
| `./tools/contract dev:stop` | 開発サーバー停止 |
| `./tools/contract dev:logs` | 開発サーバーログ表示 |
| `./tools/contract up` | DevContainer + フルスタック環境起動 |
| `./tools/contract up:stop` | フルスタック環境停止 |
| `./tools/contract up:logs` | フルスタック環境ログ表示 |
| `./tools/contract up:status` | コンテナステータス表示 |

---

## 修正順序（CI 失敗時）

品質ゲート失敗時: `format` → `lint` → `typecheck` → `test` → `build`