# Autopilot Development ガイド — Codama LDH

> AI駆動で要件定義からPRマージまでを自動化する開発パイプラインの全体像・アーキテクチャ・セットアップ手順

---

## 目次

1. 全体思想
2. アーキテクチャ概要（6層モデル）
3. 使用する SaaS・ツールの説明
4. Autopilot フロー（人間 vs AI の責任分担）
5. Linear 連携フロー
6. リポジトリ構造マップ
7. Sub-Agent 一覧と役割
8. Slash Command 一覧
9. 3つの自動実装モード
10. クオリティゲート（3層構造）
11. セットアップ手順（チェックリスト）
12. 日常操作の早見表

---

## 1. 全体思想

**「ドキュメントが正、コードは実装」** — これがこのアーキテクチャの根幹。

DocDD（Document-Driven Development）の考え方で、PRD で「なぜ」、FRD で「何を」、Design Doc で「どう」を定義し、ADR/EDR で判断の根拠とエラー設計を残す。API Spec は OAS（OpenAPI Specification）で Contract-First の起点になる。

PR では必ず **Doc 変更・AC（受入条件）・コード差分の3点セット** が上がってくるようにし、「ドキュメントが更新されていない PR はマージできない」というルールを敷く。

人間がやるのは **要件を書く・ラベルを付ける・PR をレビューする** の3つだけ。残りは全て AI が自動で回す。

---

## 2. アーキテクチャ概要（6層モデル）
```
┌─────────────────────────────────────────────────────────┐
│  📋 Document Layer（要件の源泉）                         │
│  DocDD / SpecDD — PRD, FRD, Design Doc, ADR, EDR, OAS  │
├─────────────────────────────────────────────────────────┤
│  🤖 Agent Layer（自律実行）                              │
│  10体の Sub-Agent + 17 Skills + 9 Slash Commands        │
├─────────────────────────────────────────────────────────┤
│  🔀 Isolation Layer（ブランチごとの完全隔離）            │
│  Git Worktree + DevContainer + Traefik                  │
├─────────────────────────────────────────────────────────┤
│  🔒 Guardrail Layer（AIの暴走を防ぐ）                   │
│  Local Gate + Contract Gate + CI Gate                   │
├─────────────────────────────────────────────────────────┤
│  ✅ Acceptance Layer（マージ可否の最終判定）             │
│  DocDD + SpecDD + TDD + CI → pr-check 自動レビュー     │
├─────────────────────────────────────────────────────────┤
│  📦 App Layer（アプリケーション本体）                    │
│  Hono API (Clean Arch + DDD) + Next.js Web (FSD)       │
└─────────────────────────────────────────────────────────┘
```

### 各層の立ち位置

| 層 | 役割 | 主要コンポーネント |
|----|------|-------------------|
| **Document** | 要件の源泉。ドキュメントが「正」 | `docs/`, `.specify/specs/`, OAS |
| **Agent** | AI による自律的な調査・実装・テスト | `.claude/agents/`, `.claude/commands/`, `.claude/skills/` |
| **Isolation** | ブランチごとの環境隔離 | `tools/worktree/spawn.sh`, `docker-compose.worktree.yml`, `scripts/ensure-traefik.sh` |
| **Guardrail** | AI の権限制御・品質保証 | `.husky/`, `tools/contract`, `.github/workflows/ci.yml` |
| **Acceptance** | PR のマージ判定 | `/pr-check`, PR テンプレート, CODEOWNERS |
| **App** | 実際のアプリケーションコード | `projects/apps/api/`, `projects/apps/web/` |

### 各層の詳細解説

**Document Layer** — ドキュメントが「正」。`docs/` に PRD・ADR・テスト計画、`.specify/specs/` に Issue ごとの仕様・AC・実装計画を置く。PRではDoc・AC・変更差分をセットでレビューする。

**Agent Layer** — `.claude/agents/` に定義された10体の Sub-Agent が自律的に動く。Read-Only の偵察系（repo-explorer, security-auditor, code-reviewer, designer, qa-planner, architect）と Write 可能な実行系（implementer）に分かれる。`/autopilot` `/epic-autopilot` `/parallel-implement` がオーケストレーション。

**Isolation Layer** — `tools/worktree/spawn.sh` でブランチ作成 → Worktree 切り出し → `docker-compose.worktree.yml` で DevContainer 起動 → `scripts/ensure-traefik.sh` で Traefik ルーティング。ブランチごとに独立したサブネット（172.31.x.0/24）を自動割り当て。

**Guardrail Layer** — 3層のクオリティゲート + AI 権限制御。Local（husky pre-commit で secrets 検出 + lint-staged + OAS sync）、Contract（`./tools/contract` 経由で format→lint→typecheck→test→build）、CI（gitleaks + pnpm audit + seed-integrity + react-doctor）。AI は `.claude/settings.json` で権限制限、`.claude/hooks/` で操作監視。

**Acceptance Layer** — `/pr-check` が自動レビュー（P0/P1/P2）。CI 全ゲート通過 + AC 充足確認 → 人間 Approve → マージ。

**App Layer** — pnpm monorepo。`projects/apps/api/`（Hono + Prisma、Clean Architecture + DDD）と `projects/apps/web/`（Next.js 16、Feature-Sliced Design）。`projects/packages/` に共通型・ESLint・OAS 生成（Orval）。

---

## 3. 使用する SaaS・ツールの説明

### プロジェクト管理

**Linear** — モダンなプロジェクト管理ツール。Jira より軽量で API が充実。Issue・Epic・Cycle 管理、Webhook 連携が強み。この構成ではチケット起点として機能し、`.mcp.json` に linear-server が設定済み。Issue の PRD/FRD/AC を記述し、`/autopilot COD-41` で自動実装を起動する。

### AI 開発エージェント

**Claude Code** — Anthropic の CLI ベース AI コーディングツール。Sub-Agent（Task）、Skills、Slash Command、Hooks を持ち、自律的にコードを書ける。この構成の中核エンジンで、`.claude/` 配下に agents/commands/hooks/rules/skills が全て定義済み。`/autopilot` コマンドで Issue → PR を自動化する。

**Codex (OpenAI)** — OpenAI の GPT ベースコーディングモデル。Claude とは異なる視点でコードレビューを提供する。`.mcp.json` に codex MCP サーバー設定済みで、PR レビュー時の独立した第二意見として機能する（advisory、non-blocking）。

### コンテナ・インフラ

**Docker / Docker Compose** — アプリケーションをコンテナ化して実行するプラットフォーム。Compose で複数サービスを一括管理する。`docker-compose.worktree.yml` がブランチ別環境の定義で、MySQL + API + Web + Playwright の4サービス構成。ブランチごとに独立サブネット（172.31.x.0/24）を自動割り当て。

**DevContainer** — VSCode / Claude Code が使う開発コンテナの標準仕様。`.devcontainer/` に定義すると誰でも同じ環境で開発できる。AI エージェントの実行サンドボックスとして機能し、ファイアウォール（`init-firewall.sh`）とドメイン許可リスト（`allowlist.domains`）でネットワークも制限する。

**Traefik** — Docker ラベルベースの自動ルーティングが特徴のリバースプロキシ。設定ファイルなしでコンテナのラベルからルーティングルールを生成する。`docker-compose.worktree.yml` の Traefik ラベルで `{branch}.codama-ldh.localhost` にアクセスするとそのブランチ環境に到達。API は `/api` パスプレフィックスでルーティング。

**Git Worktree** — Git 標準機能。1つのリポジトリから複数のワーキングディレクトリを作れる。`.git` を共有するのでディスク効率が良い。`tools/worktree/spawn.sh` がブランチ作成 → Worktree 切り出し → DevContainer 起動を一括実行し、main ブランチを絶対に汚さない。

### CI / セキュリティ

**GitHub Actions** — GitHub 標準の CI/CD。push / PR イベントでワークフローを自動実行。`.github/workflows/ci.yml` で security → quality → lint → contract → seed-integrity → react-doctor の6ジョブ。

**gitleaks** — Git リポジトリ内の秘密情報（API キー、トークン等）を検出する OSS ツール。CI の security-checks ジョブ + husky pre-commit の両方で実行。AI が誤って secret をコードに含めた場合の最後の砦。

**Dependabot** — GitHub の依存パッケージ脆弱性自動検出・PR 生成ツール。`.github/dependabot.yml` で設定済み。

### コード品質

**husky / lint-staged** — husky は Git フックを簡単に管理するツール。lint-staged はステージされたファイルだけに linter 等を実行。`.husky/pre-commit` で secrets 検出 + lint-staged + OAS sync チェック。`.husky/commit-msg` で commitlint。

**commitlint** — Conventional Commits 形式（`feat(scope): message`）を強制するツール。`commitlint.config.js` で型（feat/fix/docs 等）と 100 文字制限を定義。

**Orval** — OpenAPI 仕様（YAML）から TypeScript の API クライアントや型定義を自動生成するツール。`projects/packages/api-contract/` に OAS 定義 → Orval で型生成 → フロント・バック共有。Contract-First 開発の要。

---

## 4. Autopilot フロー（人間 vs AI の責任分担）

### フロー全体図
```
┌──────────────────────────────────────────────────────────────┐
│ 👤 HUMAN: Linear Issue に PRD / FRD / AC を記述              │
└──────────────┬───────────────────────────────────────────────┘
               ▼
│ 🤖 Claude Code: /kickoff → Worktree + DevContainer 起動     │
               ▼
│ 🤖 Claude Code: /autopilot {issue} → 自動実装パイプライン   │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│   │ repo-explorer │  │ sec-auditor  │  │ code-reviewer │     │
│   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│          └────────────────┬┘                 │               │
│                           ▼                                  │
│                     implementer → TDD 実装                   │
│                           ▼                                  │
│                     test-runner → テスト検証                  │
               ▼
│ 🔒 Quality Gates: format → lint → typecheck → test → build  │
               ▼
│ 🤖 PR 作成 + /pr-check 自動レビュー                         │
               ▼
│ ☁️ CI: gitleaks → dep audit → contract → seed-integrity      │
               ▼
│ 👤 HUMAN: PR レビュー（Doc + AC + Diff）→ Approve → Merge   │
└──────────────────────────────────────────────────────────────┘
```

### 責任分担マトリクス

| タスク | 担当 | 具体的にやること | 頻度 |
|--------|------|-----------------|------|
| PRD / FRD 記述 | 👤 人間 | Linear Issue にビジネス要件・機能要件・AC を書く | 毎チケット |
| ラベル付与 | 👤 人間 | `autopilot: ready` ラベルをつけてパイプライン起動 | 毎チケット |
| 環境構築 | 🤖 AI | Worktree → DevContainer → Traefik 設定 | 自動 |
| コード調査 | 🤖 AI | repo-explorer が既存コード・依存関係を探索 | 自動 |
| 設計ドキュメント | 🤖 AI | Design Doc / ADR / EDR / API Spec をドラフト | 自動 |
| 実装 + テスト | 🤖 AI | TDD でテスト → コード → RED/GREEN ループ | 自動 |
| セキュリティ監査 | 🤖 AI | secret 漏洩チェック・依存脆弱性スキャン | 自動 |
| PR 作成 | 🤖 AI | Doc 差分 + AC + コード変更を PR にまとめる | 自動 |
| 自動レビュー | 🤖 AI | pr-check が DocDD/SpecDD/TDD 観点でコメント | 自動 |
| 最終レビュー | 👤 人間 | Doc + AC + Diff を確認し Approve or Request Changes | 毎チケット |
| Linear テンプレート整備 | 👤 人間 | Issue テンプレート・ワークフロー・ラベル設定 | 初回のみ |
| CI パイプライン整備 | 👤 人間 | GitHub Actions + gitleaks + dep audit | 初回のみ |
| ガードレール設定 | 👤 人間 | Sub-Agent 権限・hooks・DevContainer 制限 | 初回のみ |
| Traefik / Docker 基盤 | 👤 人間 | Traefik デプロイ・DevContainer テンプレート | 初回のみ |

---

## 5. Linear 連携フロー

### Linear → Autopilot の起動シーケンス
```
① Linear Issue に PRD/FRD/AC を書く（人間）
     ↓
② Claude Code で /autopilot COD-41 を実行（人間 → AI）
     ↓
③ AI が Linear Issue を読み取り → spec.md / plan.md 作成
     ↓
④ Worktree 切り出し → DevContainer 起動 → Traefik 登録
     ↓
⑤ repo-explorer + security-auditor + code-reviewer が並列調査
     ↓
⑥ implementer が TDD 実装（テスト先行 → RED → GREEN）
     ↓
⑦ Quality Gates 通過（format → lint → typecheck → test → build）
     ↓
⑧ PR 作成（Doc差分 + AC証跡テーブル + コード）
     ↓
⑨ /pr-check 自動レビュー（P0/P1/P2 判定）
     ↓
⑩ CI 全ゲート通過 → 人間がレビュー → Merge
```

### Linear Issue テンプレート
```
## PRD (背景・課題)
ユーザーが○○できないため、△△が必要。

## FRD (機能要件)
- ○○エンドポイントを追加する
- フロントに△△画面を作る

## Acceptance Criteria
- Given: ログイン済みユーザー
  When: /api/xxx に GET リクエスト
  Then: 200 で一覧が返る
- Given: 未認証
  When: /api/xxx に GET リクエスト
  Then: 401 が返る

## スコープ外
- 管理画面は今回対象外
```

### Linear 側で必要な設定

- Issue テンプレートに PRD / FRD / AC セクションを定義
- ワークフローに `Autopilot Ready` → `In Progress` → `In Review` ステートを追加（任意）
- ラベル `type:*` `role:*` `priority:*` を `.github/labels.yml` と揃える
- GitHub 連携を有効化（Settings → Integrations → GitHub）— PR マージで Issue 自動クローズ
- `.mcp.json` に linear-server が定義済みなので、`LINEAR_API_KEY` を環境変数で渡すだけで動作

---

## 6. リポジトリ構造マップ
```
codama-ldh/
├── .claude/                          ← AI エージェント設定（中核）
│   ├── agents/                       ← 10体の Sub-Agent 定義
│   │   ├── repo-explorer.md
│   │   ├── implementer.md
│   │   ├── test-runner.md
│   │   ├── e2e-runner.md
│   │   ├── security-auditor.md
│   │   ├── code-reviewer.md
│   │   ├── designer.md
│   │   ├── qa-planner.md
│   │   ├── architect.md
│   │   └── issue-project-manager.md
│   ├── commands/                     ← 9個の Slash Command
│   │   ├── autopilot.md
│   │   ├── epic-autopilot.md
│   │   ├── parallel-implement.md
│   │   ├── pr-check.md
│   │   ├── kickoff.md
│   │   ├── up.md / down.md
│   │   ├── repo-cleanup.md
│   │   └── deps-audit.md
│   ├── hooks/                        ← 操作監視フック
│   │   ├── pre-bash.sh               ← git 操作・secret 検証
│   │   ├── pre-edit.sh               ← generated ファイル保護
│   │   └── post-edit.sh              ← TypeScript 自動フォーマット
│   ├── rules/                        ← 11個の常時適用ルール
│   │   ├── 01-core.md                ← 非交渉事項、コミット形式
│   │   ├── 02-backend.md             ← Clean Architecture、API ルール
│   │   ├── 03-frontend.md            ← FSD、ダークモード
│   │   ├── 04-security.md            ← シークレット、認証、インジェクション防止
│   │   ├── 05-quality.md             ← Golden Commands、修正順序
│   │   ├── 06-codex-mcp.md           ← Codex モデル選択、レートリミット
│   │   ├── 07-epic-management.md     ← Epic Mermaid、ステータス管理
│   │   ├── 08-issue-labels.md        ← ラベルグループ、SSOT
│   │   ├── 09-ai-review.md           ← AI レビューコメント形式
│   │   ├── 10-user-communication.md  ← 3行サマリー、進捗報告
│   │   └── 11-language.md            ← 出力言語ポリシー（日本語）
│   ├── skills/                       ← 17個のドメインスキル
│   └── settings.json                 ← 権限制御（Allow/Deny リスト）
│
├── .devcontainer/                    ← DevContainer 定義
│   ├── Dockerfile.dev                ← 開発用イメージ
│   ├── devcontainer.json             ← VSCode/Claude 設定
│   ├── init-firewall.sh              ← ネットワーク制限（iptables）
│   ├── allowlist.domains             ← 通信許可ドメイン一覧
│   ├── init-claude-auth.sh           ← Claude 認証セットアップ
│   └── setup-ai-auth.sh             ← AI サービス認証
│
├── .github/                          ← CI / テンプレート
│   ├── workflows/
│   │   ├── ci.yml                    ← 6ジョブ CI パイプライン
│   │   ├── docker-build.yml          ← Docker イメージビルド
│   │   └── policy.yml                ← ポリシー検証
│   ├── ISSUE_TEMPLATE/               ← 6種の Issue テンプレート
│   ├── PULL_REQUEST_TEMPLATE/        ← PR テンプレート
│   ├── pull_request_template.md      ← デフォルト PR テンプレート
│   ├── labels.yml                    ← ラベル定義（SSOT）
│   ├── CODEOWNERS                    ← レビュアー自動割当
│   └── dependabot.yml                ← 依存自動更新
│
├── tools/                            ← ガードレール & ツール群
│   ├── contract                      ← Golden Commands エントリポイント
│   ├── _contract/stack/              ← 26個のコマンド実装
│   ├── worktree/                     ← spawn.sh（構築）, cleanup.sh（破棄）
│   ├── orchestrate/                  ← 手動オーケストレーション
│   ├── git-hooks/                    ← カスタム git hooks
│   ├── policy/                       ← ポリシー検証
│   └── react-doctor/                 ← React コンポーネント品質チェック
│
├── docs/                             ← ドキュメント（Golden Outputs）
│   ├── 00_process/                   ← 開発プロセス・運用ルール
│   ├── 01_product/                   ← PRD・デザインシステム
│   ├── 02_architecture/              ← ADR・API 仕様（OAS）
│   ├── 03_quality/                   ← テスト計画・AC
│   ├── 04_delivery/                  ← リリースプロセス
│   └── 05_development/               ← 開発ガイド
│
├── projects/                         ← アプリケーションコード
│   ├── apps/
│   │   ├── api/                      ← Hono + Prisma（Clean Arch + DDD）
│   │   └── web/                      ← Next.js 16（Feature-Sliced Design）
│   └── packages/
│       ├── shared/                   ← 共通 DDD 抽象、型定義
│       ├── guardrails/               ← アーキテクチャ強制（ESLint プラグイン）
│       ├── eslint-config/            ← 共有 ESLint 設定
│       └── api-contract/             ← OpenAPI 仕様 + 生成型（Orval）
│
├── .specify/specs/                   ← Issue 別の仕様・計画
│   └── {issue-id}/
│       ├── spec.md                   ← 仕様（Given/When/Then AC）
│       ├── plan.md                   ← 実装計画
│       └── tasks.md                  ← タスク一覧（parallel-implement 用）
│
├── scripts/                          ← ユーティリティスクリプト
│   ├── init-environment.sh           ← Worktree 環境初期化
│   ├── ensure-traefik.sh             ← Traefik ネットワーク作成
│   └── down.sh                       ← 環境停止
│
├── AGENTS.md                         ← 全ルールの最上位権威（CANONICAL）
├── CLAUDE.md                         ← Claude Code 設定ガイド
├── CONTRIBUTING.md                   ← 開発参加ガイド
├── docker-compose.worktree.yml       ← ブランチ別 Docker Compose
├── .mcp.json                         ← MCP サーバー設定
├── Makefile                          ← 診断・ヘルパーコマンド
├── commitlint.config.js              ← Conventional Commits 設定
└── .husky/                           ← Git フック
    ├── pre-commit                    ← secrets + lint-staged + OAS sync
    └── commit-msg                    ← commitlint 検証
```

---

## 7. Sub-Agent 一覧と役割

### Read-Only（偵察系 — 並列実行）

| Agent | 役割 | 権限 |
|-------|------|------|
| **repo-explorer** | 既存コード探索・影響範囲分析・依存関係の把握 | Read, Glob, Grep |
| **security-auditor** | 脆弱性スキャン・認証/XSS チェック | Read, Grep, Glob |
| **code-reviewer** | コード品質レビュー | Read, Grep, Glob |
| **designer** | UX/UI 品質監査 | Read, Grep, Glob |
| **qa-planner** | テスト計画・AC 検証 | Read, Grep, Glob |
| **architect** | アーキテクチャレビュー・ADR 作成 | Read, Grep, Glob |

### Write 可能（実行系）

| Agent | 役割 | 権限 |
|-------|------|------|
| **implementer** | コード生成・リファクタ（最小 diff） | Read, Write, Edit, Bash 等全権限 |
| **test-runner** | テスト実行・カバレッジ検証 | Bash, Read |
| **e2e-runner** | E2E テスト + 失敗分析 | Bash, Read, Grep, Glob |
| **issue-project-manager** | Epic/Project ステータスライフサイクル管理 | Bash, Read, Grep, Glob |

### 並列実行フロー
```
User: "認証機能を追加"
  ├─ repo-explorer: 関連コード探索        ─┐
  ├─ security-auditor: セキュリティ確認    ├─ 並列（Read-Only）
  └─ code-reviewer: 既存コード品質確認    ─┘
      ↓
  implementer: 実装（Write）
      ↓
  test-runner: テスト実行（Bash）
```

---

## 8. Slash Command 一覧

| コマンド | 目的 | 使用ツール |
|----------|------|-----------|
| `/kickoff` | 開発セッション開始（Worktree + DevContainer + contract チェック） | Bash, Read, Grep, Glob, Task |
| `/autopilot` | 単一 Issue → PR の完全自動パイプライン | Bash, Read, Grep, Glob, Task |
| `/epic-autopilot` | Epic の子 Issue を依存順に順次自動実行 | Bash, Read, Grep, Glob, Task, AskUserQuestion, Write, Edit |
| `/parallel-implement` | 1 Issue 内のタスクを Wave 単位で並列実装 | Bash, Read, Grep, Glob, Task, Write, Edit |
| `/pr-check` | PR の包括的自動レビュー（5観点） | Bash, Read, Grep, Glob, Task |
| `/up` | フルスタック環境起動（Traefik ルーティング含む） | Bash |
| `/down` | 環境停止 | Bash |
| `/repo-cleanup` | ドリフト検出・不要ファイル・技術的負債チェック | Bash, Read, Grep, Glob |
| `/deps-audit` | 依存パッケージ脆弱性監査 | Bash |

---

## 9. 3つの自動実装モード

| モード | コマンド | 対象 | 並列度 | 人間ゲート |
|--------|---------|------|--------|-----------|
| **autopilot** | `/autopilot #261` or `/autopilot COD-41` | 単一 Issue | Sub-Agent 並列（調査フェーズ） | PR レビュー時のみ（`--yolo` で省略可） |
| **epic-autopilot** | `/epic-autopilot #677` | Epic（子 Issue 群） | Issue は順次、Agent は並列 | spike / security / DB migration の前後 |
| **parallel-implement** | `/parallel-implement` | 1 Issue 内の複数タスク | Wave 単位で implementer 並列 | なし（coordinator が整合性保証） |

### /autopilot の内部フェーズ

1. **Parse Issue** — Linear URL / GitHub Issue # を解析
2. **Spawn Worktree** — `./tools/worktree/spawn.sh` でブランチ + 環境構築
3. **Start DevContainer** — Docker Compose 起動
4. **Implement** — implementer Sub-Agent が TDD 実装
5. **Quality Gates** — format → lint → typecheck → test → build
6. **PR Creation** — Doc 差分 + AC 証跡テーブル + コード変更
7. **AI Review** — P0/P1/P2 判定のレビューコメント投稿
```
# 使用例
/autopilot #261
/autopilot COD-41
/autopilot https://linear.app/codama/issue/COD-41
/autopilot --yolo --max-turns 50
```

---

## 10. クオリティゲート（3層構造）

### Layer 1: Local Gate（commit 前）

| チェック | ツール | 設定ファイル |
|----------|--------|-------------|
| Secrets 検出 | husky pre-commit 内のスキャン | `.husky/pre-commit` |
| Lint + Format | lint-staged（ESLint + Prettier） | `.husky/pre-commit` |
| OAS sync | OpenAPI 生成ファイル整合性チェック | `.husky/pre-commit` |
| Lockfile sync | package.json と pnpm-lock.yaml の同期確認 | `.husky/pre-commit` |
| Commit 形式 | commitlint（Conventional Commits） | `.husky/commit-msg` |

### Layer 2: Contract Gate（手動 / AI 実行）
```
./tools/contract format       # Prettier
./tools/contract lint         # ESLint
./tools/contract typecheck    # tsc --noEmit
./tools/contract test         # Vitest
./tools/contract build        # Turbo build
./tools/contract guardrail    # アーキテクチャ制約検証
./tools/contract e2e          # Playwright E2E
./tools/contract audit        # 依存脆弱性チェック
```

**修正順序（Fix Order）**: `format` → `lint` → `typecheck` → `test` → `build`

> **重要**: 必ず `./tools/contract` 経由で実行すること。直接 `pnpm lint` や `npm test` は禁止。

### Layer 3: CI Gate（push 後）

| ジョブ | 内容 | ブロッカー |
|--------|------|-----------|
| **security-checks** | gitleaks（secret スキャン）+ pnpm audit（脆弱性） | P0 |
| **quality-checks** | Lockfile 同期 + OpenAPI 生成ファイル確認 | P0 |
| **lint-and-typecheck** | Prisma generate → format:check → lint → typecheck | P0 |
| **contract** | pnpm test + pnpm build | P0 |
| **seed-integrity** | MySQL + Prisma db:push + db:seed + integrity-check | P1 |
| **react-doctor** | React コンポーネント品質分析（条件付き） | P2 |

---

## 11. セットアップ手順（チェックリスト）

### ✅ 既に完了済み（リポジトリに組み込み済み）

- [x] `.claude/agents/` — 10体の Sub-Agent 定義
- [x] `.claude/commands/` — 9個の Slash Command
- [x] `.claude/hooks/` — pre-bash, pre-edit, post-edit フック
- [x] `.claude/rules/` — 11個の常時適用ルール
- [x] `.claude/skills/` — 17個のドメインスキル
- [x] `.claude/settings.json` — 権限制御（Allow/Deny リスト）
- [x] `.devcontainer/` — Dockerfile, devcontainer.json, ファイアウォール
- [x] `docker-compose.worktree.yml` — ブランチ別 Docker Compose
- [x] `tools/contract` — Golden Commands ラッパー
- [x] `tools/worktree/spawn.sh` — Worktree 自動構築スクリプト
- [x] `.github/workflows/ci.yml` — CI パイプライン
- [x] `.husky/` — pre-commit, commit-msg フック
- [x] `commitlint.config.js` — Conventional Commits 設定
- [x] `.github/ISSUE_TEMPLATE/` — Issue テンプレート
- [x] `.github/pull_request_template.md` — PR テンプレート
- [x] `.github/labels.yml` — ラベル定義（SSOT）

### ⬜ ローカル環境構築

- [ ] **Docker Desktop** インストール（メモリ 4GB 以上推奨）
- [ ] **Node.js 20+** インストール
- [ ] **pnpm** インストール — `npm install -g pnpm`
- [ ] **Claude Code CLI** インストール — `npm install -g @anthropic-ai/claude-code`
- [ ] **GitHub CLI** インストール — `brew install gh`
- [ ] **Git 2.20+** 確認（Worktree 機能が必要）
```
# インストール確認
docker --version && docker compose version
node --version && pnpm --version
claude --version
gh --version
git --version
```

### ⬜ API キー・トークン設定

- [ ] **ANTHROPIC_API_KEY** — Anthropic Console から取得
- [ ] **GITHUB_TOKEN** — `gh auth login` で設定
- [ ] **LINEAR_API_KEY** — Linear Settings → API → Personal API keys
- [ ] **OPENAI_API_KEY** — Codex レビュー用（オプション）
```
# .env.example をコピーして編集
cp .env.example .env

# Claude Code 認証
claude auth

# GitHub CLI 認証
gh auth login

# Linear API キー設定
export LINEAR_API_KEY=lin_api_xxxxx
```

### ⬜ 初回セットアップ
```
# 1. クローン
git clone git@github.com:xxx/codama-ldh.git
cd codama-ldh

# 2. 依存インストール（husky フックも自動セットアップ）
pnpm install

# 3. Traefik ネットワーク作成
./scripts/ensure-traefik.sh

# 4. 開発環境起動
./tools/contract up

# 5. 動作確認
./tools/contract format
./tools/contract lint
./tools/contract typecheck
./tools/contract test
```

### ⬜ Linear 連携

- [ ] チームの Issue テンプレートに PRD / FRD / AC セクションを追加
- [ ] ワークフローに `Autopilot Ready` → `In Progress` → `In Review` を追加（任意）
- [ ] ラベルを `.github/labels.yml` と揃える
- [ ] GitHub 連携を有効化（Settings → Integrations → GitHub）

### ⬜ CODEOWNERS カスタマイズ

`.github/CODEOWNERS` のテンプレート値を実際のチーム名に置換：
```
/docs/                       @your-org/docs-team      → @codama/docs-team
/docs/02_architecture/adr/   @your-org/architects     → @codama/architects
/.devcontainer/               @your-org/platform-team  → @codama/platform-team
/tools/                       @your-org/platform-team  → @codama/platform-team
```

---

## 12. 日常操作の早見表

| やりたいこと | コマンド | 備考 |
|-------------|---------|------|
| 開発セッション開始 | `/kickoff` | Worktree + DevContainer + contract チェック |
| 単一 Issue を自動実装 | `/autopilot #261` or `/autopilot COD-41` | Issue → 調査 → 実装 → テスト → PR |
| Epic を順次実行 | `/epic-autopilot #677` | 子 Issue を依存順に自動実行 |
| タスク並列実装 | `/parallel-implement` | `.specify/specs/*/tasks.md` の依存グラフを解析 |
| PR 自動レビュー | `/pr-check` | 5観点で P0/P1/P2 判定 |
| 環境起動 | `/up` or `./tools/contract up` | Docker Compose + Traefik |
| 環境停止 | `/down` or `./tools/contract down` | コンテナ停止 |
| 品質チェック一括 | `./tools/contract guardrail` | format + lint + typecheck + test + build |
| E2E テスト | `./tools/contract e2e` | Playwright コンテナで実行 |
| 脆弱性チェック | `/deps-audit` or `./tools/contract audit` | pnpm audit |
| Worktree 手動作成 | `./tools/worktree/spawn.sh implementer --issue 123` | ブランチ + Worktree + DevContainer |
| Worktree 削除 | `./tools/worktree/cleanup.sh <branch>` | PR マージ後のクリーンアップ |
| 技術的負債チェック | `/repo-cleanup` | ドリフト検出、不要ファイル |

---

## 補足

### MCP サーバー設定（`.mcp.json`）

| サーバー | 用途 |
|----------|------|
| **context7** | 最新ライブラリドキュメント参照 |
| **playwright** | ブラウザ自動化・E2E テスト |
| **codex** | GPT ベースのクロスモデルレビュー |
| **linear-server** | Linear API 連携（Issue 読み取り・ステータス更新） |

### 言語ポリシー

| 対象 | 言語 |
|------|------|
| PR 説明文（Summary / Changes） | 日本語 |
| docs/ 内のドキュメント | 日本語 |
| AI レビューコメント | 日本語 |
| Issue コメント | 日本語 |
| コード識別子（変数名・関数名） | 英語 |
| Conventional Commits type/scope | 英語 |
| CLI コマンド・ファイルパス | 英語 |

### ドキュメント構造（Golden Outputs）

| ディレクトリ | 内容 |
|-------------|------|
| `docs/00_process/` | 開発プロセス、Git/PR ガバナンス、AI レビューパイプライン |
| `docs/01_product/` | PRD、プロダクトアイデンティティ、デザインシステム |
| `docs/02_architecture/` | ADR、API 仕様（OAS YAML） |
| `docs/03_quality/` | テスト計画、受入条件 |
| `docs/04_delivery/` | リリースプロセス |
| `docs/05_development/` | 環境変数ガイド、DevContainer、ガードレール |