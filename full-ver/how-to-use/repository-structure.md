# リポジトリ フォルダ構成ガイド

各フォルダの役割と中身を網羅的に説明する。

---

## 全体構成 (トップレベル)

```
ai-driven-pm-project/
├── .claude/          # Claude Code 設定 (agents, commands, hooks, rules, skills)
├── .codex/           # OpenAI Codex 設定
├── .devcontainer/    # DevContainer 開発環境
├── .git-hooks/       # カスタム Git フック (未有効)
├── .github/          # GitHub CI/CD, テンプレート, ラベル, CODEOWNERS
├── .husky/           # Husky Git フック (有効)
├── .specify/         # 機能仕様書の格納先
├── .vscode/          # VS Code 設定
├── design/           # デザイントークン定義
├── docs/             # ドキュメント一式 (プロセス, プロダクト, 設計, 品質, 開発)
├── infra/            # インフラ (Traefik, Docker テンプレート)
├── old/              # アーカイブ (旧 PM テンプレート集)
├── projects/         # 本体ソースコード (TypeScript モノレポ)
├── prompts/          # AI エージェントのロール定義・スキル
├── scripts/          # 環境構築・ユーティリティスクリプト
├── skill/            # UX 心理学パック
├── tools/            # 開発ツール (contract, worktree, orchestrate, policy)
│
├── AGENTS.md         # エージェント定義の正規ソース
├── CLAUDE.md         # Claude Code への指示書
├── Makefile          # Make タスク定義
├── commitlint.config.js  # コミットメッセージルール
├── docker-compose.worktree.yml  # ワークツリー用 Docker Compose
├── package.json      # ルート (Husky + commitlint)
└── .mcp.json         # MCP サーバー設定
```

---

## .claude/

Claude Code の動作を制御する全設定。別ドキュメント [claude-code-config.md](claude-code-config.md) に詳細あり。

| サブフォルダ | 件数 | 内容 |
|-------------|------|------|
| agents/ | 10 | 専門サブエージェント定義 (architect, implementer, test-runner 等) |
| commands/ | 9 | `/autopilot`, `/kickoff`, `/pr-check` 等のワークフロー |
| hooks/ | 3 | Bash ガード, 生成コード保護, 自動フォーマット |
| rules/ | 11 | 常時適用ルール (コア, バックエンド, フロントエンド, セキュリティ等) |
| skills/ | 19 | 必要時に読み込む HOW-TO (TDD, API 設計, Issue 作成等) |
| settings.json | 1 | 権限の許可/拒否リスト, フック定義 |

---

## .codex/

OpenAI Codex の設定。

| ファイル | 内容 |
|---------|------|
| config.toml | 承認ポリシー (`on-request`), サンドボックスモード (`workspace-write`), ドキュメントフォールバック (AGENTS.md, CLAUDE.md) |

---

## .devcontainer/

Docker ベースの開発環境定義。`/up` コマンドで起動する。

| ファイル | 内容 |
|---------|------|
| devcontainer.json | メイン設定: サービス名, VS Code 拡張, post-create コマンド |
| Dockerfile | 本番用コンテナイメージ |
| Dockerfile.dev | 開発用コンテナイメージ |
| Dockerfile.playwright | E2E テスト用イメージ (Chromium) |
| allowlist.domains | ネットワーク通信の許可ドメインリスト (deny-by-default) |
| allowlist.readme.md | ドメイン許可リストの管理ガイド |
| git-wrapper.sh | Git の safe directory 設定 |
| init-claude-auth.sh | Claude 認証初期化 |
| init-firewall.sh | ファイアウォール初期化 |
| init-gh-token.sh | GitHub トークン初期化 |
| setup-ai-auth.sh | AI サービス認証セットアップ |

---

## .git-hooks/

カスタム Git フック。現在 `core.hooksPath` 未設定のため動作していない。詳細は [git-hooks.md](git-hooks.md) 参照。

| ファイル | 内容 |
|---------|------|
| pre-commit | main/master/develop への直接コミット防止 |
| pre-push | main/master/develop への直接プッシュ防止 |

---

## .github/

GitHub のリポジトリ設定、CI/CD、テンプレート。

### ルートファイル

| ファイル | 内容 |
|---------|------|
| CODEOWNERS | ファイルパスごとのレビュー担当チーム (docs-team, architects, platform-team, security-team) |
| copilot-instructions.md | GitHub Copilot 用の指示 |
| dependabot.yml | 依存関係の自動更新 (npm: 週次, Actions: 週次, Docker: 月次) |
| labels.yml | ラベル定義の SSOT (type:*, role:*, priority:* の 3 グループ) |

### instructions/

AI エージェント向けの行動指針。番号が小さいほど優先度が高い。

| ファイル | 内容 |
|---------|------|
| 00_global.instructions.md | 全共通ルール: DocDD 必須, Golden Commands, CI パス必須 |
| 10_product.instructions.md | PdM ロール: identity.md, prd.md, glossary.md, spec.md の作成 |
| 20_design.instructions.md | デザインロールの指針 |
| 30_architecture.instructions.md | アーキテクチャ判断の指針 |
| 40_qa.instructions.md | QA の指針 |
| 50_implementation.instructions.md | 実装の指針 |
| 51_domain.instructions.md | Domain レイヤーの実装ルール |
| 52_usecase.instructions.md | UseCase レイヤーの実装ルール |
| 53_presentation.instructions.md | Presentation レイヤーの実装ルール |
| 54_infrastructure.instructions.md | Infrastructure レイヤーの実装ルール |
| 55_composition.instructions.md | DI (依存性注入) パターン |
| 60_review.instructions.md | コードレビューの指針 |

### ISSUE_TEMPLATE/

| ファイル | 内容 |
|---------|------|
| config.yml | 空 Issue 禁止, Discussions へのリンク |
| bug_report.yml | バグ報告テンプレート |
| feature_request.yml | 機能要望テンプレート |
| epic.yml | Epic テンプレート |
| task.yml | タスクテンプレート |
| documentation.yml | ドキュメントテンプレート |

### PULL_REQUEST_TEMPLATE/

| ファイル | 内容 |
|---------|------|
| pull_request_template.md | デフォルト PR テンプレート |
| 01_spec.md | 仕様 PR: スコープ, FR, NFR, AC (Given/When/Then) |
| 02_plan.md | 設計 PR テンプレート |
| 03_implement.md | 実装 PR: AC 検証テーブル, 品質チェックリスト, UX チェック |
| 04_release.md | リリース PR テンプレート |

### workflows/

| ファイル | 内容 |
|---------|------|
| ci.yml | メイン CI: gitleaks シークレットスキャン, npm audit, lint, test, build |
| docker-build.yml | Docker イメージのビルド/プッシュ |
| policy.yml | PR ガバナンス: DocDD 検証, PR フィールド検証, CODEOWNERS 構文チェック, commitlint |

---

## .husky/

Husky v9 による Git フック管理。詳細は [git-hooks.md](git-hooks.md) 参照。

| ファイル | 内容 |
|---------|------|
| commit-msg | commitlint でコミットメッセージを検証 |
| pre-commit | シークレット検出, lint-staged, OpenAPI 同期チェック, lockfile 同期チェック |

---

## .specify/

機能仕様書の格納先。DocDD (Document-Driven Development) の中核。

```
.specify/
└── specs/
    └── {issue番号}/
        ├── spec.md    # 機能仕様 (FR, NFR, AC, スコープ)
        └── plan.md    # 技術計画 (非自明な変更時のみ)
```

実装前に仕様書が必須。Issue 番号ごとにディレクトリを分ける。

---

## .vscode/

VS Code の設定。

| ファイル | 内容 |
|---------|------|
| settings.json | `git checkout` コマンドの自動承認設定 |

---

## design/

デザインシステムのトークン定義。

```
design/
└── tokens/
    ├── README.md      # トークンの使い方 (CSS カスタムプロパティ, JS インポート)
    └── tokens.json    # トークン定義本体
```

`tokens.json` に含まれるトークン:

| カテゴリ | 内容 |
|---------|------|
| Color | primary (50-900), brand (orange/yellow/gold), neutral (50-900), semantic (light/dark) |
| Font | sans/mono ファミリー, サイズ (xs-6xl), ウェイト, 行間 |
| Spacing | 0-24 スケール (0-6rem) |
| Border | radius (none-full), width (0-2px) |
| Shadow | sm, md, lg, xl |
| Duration | fast (150ms), normal (300ms), slow (500ms) |

---

## docs/

システムドキュメント一式。ライフサイクルフェーズごとに整理されている。

### docs/00_process/ - プロセス・ガバナンス

| ファイル | 内容 |
|---------|------|
| process.md | 開発プロセス (DocDD): Product Identity → Release Plan の 8 段階 |
| adr_guidelines.md | ADR ガイドライン (作成基準, ライフサイクル) |
| agent_operating_model.md | AI エージェントの運用モデル |
| ai-development-governance.md | AI 駆動開発のガバナンスルール |
| ai-review-pipeline.md | AI コードレビューの手順と基準 |
| git_and_pr_governance.md | Git ワークフローと PR ルール |
| issue-operation-rules.md | Issue 管理・ラベリング基準 |
| project_management.md | プロジェクト管理手法 |
| runbook_initial_setup.md | 初回セットアップ手順 |
| skills_catalog.md | 利用可能な AI スキルのカタログ |
| tdd_workflow.md | TDD ワークフロー |

### docs/01_product/ - プロダクト要件・仕様

3 階層構成: Tier 1 (ビジネス要件) → Tier 2 (UI/UX 仕様) → Tier 3 (実装ガイド)

| サブフォルダ/ファイル | 内容 |
|---------------------|------|
| identity.md | ビジョン, ミッション, 原則 |
| prd.md | プロダクト要件定義書 |
| glossary.md | 用語集 |
| design/ | UI 要件 (ui_requirements.md), UX フロー (ux_flows.md), ワイヤーフレーム |
| design_system/ | デザインシステム概要, ダークモードガイド, トークンスキーマ |
| requirements/ | 機能要件 (admin.md), 非機能要件 (non-functional.md) |
| screens/ | 画面仕様 (L01-login, H01-home, P01-profile, ST01-settings, AD01-user-management, AD04-audit-logs) |
| screens/common/ | 共通仕様 (RBAC, レイアウト, 出力ポリシー) |
| implementation/ | 実装ガイド (ビジネスロジック, 受入条件, デモデータ) |

### docs/02_architecture/ - アーキテクチャ・技術設計

| サブフォルダ/ファイル | 内容 |
|---------------------|------|
| ARCHITECTURE.md | システムアーキテクチャ概要 (Clean Architecture + DDD) |
| repo_structure.md | リポジトリ構造の説明 |
| adr/ | ADR 18 件 (認証, テスト戦略, モノレポ, CDN, ORM 選定, マルチテナント等) + テンプレート |
| api/ | OpenAPI 仕様 7 件 (auth, admin, contents, profile, health, deep-ping, version) |
| data-modeling/ | ER 図, データモデリング概要 |

### docs/03_quality/ - QA・テスト

| ファイル | 内容 |
|---------|------|
| e2e_operation_guide.md | E2E テスト運用ガイド |
| i18n-guidelines.md | 国際化テストガイドライン |
| takumi_guard_operations.md | サプライチェーンセキュリティツール運用 |
| template_acceptance_criteria.md | 受入条件テンプレート |
| verification_runbook.md | QA 検証手順 |

### docs/04_delivery/ - リリース・デプロイ

| ファイル | 内容 |
|---------|------|
| release_process.md | リリースフロー, バージョニング |
| multi-repo-deployment.md | モノレポ/マルチレポのデプロイ戦略 |

### docs/05_development/ - 開発者向け

| ファイル | 内容 |
|---------|------|
| api_standards.md | API 設計標準 |
| database_setup.md | DB 初期化・スキーマ管理 |
| env-vars.md | 環境変数の一覧 |
| openapi_workflow.md | OpenAPI ワークフロー |

### docs/ ルート

| ファイル | 内容 |
|---------|------|
| devcontainer.md | DevContainer 利用ガイド |
| docker_compose_dev.md | Docker Compose 開発ガイド |
| guardrails.md | アーキテクチャガードレール |

---

## infra/

インフラ定義。Traefik リバースプロキシとサービステンプレート。

```
infra/
├── docker-compose.traefik.yml          # Traefik v3.6: ポート 80/8080, Docker ソケット経由の動的ルーティング
└── templates/
    ├── docker-compose.api-template.yml  # API サービスの Docker Compose テンプレート
    └── docker-compose.web-template.yml  # Web サービスの Docker Compose テンプレート
```

ワークツリーごとに独立した Docker Compose 環境を生成する際のテンプレートとして使用する。

---

## old/

旧 AI-driven PM テンプレート集のアーカイブ。CLAUDE.md に記載されているフェーズ構成がここに残っている。

```
old/
├── 00_docs/          # 方法論ガイド (ヒアリング, 要件定義フェーズのマイルストーン)
├── 01_要求分析/      # Phase 1: ヒアリング → プロジェクト計画書, 業務フロー, ペインポイント
├── 02_要件定義/      # Phase 2: 要件定義書, 機能一覧, ユースケース, 画面遷移, 見積, WBS
├── 03_開発工程/      # Phase 3: システム構成図, DB/API/画面/帳票/運用設計
├── 04_テスト/        # Phase 4: テスト計画, テストケース, 検収計画
├── 05_進捗報告/      # Phase 5: 週次報告, 遅延リスク判定, 次週計画
├── 99_プロジェクト全体/  # 横断管理: 質問管理, 変更管理, リスク管理, Notion 連携
├── 作業中/           # 作業メモ (開発フロー検討, タスク管理等)
├── .claude/          # 旧 Claude 設定 (bpr-doc-reviewer, weekly-report スキル)
└── .local_backups/   # バックアップ
```

各フェーズに「プロンプト/」(AI への指示) と「テンプレート/」(出力先) のペアがある。BPR (業務プロセス改善) プロジェクト向けのウォーターフォール型ワークフロー。

---

## projects/

本体ソースコード。TypeScript モノレポ (pnpm workspace)。

### 全体構造

```
projects/
├── package.json              # pnpm ワークスペース設定, lint-staged
├── tsconfig.json             # 共通 TypeScript 設定
├── eslint.config.js          # ESLint 設定
├── docker-compose.yaml       # ローカル開発用 Docker Compose
├── apps/                     # アプリケーション
│   ├── api/                  # バックエンド API
│   └── web/                  # フロントエンド Web
└── packages/                 # 共有ライブラリ
    ├── shared/               # ドメイン抽象 (Entity, Repository, Result, ValueObject)
    ├── api-contract/         # OpenAPI 定義 + 型生成
    ├── guardrails/           # アーキテクチャ検証ツール
    └── eslint-config/        # 共有 ESLint ルール (FSD, Clean Architecture)
```

### apps/api/ - バックエンド API

Express + Prisma。Clean Architecture 4 レイヤー構成。

```
api/src/
├── domain/           # ビジネスロジック (auth, user, content, audit 等)
├── usecase/          # ユースケース (admin, auth, content, user 等)
├── infrastructure/   # 外部接続 (DB, リポジトリ, 外部サービス)
├── presentation/     # HTTP 層 (Express ルート, ハンドラ, ミドルウェア)
├── application/      # 横断的関心事
└── composition/      # DI (依存性注入)
```

その他:
- `prisma/schema.prisma` - DB スキーマ定義
- `prisma/seeds/` - シードデータ
- `__tests__/` - テストスイート (fixtures, helpers, matchers)

### apps/web/ - フロントエンド

Next.js + Tailwind CSS。Feature-Sliced Design (FSD) 構成。

```
web/src/
├── app/              # Next.js App Router
│   ├── (auth)/       # 認証ルート (login)
│   └── (protected)/  # 保護ルート (dashboard, profile, settings, admin)
├── features/         # 機能スライス (auth, settings, health, audit, admin-users, dashboard, profile, theme-toggle)
├── entities/         # 共有ドメインエンティティ (user)
├── shared/           # 共有 (api, config, hooks, lib, providers, types, ui)
└── widgets/          # 複合 UI (header, sidebar)
```

その他:
- `e2e/` - Playwright E2E テスト
- `react-doctor.config.json` - React 最適化分析

### packages/shared/ - 共有ドメイン抽象

```
shared/src/
├── entity.ts         # Entity 基底クラス
├── repository.ts     # Repository パターン
├── result.ts         # Result<T, E> 型
├── value-object.ts   # ValueObject 基底
├── domain-event.ts   # ドメインイベント
└── index.ts
```

### packages/api-contract/ - OpenAPI + 型生成

```
api-contract/
├── openapi.yaml      # OpenAPI 3.0 スペック (SSOT)
├── orval.config.ts   # コード生成設定
└── src/generated/    # 自動生成コード (50+ ファイル, 直接編集禁止)
```

### packages/guardrails/ - アーキテクチャ検証

```
guardrails/src/guards/
├── fsd-public-api.ts           # FSD 公開 API 検証
├── fsd-layer-dependency.ts     # FSD レイヤー依存検証
├── usecase-dependency.ts       # UseCase 依存検証
├── domain-purity.ts            # Domain 純粋性検証
├── domain-event-causation.ts   # ドメインイベント検証
├── repository-result.ts        # Repository Result 検証
├── value-object-immutability.ts # ValueObject 不変性検証
├── openapi-route-coverage.ts   # OpenAPI ルートカバレッジ
└── fsd-openapi-coverage.ts     # FSD-OpenAPI カバレッジ
```

`./tools/contract guardrail` で実行。

### packages/eslint-config/ - 共有 ESLint ルール

FSD と Clean Architecture のレイヤー制約を ESLint ルールで強制する。

---

## prompts/

AI エージェントのロール定義と再利用可能なスキル。`.claude/` とは別の定義体系。

### agents/ - ロール定義 (8 件)

| ファイル | 役割 |
|---------|------|
| orchestrator.md | エージェントルーティング (アーカイブ: CLI に移行済み) |
| pdm.md | プロダクトデザインマネージャー |
| architect.md | システムアーキテクト |
| designer.md | UI/UX デザイナー |
| implementer.md | 開発者 |
| qa.md | QA/テスト担当 |
| reviewer.md | コードレビュアー |
| design_system.md | デザインシステム担当 |

### skills/ - 再利用可能なスキル (12 件)

| ファイル | 内容 |
|---------|------|
| kickoff.md | タスク初期化 |
| read_contract_first.md | contract 先読み |
| docdd_spec_first.md | DocDD: 仕様優先 |
| openapi_contract_first.md | API コントラクト優先 |
| ensure_worktree_context.md | ワークツリー確認 |
| devcontainer_safe_mode.md | DevContainer 安全モード |
| minimize_diff.md | 最小差分の原則 |
| fix_ci_fast.md | CI 障害の高速修正 |
| review_as_staff.md | スタッフレベルレビュー |
| horizontal_guardrails.md | 横断的ガードレール |
| policy_docs_drift.md | ドキュメント整合性チェック |
| prune_containers.sh | コンテナクリーンアップ |

---

## scripts/

環境構築とユーティリティスクリプト。

| ファイル | 内容 |
|---------|------|
| init-environment.sh | ワークツリー + Docker 環境の初期化 (サブネット, Traefik, DevContainer) |
| ensure-traefik.sh | Traefik ネットワークの存在確認・作成 |
| down.sh | 全サービス停止 |
| anonymize-csv.js | CSV データ匿名化 (JavaScript) |
| anonymize_csv.py | CSV データ匿名化 (Python) |
| tests/ | スクリプトのテストスイート |

---

## skill/

UX 心理学パック。60 以上の心理学概念をデザインプロセスに統合する。

```
skill/agent/design-system/ux-psychology/
├── README.md           # 概要とクイックスタート
├── docs/               # プロセス, ガバナンス, コンプライアンス
├── prompts/            # デザイン/レビュー/オンボーディング用プロンプト
├── templates/          # Impact Assessment, AC, PR チェックリスト
├── sources/
│   ├── meta/           # 概念の JSON メタデータ (60+ 件)
│   └── text/           # 概念の説明テキスト (60+ 件)
├── rules/catalog.json  # 全概念のマスターカタログ
├── ci/                 # カタログ整合性チェック (Python)
└── scripts/            # Web スクレイピング, カタログビルド
```

収録概念の例: 認知負荷, ソーシャルプルーフ, 損失回避, ハロー効果, アンカー効果, フレーミング, ナッジ, ゼイガルニク効果, デコイ効果, ダークパターン等。

---

## tools/

開発ツール群。4 つのサブシステムで構成される。

### tools/_contract/ - Golden Commands

全開発コマンドの SSOT。`./tools/contract <コマンド名>` で実行する。

| コマンド | 内容 |
|---------|------|
| up / up:status / up:logs / up:stop | 開発スタックの起動・管理 |
| dev / dev:logs / dev:stop | 開発モード |
| build | アプリケーションビルド |
| format | Prettier フォーマット |
| lint | ESLint リント |
| typecheck | TypeScript 型チェック |
| test | ユニットテスト |
| e2e | Playwright E2E テスト |
| openapi-check | OpenAPI スペック検証 |
| openapi-generate | OpenAPI からコード生成 (backend/frontend) |
| db:setup / db:reset | DB 初期化/リセット |
| migrate | DB マイグレーション |
| guardrail | アーキテクチャガードレール実行 |
| adr-validate | ADR 検証 |
| audit | セキュリティ監査 |
| outdated | 依存関係の古さチェック |
| deploy-dryrun | デプロイのドライラン |
| prune-containers | Docker コンテナのクリーンアップ |

### tools/worktree/ - Git ワークツリー管理

並列エージェント開発のためのワークツリー + Docker Compose 環境を管理する。

| スクリプト | 内容 |
|-----------|------|
| spawn.sh | 新規ワークツリー + Docker Compose 環境を作成 |
| auto-setup.sh | ワークツリー環境の自動設定 |
| start-session.sh | 開発セッション開始 |
| ensure-worktree.sh | ワークツリーの存在保証 |
| devcontainer-gen.sh | devcontainer.json の生成 |
| status.sh / health.sh / list.sh | ワークツリーの状態確認 |
| remove.sh / cleanup.sh | ワークツリーの削除・クリーンアップ |
| prune-containers.sh | Docker リソースのクリーンアップ |
| lib/ | ヘルパー (docker-compose, subnet, naming, container-health) |

### tools/orchestrate/ - エージェントオーケストレーション

ユーザーの意図を分析し、適切なエージェントとワークフローにルーティングする。

| スクリプト | 内容 |
|-----------|------|
| orchestrate.sh | メインエントリポイント (start, spawn, status, cleanup, route) |
| router.sh | スマートルーティングエンジン (意図分析, DocDD 検出, エージェント選定) |
| intent-analyzer.sh | 意図分析 (bug_fix, new_feature 等) |
| docdd-scanner.sh | DocDD 成果物のスキャン |
| monitor.sh | オーケストレーション進捗の監視 |
| workflow.sh | ワークフロー実行 |
| context.sh | コンテキスト管理 |
| routing-rules.yaml | ルーティング判断ルール |
| context-schema.yaml | コンテキストスキーマ定義 |

### tools/policy/ - ポリシー検証

PR やドキュメントの品質を検証する。

| スクリプト | 内容 |
|-----------|------|
| check_docdd_minimum.sh | DocDD 最低要件の検証 |
| check_contract_docs.sh | contract ドキュメントの検証 |
| check_required_artifacts.sh | 必須成果物のチェック |
| check_instruction_consistency.sh | instructions の整合性検証 |
| check_pr_contract.sh | PR contract の検証 |
| check_pr_fields.sh | PR フィールドの検証 |
| validate-adr.sh | ADR の検証 |

### tools/react-doctor/ - React 分析

React コンポーネントの品質スコアを算出するツール。

| ファイル | 内容 |
|---------|------|
| Dockerfile | 分析環境のコンテナ |
| run.sh | 分析実行スクリプト |

---

## ルートファイル

| ファイル | 内容 |
|---------|------|
| AGENTS.md | エージェント定義の正規ソース (全エージェント・プロセスの参照先) |
| CLAUDE.md | Claude Code への指示書 (リポジトリ概要, ファイルパス, ワークフロー, 規約) |
| Makefile | Make タスク定義 |
| commitlint.config.js | コミットメッセージルール (Conventional Commits, type 制限, 100 文字制限) |
| docker-compose.worktree.yml | ワークツリー用 Docker Compose 定義 |
| package.json | ルートパッケージ (Husky + commitlint の devDependencies) |
| pnpm-lock.yaml | 依存関係のロックファイル |
| .mcp.json | MCP (Model Context Protocol) サーバー設定 |
| .editorconfig | エディタ共通設定 |
| .env.example | 環境変数のサンプル |
| .gitignore | Git 追跡除外ルール |
| .dockerignore | Docker ビルド除外ルール |
