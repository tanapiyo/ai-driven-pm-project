# .claude/ ディレクトリ 使い方ガイド

このドキュメントは `.claude/` 配下にある全設定ファイルの概要と使い方を網羅的に説明する。

---

## 目次

1. [全体構成](#全体構成)
2. [settings.json (設定ファイル)](#settingsjson-設定ファイル)
3. [hooks (フック)](#hooks-フック)
4. [rules (ルール)](#rules-ルール)
5. [agents (エージェント)](#agents-エージェント)
6. [commands (コマンド)](#commands-コマンド)
7. [skills (スキル)](#skills-スキル)

---

## 全体構成

```
.claude/
├── settings.json          # 権限・フック・セキュリティ設定
├── hooks/                 # ツール実行前後のシェルスクリプト (3件)
├── rules/                 # 常時ロードされるルール (11件)
├── agents/                # チームで使う専門エージェント定義 (10件)
├── commands/              # /コマンド として呼び出せるワークフロー (9件)
└── skills/                # 必要時に読み込まれるスキル定義 (19件)
```

### 各レイヤーの役割

| レイヤー | ロードタイミング | 役割 |
|----------|------------------|------|
| settings.json | 常時 | 許可/拒否リスト、フック定義 |
| hooks | ツール実行前後に自動実行 | セキュリティガード、自動フォーマット |
| rules | 毎ターン自動ロード | MUST/MUST NOT の制約 (常に適用) |
| agents | Agent ツールで起動時 | 専門役割のサブエージェント |
| commands | `/コマンド名` で呼び出し時 | 複数ステップのワークフロー |
| skills | Skill ツールで呼び出し時 | HOW-TO・手順書・リファレンス |

---

## settings.json (設定ファイル)

Claude Code がツールを実行する際の権限と安全策を定義する。

### 許可リスト (allow)

`./tools/contract` 経由の Golden Command のみ許可:

- `lint`, `typecheck`, `test`, `build`, `format`, `guardrail`, `e2e`
- `git status`, `git diff`, `git log` 等の読み取り専用 git コマンド
- `audit`, `outdated` (依存関係チェック)

### 拒否リスト (deny) - セキュリティガードレール

以下を全面禁止 (セキュリティレビューなしに変更不可):

| カテゴリ | 対象 |
|----------|------|
| シークレット | .env*, .pem, .key, secrets/, .aws/credentials 等の読み書き |
| 破壊的操作 | rm -rf (ルート/ホーム/カレント), sudo, chmod 777 |
| リモートコード実行 | curl/wget をシェルにパイプ, eval+curl |
| シークレット流出 | env, printenv のリダイレクト, TOKEN/SECRET 等の echo |
| 生成コード保護 | **/generated/** への直接編集 |
| Git 危険操作 | force push, reset --hard, main/master への checkout/push |
| ネットワーク流出 | netcat, curl POST, rsync/scp |
| プロセス操作 | kill -9, killall, pkill |

### フック定義

| フック | 対象ツール | 実行スクリプト | タイムアウト |
|--------|-----------|---------------|-------------|
| PreToolUse | Bash | hooks/pre-bash.sh | 5秒 |
| PreToolUse | Write/Edit | hooks/pre-edit.sh | 5秒 |
| PostToolUse | Write/Edit | hooks/post-edit.sh | 30秒 |

---

## hooks (フック)

ツール実行の前後に自動で走るシェルスクリプト。

### pre-bash.sh (Bash 実行前ガード)

Bash コマンド実行前にセキュリティチェックを行う。

**ブロック対象:**
- main/master ブランチへの push/checkout/switch
- `--force` フラグ付きの push
- `git reset --hard`, `rm -rf /` 等の破壊的操作
- `sudo` による権限昇格
- `curl | bash` 等のサプライチェーン攻撃パターン
- 環境変数 (KEY/SECRET/TOKEN) の echo/printenv
- .env ファイルの cat
- pnpm/npm/yarn の実行 (audit, outdated 除く)

**動作:** ブロック時は exit code 2 で拒否、stderr にエラーメッセージを出力。

### pre-edit.sh (ファイル編集前ガード)

Write/Edit ツール実行前にファイルパスをチェックする。

**ブロック対象:**
- `/generated/` ディレクトリ内のファイルへの直接編集

**ブロック時の案内:**
- OpenAPI 生成コード → `openapi.yaml` を編集して `./tools/contract openapi-generate` を実行
- Prisma 生成コード → `schema.prisma` を編集して `./tools/contract migrate` を実行

### post-edit.sh (ファイル編集後の自動フォーマット)

Write/Edit ツール実行後に自動でフォーマットを適用する。

**対象:** `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.mjs`, `.cts`, `.cjs` ファイル

**動作:** `./tools/contract format <ファイルパス>` を実行。失敗してもブロックしない。

---

## rules (ルール)

毎ターン自動でロードされる制約。全 11 ファイルが常時適用される。

### 01-core.md: コアルール

プロジェクト全体の基本原則。

- AGENTS.md が全プロセスの正規ソース
- ワークツリー + DevContainer 必須 (main ブランチ直接編集禁止)
- Spec/Plan/AC なしの実装禁止 (Spec-Driven Development)
- 全コマンドは `./tools/contract` 経由 (Golden Commands)
- PR には `Closes #<issue>` 必須
- コミットフォーマット: `<type>(<scope>): <subject>` (Conventional Commits)

### 02-backend.md: バックエンドルール

Clean Architecture + DDD のレイヤー制約。

```
presentation → usecase → domain ← infrastructure
(依存方向は domain に向かう)
```

- Domain: 純粋なビジネスロジックのみ (フレームワーク・I/O・DB 禁止)
- UseCase: domain の連携のみ (ビジネスロジック禁止)
- Infrastructure: domain インターフェースの実装
- Presentation: HTTP と UseCase のマッピングのみ
- OpenAPI spec を先に定義してからコード生成
- `**/generated/**` の直接編集禁止

### 03-frontend.md: フロントエンドルール

Feature-Sliced Design (FSD) のレイヤー制約。

```
app → widgets → features → entities → shared
(上位レイヤーが下位をインポート、逆は禁止)
```

- `index.ts` (公開 API) のみからインポート
- Feature 間の相互インポート禁止
- shared レイヤーはフレームワーク非依存
- ダークモード対応必須 (`neutral-*` カラー、`dark:` バリアント、WCAG AA)

### 04-security.md: セキュリティルール

絶対禁止事項と必須プラクティス。

- シークレットを git にコミットしない
- パスワード・トークン・PII をログに出さない
- ユーザー入力を SQL に直接埋め込まない
- 入力バリデーション必須 (Zod 推奨)
- bcrypt (cost 12 以上) でパスワードハッシュ
- deny by default の認可

### 05-quality.md: 品質ルール

Golden Commands による品質基準。

**修正順序 (CI 失敗時):**
```
format → lint → typecheck → test → build → review → e2e
```

- `console.log` 禁止 (構造化ロガー使用)
- コメントアウトされたコード禁止
- Issue リンクなしの TODO 禁止
- マジックナンバー禁止

### 06-codex-mcp.md: Codex MCP ルール

Codex (GPT) モデルの利用方法。

- プライマリ: `gpt-5.3-codex-spark`、フォールバック: `gpt-5.3-codex`
- メインセッション: MCP ツール、サブエージェント: CLI (`codex exec`)
- Codex 失敗時はスキップ (ブロッキング禁止、アドバイザリーのみ)

### 07-epic-management.md: Epic 管理ルール

Epic の自動化が正しく動くための制約。

- Mermaid のノード ID に Issue 番号を使用 (A, B, C 等の文字禁止)
- テーブル行にステータス絵文字必須 (🔴🟡📝🟢)
- 子 Issue の Body に `Part of #<epic>` 必須

### 08-issue-labels.md: Issue ラベルルール

GitHub Issue に必須のラベル 3 グループ。

| グループ | 選択肢 |
|----------|--------|
| `type:*` | feature, bug, architect, improvement, chore, doc, spike, epic |
| `role:*` | designer, frontend, backend, infra, ops |
| `priority:*` | must, nice, medium, low |

各グループから 1 つずつ必須。

### 09-ai-review.md: AI レビュールール

PR に AI レビューコメントを必須化。

- `## 🤖 AI Review (automated)` ヘッダーで PR コメント投稿
- AC Verification テーブル (各 AC のエビデンス) 必須
- P0/P1/P2 で分類
- Codex クロスモデルレビューを試行
- AI レビュー失敗時はフォールバックコメント投稿 (ブロッキング禁止)

### 10-user-communication.md: ユーザーコミュニケーションルール

ユーザーへの報告形式。

- AskUserQuestion の選択肢に必ず `description` を付ける
- 推奨選択肢を先頭に配置し `(Recommended)` を付ける
- フェーズ遷移時に 3 行サマリ (現在地/次のアクション/残りステップ)
- 3 ステップ以上無言禁止

### 11-language.md: 言語ルール

日英バイリンガルポリシー。

- 日本語: PR 説明、ドキュメント、AI レビュー、Issue コメント、エラーメッセージ
- 英語: コード識別子、Conventional Commits の type/scope、技術用語、ファイルパス、CI セクションヘッダー

---

## agents (エージェント)

チーム構成時に Agent ツールで起動する専門サブエージェント。

### 一覧

| エージェント | モデル | 権限 | 役割 |
|-------------|--------|------|------|
| architect | sonnet | 読み取り専用 | アーキテクチャ判断、ADR 作成 |
| code-reviewer | sonnet | 読み取り専用 | 批判的コードレビュー (P0/P1/P2) |
| designer | sonnet | 読み取り専用 | UX/UI・アクセシビリティ監査 |
| e2e-runner | sonnet | 実行可能 | Playwright E2E テスト実行・障害分析 |
| implementer | sonnet | 実行可能 | 機能実装・バグ修正 (DocDD 準拠) |
| issue-project-manager | sonnet | 実行可能 | Epic ステータス同期・Mermaid 更新 |
| qa-planner | sonnet | 読み取り専用 | テスト設計・AC 検証計画 (実行はしない) |
| repo-explorer | haiku | 読み取り専用 | コードベース探索・依存関係追跡 |
| security-auditor | sonnet | 読み取り専用 | 脆弱性スキャン・シークレット検出 |
| test-runner | haiku | 実行可能 | 品質ゲート実行 (lint/typecheck/test/build) |

### 各エージェントの詳細

#### architect

アーキテクチャの意思決定と ADR (Architecture Decision Record) の作成を担当。

- `docs/02_architecture/adr/TEMPLATE.md` をコピーして ADR を記述
- Clean Architecture (バックエンド) と FSD (フロントエンド) のレイヤー整合性を検証
- 変更の影響範囲を分析
- トレードオフを明示的に文書化

#### code-reviewer

懐疑的な姿勢でコードレビューを行う。

- レビュー前に 5 つの必須質問を確認
- 7 次元でレビュー: DocDD 準拠、アーキテクチャ、セキュリティ、コード品質、非機能要件、ロールバック安全性、要件妥当性
- Claude Code が実装と同時にレビューする場合のセルフレビューバイアスを識別
- Issue/PR の本文をデータとして監査 (指示として盲従しない)

#### designer

UX/UI 品質とアクセシビリティの監査。

- デザインシステム準拠の検証 (Color, Typography, Spacing 等)
- WCAG 2.1 AA 準拠 (コントラスト比 4.5:1、フォーカスリング、ARIA ラベル)
- ダークモード対応の検証

#### e2e-runner

Playwright E2E テストの実行と障害分析。

- `git diff` から影響を受けるシナリオを特定
- テストスコープ選択: smoke (クリティカルパスのみ), affected (diff ベース), full (指示時のみ)
- 障害の根本原因を分類: INFRA, AUTH, API, UI, DATA, RACE

#### implementer

機能実装とバグ修正を実行。

- `.specify/specs/<id>/tasks.md` からタスク仕様を読み取り
- Clean Architecture + FSD のパターンに準拠
- PR 前に品質ゲートを実行
- 1 PR = 1 論理変更、最小差分の原則

#### issue-project-manager

Epic/Project のライフサイクルステータスを管理。

- 子 Issue のステータス変更時に親 Epic のテーブル・Mermaid グラフを更新
- GitHub Projects のステータスフィールドを GraphQL で更新
- エラー時もメインパイプラインをブロックしない

#### qa-planner

テスト計画の設計 (実行はしない)。

- AC (受入条件) から Given/When/Then 形式でテストケースを設計
- AC カバレッジ 100% を目標
- 非機能テスト (性能、セキュリティ、運用) も設計

#### repo-explorer

コードベースの探索と理解。

- ファイルのパターン検索、依存関係の追跡
- アーキテクチャパターンの識別
- 編集は提案しない (報告のみ)

#### security-auditor

セキュリティ脆弱性の特定。

- 6 カテゴリで監査: シークレット、入力バリデーション、認証認可、依存関係、CI/CD、インフラ
- CVE スキャン (`./tools/contract audit`)
- シークレットの実際の値は出力しない

#### test-runner

品質ゲートの実行と結果報告。

- Golden Commands で実行: lint → typecheck → test → build
- 最初の失敗で停止
- 修正は行わない (報告と提案のみ)

---

## commands (コマンド)

`/コマンド名` で呼び出せる複数ステップのワークフロー。

### 一覧

| コマンド | 用途 |
|----------|------|
| `/autopilot` | Issue → PR を全自動で実行 |
| `/epic-autopilot` | Epic の子 Issue を順次実行 (人間レビューゲート付き) |
| `/kickoff` | 開発開始時の環境チェック・探索・計画 |
| `/parallel-implement` | tasks.md の依存グラフから並列実装 |
| `/pr-check` | PR マージ前の総合チェック |
| `/repo-cleanup` | リポジトリ衛生チェック (6 カテゴリ) |
| `/deps-audit` | 依存関係の脆弱性・健全性チェック |
| `/up` | DevContainer 開発環境の起動 |
| `/down` | 開発環境の停止・ワークツリー削除 |

### 各コマンドの詳細

#### /autopilot

GitHub Issue を入力として PR 作成までを全自動実行する。

```
/autopilot #123
/autopilot --issue 123
/autopilot --yolo    # ヘッドレスモード
```

**フロー:**
1. Issue の解析・検証
2. Epic 検出 (ステータス追跡用)
3. ワークツリー作成
4. ラベルに基づくルーティング (security → architecture → tdd → frontend → docs → default)
5. 専門パイプライン実行
6. 品質ゲート (format, lint, typecheck, test, build)
7. PR 作成 + AI レビュー (Claude + Codex)
8. Epic ステータス更新

#### /epic-autopilot

Epic の子 Issue を 1 件ずつ順番に実行する。Issue 間に人間のレビューゲートを挟む。

```
/epic-autopilot #456
```

**フロー:**
1. Epic 解析、子 Issue 取得
2. Mermaid 依存グラフからトポロジカルソート
3. 各 Issue: レビューゲート → ステータス更新 → 実装 → PR → レビューゲート
4. ファイル重複検出時はマージ確認
5. 進捗追跡・最終レポート

#### /kickoff

新タスク開始時の事前準備を行う。

```
/kickoff #789
/kickoff タスクの説明文
```

**フロー:**
1. ワークツリー確認 (必須)
2. Issue 検証
3. DocDD 成果物チェック (Spec, Plan, AC)
4. 並列探索 (repo-explorer, security-auditor, code-reviewer)
5. TODO リスト作成
6. 計画承認

#### /parallel-implement

`tasks.md` の依存グラフを解析し、独立したタスクを並列で実装する。

```
/parallel-implement
/parallel-implement .specify/specs/feature-id
```

**フロー:**
1. tasks.md の読み込み・依存関係解析
2. 並列グループとウェーブの特定
3. 循環依存・ファイルスコープ重複の検証
4. ウェーブごとに並列 implementer 起動
5. 共有ファイルは順次処理
6. 品質ゲート実行

#### /pr-check

PR マージ前の総合品質チェック。

```
/pr-check
```

**フロー:**
1. Issue リンク検証 (`Closes #<number>` 必須)
2. フロントエンド変更検出
3. 並列チェック (test-runner, security-auditor, code-reviewer)
4. Codex クロスモデルレビュー
5. 結果集約 (P0/P1/P2)
6. フロントエンド固有チェック (該当時)
7. 最終判定: Ready to merge / Needs fixes

#### /repo-cleanup

6 カテゴリのリポジトリ衛生チェック。

```
/repo-cleanup                    # デフォルト: レポートのみ
/repo-cleanup --execute          # 安全な修正を適用
/repo-cleanup --category git     # 特定カテゴリのみ
```

**6 カテゴリ:**
1. **git**: マージ済みブランチ、古いワークツリー
2. **github**: 停滞 Issue (90 日+)、停滞 PR (30 日+)、未使用ラベル
3. **docs**: 技術参照の不整合、TODO/FIXME、未記入テンプレート
4. **code**: Issue リンクなしの TODO、console.log、コメントアウト
5. **deps**: 脆弱性、古いパッケージ、重複依存
6. **product**: デザイントークン、エージェント定義の乖離、インラインスタイル

#### /deps-audit

依存関係の脆弱性と健全性を監査する。

```
/deps-audit
```

- `./tools/contract audit` と `./tools/contract outdated` を実行
- security-auditor でサプライチェーンリスクをスキャン
- CVE、非推奨パッケージ、メジャーバージョン更新をレポート

#### /up

DevContainer 開発環境を起動する。

```
/up
```

- `./tools/contract up` で web, api, db サービスを起動
- DevContainer の準備完了を待機
- 依存関係をインストール

#### /down

開発環境を停止しワークツリーを削除する。

```
/down feat/my-feature
```

- Docker サービス停止 (コンテナ、ボリューム、ネットワーク)
- git ワークツリー削除

---

## skills (スキル)

必要時に Skill ツールで読み込まれる HOW-TO・手順書。全 19 スキル。

### 一覧

| スキル | トリガーキーワード | 概要 |
|--------|-------------------|------|
| api-designer | "API design", "OpenAPI" | RESTful リソースモデリングと OAS 駆動設計 |
| architect | "ADR", "review architecture" | アーキテクチャレビュー・ADR 作成・影響分析 |
| codebase-guide | "what is", "explain", "overview" | コードベース構造のインタラクティブガイド |
| codex-mcp-model | (内部利用) | Codex MCP モデル選択とレート制限フォールバック |
| codex-review | "Codex review", "/pr-check" | Codex によるクロスモデル PR レビュー |
| context-optimization | "reduce tokens", "compress rules" | 常時ロードトークン削減の最適化手法 |
| ddd-clean-architecture | "domain", "DDD", "layer" | DDD + Clean Architecture の原則と実践 |
| epic-status-manager | (autopilot 内部) | Epic ステータスの自動更新 (SSOT) |
| epic-team-orchestration | (非推奨) | チーム並列実行 (serial 実行に移行済み) |
| fsd-frontend | "feature", "React", "FSD" | Feature-Sliced Design のフロントエンド構造 |
| issue-creation | "create issue", "Issue作成" | MECE 分析による GitHub Issue 作成 |
| pr-review-governance | "PR review", "AC" | AC 中心の PR レビューガバナンス |
| quality-gates | "lint", "test", "CI" | Golden Commands による品質検証手順 |
| repo-cleanup | "cleanup", "drift" | リポジトリ衛生チェック (6 カテゴリ) |
| repo-conventions | "convention", "workflow", "PR" | リポジトリ固有の開発規約 |
| security-baseline | "auth", "security", "XSS" | Node.js/TypeScript セキュリティベストプラクティス |
| skill-creator | "create skill", "new skill" | 新スキル作成ガイド |
| tdd-workflow | "TDD", "test first" | TDD (Red-Green-Refactor) ワークフロー |
| ux-psychology | "UX", "心理学", "dark pattern" | UX 心理学概念のデザイン統合 |

### 主要スキルの詳細

#### api-designer

RESTful API の設計を OAS (OpenAPI Specification) 駆動で行う。

**ワークフロー:** 要件分析 → リソースモデリング → パス設計 → OAS スペック → 検証 → コード生成

**アンチパターン:** `/search` サブパス、RPC スタイルパス、パスに動詞を含めること

#### architect

アーキテクチャレビューと ADR の作成。

**判断基準:** アーキテクチャ変更、リファクタリング、新フレームワーク導入 → ADR 必要

**出力:** アーキテクチャレビュー (サマリ、現状分析、レイヤー分析、影響評価、移行戦略)

#### issue-creation

自由形式のフィードバックから構造化された GitHub Issue を作成する。

**ワークフロー:**
1. 事前検証 (gh CLI, 認証, ラベル)
2. MECE マッピング (ユーザー価値、問題、解決策、スコープ、制約、リスク、非ゴール)
3. インパクト評価
4. Issue 分割判断 (単一 / Epic)
5. Epic 優先で作成、Sub-Issues API リンク

#### pr-review-governance

AC (受入条件) 中心の PR レビュー。

**レビュー対象:**
1. AC 定義品質 (Given/When/Then、テストエビデンス、前提条件、エラーパス)
2. ビジネス動作のトレーサビリティ
3. アーキテクチャ準拠 (DDD/FSD/OpenAPI)

**出力:** P0/P1/P2 の重要度分類 (コード位置 + ルール出典付き)

#### tdd-workflow

DocDD 統合の TDD ワークフロー。

**サイクル:**
1. RED: Spec の AC から失敗するテストを作成
2. GREEN: テストを通す最小限のコードを実装
3. REFACTOR: 品質ゲート実行 (format → lint → typecheck → test → guardrail)

**ルール:**
- Domain: モック不要 (純粋ロジック)
- UseCase: 依存をモック
- Presentation: UseCase をモック
- AAA パターン必須 (Arrange-Act-Assert)
- カバレッジ閾値 80%

#### ux-psychology

43 の UX 心理学概念をデザインとレビューに統合する。

**P0 ブロッカー (ダークパターン):**
- 意図的誤解誘導
- 虚偽の希少性
- 隠れたコスト
- 強制ゲーミフィケーション
- 偽の社会的証明

**コードコメント:** `@ux-concept`, `@ux-reason` タグで根拠を明示。

---

## 典型的な利用シナリオ

### シナリオ 1: 新機能の実装

```
/kickoff #123          → 環境チェック・計画
/autopilot #123        → 自動実装・PR作成
/pr-check              → マージ前チェック
```

### シナリオ 2: Epic 単位の開発

```
/epic-autopilot #456   → 子 Issue を順次実装 (レビューゲート付き)
```

### シナリオ 3: 定期メンテナンス

```
/repo-cleanup          → 衛生チェック (レポートのみ)
/deps-audit            → 依存関係の脆弱性チェック
```

### シナリオ 4: 並列タスク実装

```
/kickoff #789          → 事前準備・タスク分割
/parallel-implement    → tasks.md から並列実装
/pr-check              → マージ前チェック
```
