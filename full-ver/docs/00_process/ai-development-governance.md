# AI 開発利用ガバナンス

このドキュメントは、本リポジトリにおける AI ツール利用の**統一ガバナンス文書**です。
分散していたルール・ポリシー・ADR を一箇所に集約し、「開発用途のみ」の利用制限を明示します。

> **注意**: このドキュメントは既存ルールの統一的な文書化を目的としています。
> 各 rules / skills / agents / ADR が正規の定義元（SSOT）であり、本文書は参照・統合ビューです。

---

## 1. 目的と適用範囲（Purpose & Scope）

### 目的

本リポジトリで利用する AI ツールを**開発プロセスの補助・自動化に限定**し、
品質・セキュリティ・再現性を維持するためのガバナンスを定めます。

### 開発用途のみ（Development-Only）

| 区分 | 説明 |
|------|------|
| **許可** | 本リポジトリのコード開発・レビュー・ドキュメント生成・テスト自動化 |
| **禁止** | 本番環境の運用・顧客データ処理・プロジェクト外のコンサルティング |

**AI ツールは「開発プロセスの補助ツール」であり、最終的な意思決定は人間が行います。**

### 適用範囲

- このリポジトリで作業するすべての開発者・AIエージェント
- Claude Code、Codex MCP、GitHub Copilot を使用するすべてのワークフロー
- 自動化パイプライン（`/autopilot`, `/epic-autopilot`, CI）

---

## 2. 利用可能な AI ツール一覧（AI Tools Inventory）

### Claude Code（メインセッション + サブエージェント）

| 項目 | 内容 |
|------|------|
| 用途 | コード実装、レビュー、ドキュメント生成、パイプライン自動化 |
| モデル | Claude Sonnet（デフォルト）/ Claude Opus（複雑タスク） |
| 実行コンテキスト | メインセッション + サブエージェント（`.claude/agents/`） |
| 制約 | Deny rules + PreToolUse hooks による安全ガード |

**サブエージェント構成（`.claude/agents/`）:**

| Agent | Purpose | Tools | Mode |
|-------|---------|-------|------|
| `repo-explorer` | コードベース探索 | Read, Grep, Glob | read-only, 並列 |
| `security-auditor` | セキュリティ監査 | Read, Grep, Glob | read-only, 並列 |
| `test-runner` | テスト/lint 実行 | Bash, Read | 自動実行 |
| `e2e-runner` | E2E テスト実行・失敗分析 | Bash, Read, Grep, Glob | オンデマンド |
| `code-reviewer` | コードレビュー | Read, Grep, Glob | read-only, 並列 |
| `implementer` | 最小差分実装 | All | メイン作業 |
| `issue-project-manager` | Epic/Project ライフサイクル状態管理 | Bash, Read, Grep, Glob | オンデマンド |

詳細: `AGENTS.md#agents-役割定義`, ADR-0005 (`docs/02_architecture/adr/0005_claude_code_subagents.md`)

### Codex MCP（クロスモデルレビュー）

| 項目 | 内容 |
|------|------|
| 用途 | PR のクロスモデルコードレビュー（GPT による独立した視点） |
| モデル優先順位 | `gpt-5.3-codex-spark`（xhigh）→ `gpt-5.3-codex`（xhigh）|
| 実行コンテキスト | メインセッションのみ（MCP ツール） |
| サブエージェントから | 不可（`codex exec` CLI を使用） |
| 制約 | advisory（参考情報）、PR マージをブロックしない |

詳細: `.claude/rules/06-codex-mcp.md`, `.claude/skills/codex-review/SKILL.md`

### GitHub Copilot（コード補完）

| 項目 | 内容 |
|------|------|
| 用途 | エディタ内コード補完、インラインサジェスチョン |
| 適用範囲 | 開発者のローカル環境 |
| 制約 | 生成コードの品質ゲート通過が必須 |

詳細: `.github/copilot-instructions.md`

---

## 3. 許可される用途（Permitted Uses）

以下の用途にのみ AI ツールを使用します:

| 用途 | 説明 | 使用ツール |
|------|------|-----------|
| コード生成・補完 | 機能実装、リファクタリング | Claude Code, GitHub Copilot |
| コードレビュー | AC 検証、アーキテクチャ確認、品質チェック | Claude Code, Codex MCP |
| テスト生成・実行 | ユニットテスト、E2E テスト作成 | Claude Code |
| ドキュメント生成・更新 | Spec, ADR, プロセス文書 | Claude Code |
| アーキテクチャ分析・提案 | ADR 作成、設計判断支援 | Claude Code |
| 品質ゲート自動実行 | format, lint, typecheck, test, build | Claude Code (`test-runner`) |
| パイプライン自動化 | `/autopilot`, `/epic-autopilot` による自走 | Claude Code |

---

## 4. 禁止事項（MUST NOT）

### コード・データに関する禁止事項

| MUST NOT | 理由 |
|----------|------|
| 本番環境へ人的レビューなしのコードを投入する | 品質・安全性が未検証 |
| PII（個人情報）を AI ツールに入力する | プライバシー法規制・セキュリティリスク |
| セキュリティ credentials を AI プロンプトに含める | 秘密情報の漏洩リスク |
| AI 出力を無検証で採用する | 誤りや hallucination のリスク |
| 品質ゲート（format/lint/typecheck/test/build）を省略する | CI 失敗・品質劣化 |
| AI レビューコメント投稿を省略する | トレーサビリティの喪失 |

### ファイル・Git 操作に関する禁止事項

| MUST NOT | 理由 |
|----------|------|
| `.env*`, `secrets/`, `*.pem`, `*.key` を読み書きする | 秘密情報の保護 |
| `git push --force` を実行する | 履歴破壊リスク |
| `git reset --hard` を実行する | 変更の喪失リスク |
| `rm -rf /`, `sudo *`, `curl \| bash` を実行する | 破壊的操作 |
| `**/generated/**` を直接編集する | 生成物の整合性破壊 |
| main ブランチに直接コミット・プッシュする | ブランチ保護違反 |

### 開発プロセスに関する禁止事項

| MUST NOT | 理由 |
|----------|------|
| Spec/Plan/AC なしで実装を開始する | DocDD 違反 |
| AC なしで実装を完了宣言する | 受け入れ条件が未検証 |
| CI/DevContainer/Contract が壊れた状態で完了宣言する | 品質担保の失敗 |
| HTTP API を OpenAPI 仕様なしに実装する | API-first 原則違反 |

詳細: `.claude/rules/04-security.md`, `AGENTS.md#non-negotiables`

---

## 5. 品質ゲートと必須レビュー（Quality Gates & Required Reviews）

### 自動化された品質ゲート（Automated Quality Gates）

パイプラインは以下の順序で実行されます:

```
format → lint → typecheck → test → build → [AI review] → PR 作成
```

| コマンド | 内容 | 必須 |
|---------|------|------|
| `./tools/contract format` | Prettier 自動修正 | 必須 |
| `./tools/contract lint` | ESLint 静的解析 | 必須 |
| `./tools/contract typecheck` | TypeScript 型チェック | 必須 |
| `./tools/contract test` | ユニットテスト（Vitest） | 必須 |
| `./tools/contract build` | プロダクションビルド | 必須 |
| `./tools/contract guardrail` | アーキテクチャチェック | 必須 |
| `./tools/contract e2e` | E2E テスト（Playwright） | 必須（`./tools/contract up` が前提） |
| `./tools/contract audit` | 依存パッケージ脆弱性チェック | 新規依存追加時 |
| `./tools/contract adr-validate` | ADR 検証 | アーキテクチャ変更時 |

**MUST: 品質ゲートは例外（Hotfix/Trivial）でも省略不可。**

### AI レビュー（Phase 6 of `/autopilot`）

```
Phase 6.1: Safe diff 取得（機密ファイル除外）
Phase 6.2: Claude 自己レビュー（adversarial stance）
Phase 6.3: Codex クロスモデルレビュー（MUST attempt, non-blocking）
Phase 6.4: P0 自動修正サイクル（最大 2 回）
Phase 6.5: PR コメント投稿（🤖 AI Review (automated)）MUST
Phase 6.6: コメント投稿確認
```

AI レビューは **advisory（参考情報）** であり、PR マージをブロックしません。
ただし、`🤖 AI Review (automated)` コメントの投稿は **MUST**（省略不可）。

### 人的レビュー（Human Review Required）

以下は AI が判断できない項目であり、人間によるレビューが必須です:

- AC（受け入れ条件）の妥当性検証（ビジネス要件の正しさ）
- ビジネスロジックの正しさ（ドメイン固有の判断）
- UX/デザインの適切性
- セキュリティモデルの設計判断（認証・認可の意図）
- アーキテクチャ決定（ADR レビュー）
- 破壊的変更の影響評価

詳細: `docs/00_process/git_and_pr_governance.md#レビューポリシー`,
`docs/00_process/ai-review-pipeline.md`

---

## 6. 機械的レビュー項目一覧（Mechanical Review Checklist）

### 自動チェック（Automated / Machine-verifiable）

以下はすべて機械的に検証可能であり、CI またはコーディングエージェントが自動実行します:

| チェック項目 | コマンド / 仕組み | 検証内容 |
|-------------|-----------------|---------|
| コードフォーマット | `./tools/contract format` | Prettier 準拠 |
| 静的解析 | `./tools/contract lint` | ESLint エラー・警告 |
| 型チェック | `./tools/contract typecheck` | TypeScript 型エラー |
| ユニットテスト | `./tools/contract test` | テスト通過・カバレッジ |
| ビルド | `./tools/contract build` | 成果物生成の成功 |
| アーキテクチャチェック | `./tools/contract guardrail` | レイヤー違反・OpenAPI 同期 |
| 脆弱性監査 | `./tools/contract audit` | 依存パッケージの既知脆弱性 |
| AI レビュー自動投稿 | Phase 6 of `/autopilot` | `🤖 AI Review (automated)` コメント |
| P0 自動修正サイクル | Phase 6.4 of `/autopilot` | P0 指摘の自動修正（最大 2 回） |
| Safe diff 取得 | `git diff ':!*.env*' ':!secrets/'...` | 機密ファイル除外の確認 |
| PreToolUse hooks | `.claude/hooks/pre-bash.sh` | main ブランチ保護、force push 防止 |
| PostToolUse hooks | `.claude/hooks/post-edit.sh` | TypeScript 自動フォーマット |
| Deny rules | `.claude/settings.json` | secrets / destructive / exfiltration 防止 |
| commitlint | `husky` + `@commitlint/config-conventional` | コミットメッセージ規約 |
| OpenAPI sync | `lint-staged` | openapi.yaml 変更時の自動生成 |
| Policy checks | `./tools/policy/check_*.sh` | DocDD 最小成果物、PR テンプレ記入 |
| React Doctor | `./tools/react-doctor/run.sh` | React コンポーネント品質（フロントエンド変更時） |
| PR Issue link | `check_pr_contract.sh` | `Closes #<issue>` の存在 |

### 手動レビュー必須（Human Review Required）

以下は機械的に検証できず、人間による判断が必要です:

| レビュー項目 | 確認観点 | タイミング |
|-------------|---------|-----------|
| AC の妥当性検証 | ビジネス要件として AC が正しく定義されているか | PR レビュー時 |
| ビジネスロジックの正しさ | ドメイン固有のルール・制約が満たされているか | PR レビュー時 |
| UX/デザインの適切性 | ユーザー体験・アクセシビリティが適切か | UI 変更時 |
| セキュリティモデルの設計 | 認証・認可の設計意図が適切か | セキュリティ変更時 |
| ADR レビュー | アーキテクチャ決定の妥当性・トレードオフ評価 | アーキ変更時 |
| 破壊的変更の影響評価 | 既存ユーザー・システムへの影響 | 破壊的変更時 |
| Spike 結果レビュー | 調査結果・設計方針の妥当性 | Spike 完了時 |
| DB マイグレーション確認 | データ移行の安全性・ロールバック計画 | スキーマ変更時 |

詳細: `docs/00_process/git_and_pr_governance.md#レビューポリシー`

---

## 7. セキュリティポリシー（Security Policy for AI-Generated Code）

AI が生成したコードは、通常の人間が書くコードと同様のセキュリティ基準が適用されます。

### AI 生成コードへの適用基準

| カテゴリ | 要件 | 参照 |
|---------|------|------|
| 入力バリデーション | すべての境界で Zod によるバリデーション必須 | `.claude/rules/04-security.md` |
| SQL / クエリ | パラメタライズドクエリ / ORM のみ（SQL インジェクション防止） | `.claude/skills/security-baseline/SKILL.md` |
| 認証・認可 | deny-by-default、確立されたライブラリ（Passport, next-auth）を使用 | `.claude/rules/04-security.md` |
| パスワード | bcrypt（cost ≥ 12）でハッシュ | `.claude/skills/security-baseline/SKILL.md` |
| ログ | パスワード・トークン・API キー・PII をログに含めない | `.claude/rules/04-security.md` |
| 依存パッケージ | 追加前に `./tools/contract audit` を実行 | `.claude/rules/04-security.md` |

### AI への機密情報入力禁止

Codex MCP / Claude Code / GitHub Copilot へのプロンプトに以下を含めてはいけません:

- API キー・シークレット・パスワード
- 本番環境の接続情報
- 顧客・ユーザーの個人情報（PII）
- 社内の機密情報・知的財産

**diff 送信時は常に機密ファイルを除外すること:**

```bash
git diff origin/main...HEAD -- . \
  ':!*.env*' ':!secrets/' ':!*.pem' ':!*.key' ':!*.secret' \
  ':!*.p12' ':!*.pfx' ':!*.npmrc' ':!*.netrc'
```

---

## 8. コンプライアンスと執行（Compliance & Enforcement）

### 自動執行（Automated Enforcement）

以下は技術的な手段によって自動的に執行されます:

| 執行手段 | 対象ルール | 設定場所 |
|---------|----------|---------|
| Deny rules | secrets / destructive / exfiltration | `.claude/settings.json` |
| PreToolUse hooks | main ブランチ保護、force push 防止、pipe-to-shell 防止 | `.claude/hooks/pre-bash.sh` |
| PostToolUse hooks | TypeScript 自動フォーマット | `.claude/hooks/post-edit.sh` |
| commitlint | コミットメッセージ規約（Conventional Commits） | `commitlint.config.js` |
| lint-staged | OpenAPI 自動同期 | `projects/package.json` |
| Policy checks | DocDD 最小成果物、PR テンプレ、Issue リンク | `tools/policy/` |
| Always-applied rules | AI レビュー必須、Codex モデル選定、ラベルルール等 | `.claude/rules/` |
| Branch protection | main への直接 push 禁止 | GitHub Settings + git hooks |

### 違反検出と対応フロー

| 状況 | 検出方法 | 対応 |
|------|---------|------|
| CI 失敗 | GitHub Actions | PR マージブロック → 修正 → 再プッシュ |
| AI レビューで P0 指摘 | Phase 6.4 自動修正サイクル | 最大 2 回自動修正 → 残存は Draft PR |
| Deny rules 違反 | PreToolUse hook | ツール呼び出しをブロック |
| 品質ゲート失敗 | `./tools/contract` | 修正必須、完了宣言不可 |
| コミットメッセージ違反 | commitlint | コミットを拒否 → 新しいコミット作成 |
| セキュリティ問題（P0） | AI レビュー + security-auditor | 修正必須（PR 作成前） |

### 例外ルール（Hotfix / Trivial）

| 例外種別 | 省略できるもの | 省略できないもの |
|---------|--------------|----------------|
| Hotfix（本番障害緊急修正） | Spec 作成 | 品質ゲート全項目 |
| Trivial（typo 修正等）| Issue link | 品質ゲート全項目 |
| 依存更新 | Spec 作成 | 脆弱性監査 + テスト |

**品質ゲートは例外なく省略不可。**

---

## 9. 関連ドキュメント（Related Documents）

### Always-Applied Rules（常時適用ルール）

| ファイル | 内容 |
|---------|------|
| `.claude/rules/01-core.md` | 非交渉的ルール（Worktree, DocDD, Golden Commands） |
| `.claude/rules/02-backend.md` | Clean Architecture + DDD ルール |
| `.claude/rules/03-frontend.md` | FSD + Dark Mode ルール |
| `.claude/rules/04-security.md` | セキュリティ絶対禁止事項 |
| `.claude/rules/05-quality.md` | 品質ゲート（Golden Commands） |
| `.claude/rules/06-codex-mcp.md` | Codex MCP モデル・実行コンテキストルール |
| `.claude/rules/07-epic-management.md` | Epic 管理（Mermaid ノード ID 等） |
| `.claude/rules/08-issue-labels.md` | Issue ラベルルール（3 グループ必須） |
| `.claude/rules/09-ai-review.md` | AI レビュー必須ルール |

### Skills（オンデマンド知識）

| ファイル | 内容 |
|---------|------|
| `.claude/skills/quality-gates/SKILL.md` | 品質ゲート詳細・レビューステップ |
| `.claude/skills/security-baseline/SKILL.md` | セキュリティチェックリスト |
| `.claude/skills/codex-review/SKILL.md` | Codex クロスモデルレビュープロンプト |
| `.claude/skills/codex-mcp-model/SKILL.md` | Codex モデル選定・レートリミット対応 |
| `.claude/skills/ddd-clean-architecture/SKILL.md` | レイヤー依存ルール |
| `.claude/skills/fsd-frontend/SKILL.md` | Feature-Sliced Design ルール |
| `.claude/skills/repo-conventions/SKILL.md` | DocDD・ブランチ命名・PR ルール |
| `.claude/skills/pr-review-governance/SKILL.md` | PR レビューガバナンス |

### Agents（サブエージェント定義）

| ファイル | 内容 |
|---------|------|
| `.claude/agents/implementer.md` | 最小差分実装エージェント |
| `.claude/agents/code-reviewer.md` | コードレビューエージェント |
| `.claude/agents/security-auditor.md` | セキュリティ監査エージェント |
| `.claude/agents/test-runner.md` | テスト実行エージェント |
| `.claude/agents/repo-explorer.md` | コードベース探索エージェント |
| `.claude/agents/e2e-runner.md` | E2E テスト実行エージェント |
| `.claude/agents/issue-project-manager.md` | Epic/Project 状態管理エージェント |

### Architecture Decision Records（ADR）

| ADR | 内容 |
|-----|------|
| `docs/02_architecture/adr/0005_claude_code_subagents.md` | Claude Code サブエージェント統合 |
| `docs/02_architecture/adr/0008_parallel_implementer.md` | 並列 Implementer アーキテクチャ |
| `docs/02_architecture/adr/0010_epic_autopilot.md` | Epic Autopilot チーム自走型実装 |
| `docs/02_architecture/adr/0014-ai-review-pipeline.md` | AI レビューパイプライン（ローカル統合） |

### プロセス文書

| ファイル | 内容 |
|---------|------|
| `AGENTS.md` | エージェント向け規約（canonical SSOT） |
| `docs/00_process/ai-review-pipeline.md` | AI レビューパイプライン運用ドキュメント |
| `docs/00_process/agent_operating_model.md` | エージェント運用モデル |
| `docs/00_process/git_and_pr_governance.md` | Git / PR ガバナンス |
| `docs/00_process/process.md` | 開発プロセス定義 |
