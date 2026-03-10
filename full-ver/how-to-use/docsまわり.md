## docs/ 配下ファイル一覧（コピー用）

### ルート直下

| パス | 概要 |
|------|------|
| guardrails.md | FSD と Clean Architecture を機械検証するガードレール。ESLint によるレイヤー依存制約を定義 |
| docker_compose_dev.md | Docker Compose による開発環境・デバッグの使い方。`./tools/contract dev` の手順 |
| devcontainer.md | DevContainer のセットアップ。Node.js モノレポ向け構成と Secure-by-default ポリシー |

---

### 00_process/ — プロセス・開発運用

| パス | 概要 |
|------|------|
| process.md | DocDD（Document-Driven Development）の流れ。Spec → Plan → Contract → Tasks → Implement |
| adr_guidelines.md | ADR の作成・レビュー・承認ルール。作成トリガーと SSOT（TEMPLATE.md） |
| skills_catalog.md | AI エージェント向けスキル一覧。Read_Contract_First、DocDD_Spec_First など |
| agent_operating_model.md | エージェントの動作モデル |
| ai-review-pipeline.md | ローカルエージェント内での AI レビュー（CI ではなくローカルで実行） |
| ai-development-governance.md | AI 開発のガバナンス |
| git_and_pr_governance.md | Git・PR のルール |
| project_management.md | プロジェクト管理 |
| issue-operation-rules.md | Issue 運用ルール |
| tdd_workflow.md | TDD のワークフロー |
| runbook_initial_setup.md | 初回セットアップの Runbook |

---

### 01_product/ — プロダクト仕様

| パス | 概要 |
|------|------|
| identity.md | プロダクトアイデンティティ（Brand、ターゲットユーザー） |
| prd.md | PRD（Product Requirements Document）のテンプレート |
| glossary.md | 用語集 |
| README.md | 3 層のドキュメント階層（Tier1: Requirements → Tier2: Specs → Tier3: Implementation） |
| DOCUMENT_MAINTENANCE.md | ドキュメントのメンテナンスルール |

**01_product/requirements/**

| パス | 概要 |
|------|------|
| README.md | FR/NFR マスターリスト |
| admin.md | 管理者機能・権限・監査ログ |
| non-functional.md | パフォーマンス・セキュリティなどの NFR |

**01_product/design/**

| パス | 概要 |
|------|------|
| ui_requirements.md | UI 要件 |
| wireframes_text.md | ワイヤーフレームのテキスト仕様 |
| ux_flows.md | UX フロー |

**01_product/design_system/**

| パス | 概要 |
|------|------|
| overview.md | デザインシステム概要。Consistency / Scalability / Accessibility |
| dark-mode-guidelines.md | ダークモードガイドライン |
| tokens.schema.md | デザイントークンのスキーマ |

**01_product/screens/**

| パス | 概要 |
|------|------|
| README.md | 画面仕様のインデックス・共通仕様・遷移図 |
| L01-login.md | ログイン画面 |
| P01-profile.md | プロフィール画面 |
| H01-home.md | ホーム画面 |
| ST01-settings.md | 設定画面 |

**01_product/screens/common/**

| パス | 概要 |
|------|------|
| PREREQUISITES.md | 全画面の共通前提・固定ルール |
| RBAC.md | ロールベースアクセス制御 |
| SCREEN_LAYOUT.md | 共通レイアウト仕様 |

**01_product/screens/admin/**

| パス | 概要 |
|------|------|
| AD01-user-management.md | ユーザー管理画面 |
| AD04-audit-logs.md | 監査ログ画面 |

**01_product/implementation/**

| パス | 概要 |
|------|------|
| README.md | 実装ガイドのトップ |
| acceptance.md | 受け入れ基準の実装ガイド |
| logic.md | ビジネスロジックの実装方針 |
| demo-data.md | デモ・検証用データ |

---

### 02_architecture/ — アーキテクチャ

| パス | 概要 |
|------|------|
| ARCHITECTURE.md | システム構成（Frontend / Backend / PostgreSQL）。Clean Architecture 層 |
| repo_structure.md | リポジトリ構成 |
| impact_analysis_template.md | インパクト分析テンプレート |
| cloudfront-cost-estimation.md | CloudFront のコスト見積もり |

**02_architecture/adr/** — Architecture Decision Records

| パス | 概要 |
|------|------|
| TEMPLATE.md | ADR フォーマット・必須セクション・ステータス |
| 0001_contract_architecture.md | Contract アーキテクチャ（tools/contract 採用） |
| 0002_docker_compose_for_apps.md | Docker Compose によるアプリ一括起動・デバッグ |
| 0003_clean_architecture_guardrails.md | Clean Architecture + FSD と横のガードレール |
| 0004_jwt_authentication.md | JWT 認証（トークン構成・署名アルゴリズム） |
| 0005_claude_code_subagents.md | Claude Code サブエージェント統合 |
| 0006_testing_strategy.md | テスト戦略（TDD + DocDD、レイヤー別） |
| 0008_parallel_implementer.md | 並列 Implementer のファイルスコープ制約 |
| 0010_epic_autopilot.md | Epic Autopilot（Epic 実装オーケストレーション） |
| 0011-typed-handler-migration.md | as never 排除と RouteHandler 型付き登録 |
| 0013-hono-to-express-migration.md | Hono から Express への移行 |
| 0014_monorepo_structure.md | モノレポ構成（pnpm workspace、projects/ 構成） |
| 0014-ai-review-pipeline.md | AI レビューパイプラインのローカル統合 |
| 0015_cdn_cloudfront_strategy.md | CloudFront 構成・署名 URL・キャッシュ戦略 |
| 0016_supply_chain_security_takumi_guard.md | サプライチェーンセキュリティ（Takumi Guard npm） |
| 0017_aurora_engine_selection.md | Aurora エンジン選定（PostgreSQL 互換 vs MySQL 互換） |
| 0018_db_access_orm_selection.md | ORM / クエリビルダー選定 |
| 0018-tenant-oem-strategy.md | テナント切替 / OEM 方式（共通 Repo サイロモデル） |

**02_architecture/api/** — OpenAPI 仕様

| パス | 概要 |
|------|------|
| contents.yaml | Contents API |
| auth.yaml | 認証 API |
| admin.yaml | 管理 API |
| profile.yaml | プロフィール API |
| health.yaml | ヘルスチェック API |
| version.yaml | バージョン API |
| deep-ping.yaml | Deep ping API |

**02_architecture/data-modeling/**

| パス | 概要 |
|------|------|
| README.md | データモデリングのインデックス |
| er-diagram.md | Prisma スキーマに基づく ER 図 |

---

### 03_quality/ — 品質・テスト

| パス | 概要 |
|------|------|
| template_acceptance_criteria.md | テンプレートリポジトリの受入基準（DevContainer、CI、Contract 等） |
| e2e_operation_guide.md | Playwright による E2E の環境・実行・エージェント利用 |
| verification_runbook.md | 検証 Runbook |
| takumi_guard_operations.md | Takumi Guard の運用手順 |
| i18n-guidelines.md | 国際化ガイドライン |

---

### 04_delivery/ — デリバリー

| パス | 概要 |
|------|------|
| release_process.md | リリースチェックリスト（Pre / Release / Post）とロールバック方針 |
| multi-repo-deployment.md | マルチ Repo デプロイ。Traefik による same-origin ルーティング |

---

### 05_development/ — 開発ガイド

| パス | 概要 |
|------|------|
| api_standards.md | OpenAPI の命名規則・構造・ベストプラクティス |
| openapi_workflow.md | OpenAPI 駆動の開発フロー（orval、express-openapi-validator 等） |
| database_setup.md | データベースセットアップ |
| env-vars.md | 環境変数の説明 |

---

合計 84 ファイル。00_process ～ 05_development の階層で管理。