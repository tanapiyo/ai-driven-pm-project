# Codama LDH

AI 駆動の DocDD (Document-Driven Development) 開発基盤。
Linear Issue に要件を書き、`/autopilot` で実装から PR 作成までを自動化する。

---

## 前提環境

### 必須ツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Docker Desktop | 最新 | コンテナ実行 (メモリ 4GB 以上推奨) |
| Node.js | 20 以上 | ランタイム |
| pnpm | 9.x | パッケージマネージャ |
| Git | 2.20 以上 | Worktree 機能に必要 |
| GitHub CLI (`gh`) | 最新 | PR/Issue 操作 |
| Claude Code CLI | 最新 | AI エージェント実行 |

### 任意ツール

| ツール | 用途 |
|--------|------|
| Codex CLI (`codex`) | クロスモデル PR レビュー |

### 確認コマンド

```bash
docker --version && docker compose version
node --version      # v20 以上
pnpm --version      # 9.x
git --version       # 2.20 以上
gh --version
claude --version
```

---

## API キー・認証

| キー | 取得元 | 必須 |
|------|--------|------|
| ANTHROPIC_API_KEY | [Anthropic Console](https://console.anthropic.com/) | 必須 |
| GitHub Token | `gh auth login` で設定 | 必須 |
| LINEAR_API_KEY | Linear Settings → API → Personal API keys | 必須 |
| OPENAI_API_KEY | [OpenAI Platform](https://platform.openai.com/) | 任意 (Codex レビュー用) |

```bash
# Claude Code 認証
claude auth

# GitHub CLI 認証
gh auth login

# Linear API キー設定
export LINEAR_API_KEY=lin_api_xxxxx
```

---

## 初回セットアップ

```bash
# 1. クローン
git clone git@github.com:tanapiyo/ai-driven-pm-project.git
cd ai-driven-pm-project

# 2. 依存インストール (Husky フックも自動セットアップ)
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

---

## 技術スタック

```
projects/
├── apps/
│   ├── api/    Express + Prisma (Clean Architecture + DDD)
│   └── web/    Next.js + Tailwind CSS (Feature-Sliced Design)
└── packages/
    ├── shared/          ドメイン抽象 (Entity, Repository, Result, ValueObject)
    ├── api-contract/    OpenAPI 定義 + Orval 型生成
    ├── guardrails/      アーキテクチャ検証ツール
    └── eslint-config/   共有 ESLint ルール
```

| レイヤー | 技術 | アーキテクチャ |
|---------|------|-------------|
| バックエンド | Express + Prisma + MySQL 8.4 | Clean Architecture + DDD |
| フロントエンド | Next.js + React + Tailwind CSS | Feature-Sliced Design (FSD) |
| API 契約 | OpenAPI 3.0 + Orval | Contract-First |
| テスト | Vitest (単体) + Playwright (E2E) | TDD |
| CI | GitHub Actions | gitleaks + audit + lint + test + build |
| コンテナ | Docker Compose + Traefik | ブランチ別隔離環境 |

---

## 開発ルール

### 絶対ルール (AGENTS.md が正規ソース)

1. **Worktree + DevContainer で作業する** -- main ブランチ直接編集禁止
2. **DocDD を守る** -- Spec / Plan / AC なしで実装を開始しない
3. **Golden Commands は Contract 経由** -- 直接 `pnpm lint` を叩かない
4. **破壊的変更の禁止** -- 既存ファイルの無断上書き禁止
5. **CI が通った状態で完了する**
6. **HTTP API は OpenAPI 仕様を先に定義する**

### ブランチ命名

| パターン | 例 |
|---------|-----|
| `feat/<issue>-<slug>` | `feat/GH-123-auth-token` |
| `fix/<issue>-<slug>` | `fix/login-null-pointer` |
| `docs/<slug>` | `docs/api-reference` |
| `chore/<slug>` | `chore/update-deps` |

### コミットメッセージ

Conventional Commits 形式必須。commitlint で自動検証される。

```
feat(auth): add JWT token refresh endpoint
fix(ui): prevent double submission on payment form
docs: update API reference for v2 endpoints
```

ヘッダー 100 文字以内。type は `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`。

---

## Golden Commands

全コマンドは `./tools/contract` 経由で実行する。直接 `pnpm` を叩かない。

### 品質チェック

```bash
./tools/contract format       # Prettier フォーマット
./tools/contract lint         # ESLint 静的解析
./tools/contract typecheck    # TypeScript 型チェック
./tools/contract test         # Vitest ユニットテスト
./tools/contract build        # ビルド
./tools/contract guardrail    # アーキテクチャガードレール
./tools/contract e2e          # Playwright E2E テスト
./tools/contract audit        # 依存パッケージ脆弱性チェック
```

CI 失敗時の修正順序: `format` → `lint` → `typecheck` → `test` → `build`

### 環境管理

```bash
./tools/contract up           # DevContainer + フルスタック起動
./tools/contract up:status    # コンテナステータス確認
./tools/contract up:logs      # ログ表示
./tools/contract up:stop      # 停止
./tools/contract dev          # 開発サーバー起動
./tools/contract dev:stop     # 開発サーバー停止
```

### データベース

```bash
./tools/contract migrate      # DB マイグレーション
./tools/contract db:setup     # DB 初期化
./tools/contract db:reset     # DB リセット
```

### OpenAPI

```bash
./tools/contract openapi-check       # OAS 仕様検証
./tools/contract openapi-generate    # 型コード生成 (フロント + バック)
```

### Makefile 経由の実行

`make` コマンドでも Golden Commands を実行できる。

```bash
make help           # 利用可能コマンド一覧
make format         # ./tools/contract format
make lint           # ./tools/contract lint
make typecheck      # ./tools/contract typecheck
make test           # ./tools/contract test
make build          # ./tools/contract build
make e2e            # ./tools/contract e2e
make migrate        # ./tools/contract migrate
```

#### DevContainer 診断

```bash
make devcontainer:doctor              # 必須ツール・DNS・API アクセスチェック
make devcontainer:firewall:status     # ファイアウォール状態確認
make devcontainer:firewall:verify     # ファイアウォール動作検証
make devcontainer:allowlist:check     # ドメイン許可リスト検証
```

---

## 開発手順

### 通常の開発フロー

```
1. Linear Issue に要件 (PRD / FRD / AC) を記述
2. Worktree を作成
   ./tools/worktree/spawn.sh feat/GH-123-feature-name
3. DevContainer を起動
   ./tools/contract up
4. 実装 + テスト
5. 品質チェック
   ./tools/contract format && ./tools/contract lint && \
   ./tools/contract typecheck && ./tools/contract test && \
   ./tools/contract build
6. コミット + PR 作成
   git add ... && git commit -m "feat(scope): description"
   gh pr create --base main
7. CI 通過 + レビュー + マージ
8. クリーンアップ
   ./tools/worktree/cleanup.sh
```

### AI Autopilot フロー

人間がやるのは「要件を書く」「ラベルを付ける」「PR をレビューする」の 3 つだけ。

```
1. Linear Issue に PRD / FRD / AC を記述
2. Claude Code で /autopilot を実行
   /autopilot #123          (GitHub Issue)
   /autopilot COD-41        (Linear Issue)
3. AI が自動で:
   - Worktree + DevContainer 起動
   - コードベース調査 (repo-explorer, security-auditor, code-reviewer が並列)
   - TDD 実装 (implementer)
   - 品質ゲート通過
   - PR 作成 + AI レビュー
4. 人間が PR レビュー → Approve → Merge
```

### Epic 単位の開発

```
/epic-autopilot #456
```

子 Issue を依存順に順次実行する。Issue 間に人間のレビューゲートを挟む。

### 並列タスク実装

```
/parallel-implement
```

`tasks.md` の依存グラフを解析し、独立タスクを複数 implementer で並列実装する。

---

## AI エージェント構成

### Sub-Agent 一覧

| Agent | 役割 | 権限 |
|-------|------|------|
| repo-explorer | コードベース探索 | 読み取り専用 |
| security-auditor | 脆弱性スキャン | 読み取り専用 |
| code-reviewer | コードレビュー | 読み取り専用 |
| designer | UX/UI 品質監査 | 読み取り専用 |
| qa-planner | テスト計画・AC 検証 | 読み取り専用 |
| architect | ADR 作成・アーキテクチャ判断 | 読み取り専用 |
| implementer | 機能実装・バグ修正 | 全権限 |
| test-runner | 品質ゲート実行 | Bash 実行 |
| e2e-runner | E2E テスト実行 | Bash 実行 |
| issue-project-manager | Epic ステータス管理 | Bash 実行 |

### Slash Command 一覧

| コマンド | 用途 |
|----------|------|
| `/kickoff` | 開発セッション開始 (環境チェック + 探索 + 計画) |
| `/autopilot #123` | Issue → PR の全自動パイプライン |
| `/epic-autopilot #456` | Epic の子 Issue を順次自動実行 |
| `/parallel-implement` | タスクの並列実装 |
| `/pr-check` | PR マージ前の総合チェック |
| `/up` | 開発環境起動 |
| `/down` | 開発環境停止 + Worktree 削除 |
| `/repo-cleanup` | リポジトリ衛生チェック |
| `/deps-audit` | 依存関係脆弱性チェック |

---

## 3 層クオリティゲート

### Layer 1: Local Gate (コミット前)

Husky pre-commit フックで自動実行される。

| チェック | 内容 |
|----------|------|
| シークレット検出 | AWS Key, GitHub Token, JWT, Private Key |
| lint-staged | ESLint + Prettier (ステージングされたファイルのみ) |
| OpenAPI 同期 | openapi.yaml 変更時に型生成ファイルを自動再生成 |
| Lockfile 同期 | package.json と pnpm-lock.yaml の整合性チェック |
| commitlint | Conventional Commits 形式の検証 |

### Layer 2: Contract Gate (手動 / AI 実行)

```bash
./tools/contract format → lint → typecheck → test → build → guardrail → e2e
```

### Layer 3: CI Gate (push 後)

| ジョブ | 内容 | 優先度 |
|--------|------|--------|
| security-checks | gitleaks + pnpm audit | P0 |
| quality-checks | Lockfile 同期 + OpenAPI 生成ファイル確認 | P0 |
| lint-and-typecheck | format:check + lint + typecheck | P0 |
| contract | test + build | P0 |
| seed-integrity | DB seed 整合性 | P1 |
| react-doctor | React コンポーネント品質 | P2 |

---

## Docker 環境構成

`docker-compose.worktree.yml` で 5 サービスが起動する。

| サービス | イメージ | ポート | 用途 |
|---------|---------|--------|------|
| db | MySQL 8.4 | 3306 (内部) | データベース |
| dev | Dockerfile.dev | - | DevContainer (pnpm install + 待機) |
| web | Dockerfile.dev | 3000 | Next.js フロントエンド |
| api | Dockerfile.dev | 8080 | Express バックエンド |
| playwright | Dockerfile.playwright | - | E2E テスト実行環境 |

### ブランチ別隔離

- Worktree ごとに独立したサブネット (`172.31.x.0/24`) を自動割り当て
- Traefik で `{branch}.localhost` にルーティング
  - `http://{branch}.localhost` → Web (フロント)
  - `http://{branch}.localhost/api` → API (バック)

---

## MCP サーバー連携

`.mcp.json` で 4 つの MCP サーバーを設定済み。

| サーバー | 用途 |
|----------|------|
| context7 | 最新ライブラリドキュメント参照 |
| playwright | ブラウザ自動化・E2E テスト |
| codex | GPT ベースのクロスモデル PR レビュー |
| linear-server | Linear API 連携 (Issue 読み取り・ステータス更新) |

---

## ドキュメント構造

| ディレクトリ | 内容 |
|-------------|------|
| docs/00_process/ | 開発プロセス、Git/PR ガバナンス、AI レビューパイプライン |
| docs/01_product/ | PRD、デザインシステム、画面仕様、用語集 |
| docs/02_architecture/ | ADR (18 件)、OpenAPI 仕様 (7 件)、ER 図 |
| docs/03_quality/ | テスト計画、受入条件テンプレート、QA 手順 |
| docs/04_delivery/ | リリースプロセス、デプロイ戦略 |
| docs/05_development/ | API 設計標準、DB セットアップ、環境変数 |

---

## 日常操作の早見表

| やりたいこと | コマンド |
|-------------|---------|
| 開発セッション開始 | `/kickoff` |
| 単一 Issue を自動実装 | `/autopilot #123` |
| Epic を順次実行 | `/epic-autopilot #456` |
| タスク並列実装 | `/parallel-implement` |
| PR 自動レビュー | `/pr-check` |
| 環境起動 | `/up` or `./tools/contract up` |
| 環境停止 | `/down` or `./tools/contract up:stop` |
| 品質チェック一括 | `./tools/contract guardrail` |
| E2E テスト | `./tools/contract e2e` |
| 脆弱性チェック | `/deps-audit` or `./tools/contract audit` |
| Worktree 手動作成 | `./tools/worktree/spawn.sh feat/GH-123-feature` |
| Worktree 削除 | `./tools/worktree/cleanup.sh` |
| 技術的負債チェック | `/repo-cleanup` |
| DevContainer 診断 | `make devcontainer:doctor` |

---

## 関連ドキュメント

| ファイル | 内容 |
|---------|------|
| [AGENTS.md](AGENTS.md) | 全ルールの正規ソース (Canonical) |
| [CLAUDE.md](CLAUDE.md) | Claude Code 設定ガイド |
| [.claude/how-to-use/](/.claude/how-to-use/) | 詳細ガイド集 (Claude 設定, Git Hooks, リポジトリ構成, 開発フロー) |
| [docs/00_process/process.md](docs/00_process/process.md) | DocDD 開発プロセス定義 |
| [docs/00_process/runbook_initial_setup.md](docs/00_process/runbook_initial_setup.md) | 初回セットアップ手順 |
