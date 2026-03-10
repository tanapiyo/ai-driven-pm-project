# Repository Structure

このドキュメントはリポジトリの構造と各ディレクトリの役割を説明します。

---

## Technology Stack

このリポジトリは **Node.js + TypeScript + React** に特化しています。

- **Runtime**: Node.js
- **Language**: TypeScript
- **Package Manager**: pnpm (workspace)
- **Backend**: Hono
- **Frontend**: React

---

## Directory Overview

```
.
├── .devcontainer/            # DevContainer 設定
├── .github/                  # GitHub 設定
├── .specify/                 # Spec 定義
├── design/                   # デザインアセット
├── docs/                     # ドキュメント
├── projects/                 # アプリケーションコード
├── prompts/                  # エージェントプロンプト
└── tools/                    # ツール・スクリプト
```

---

## Detailed Structure

### `.devcontainer/`

DevContainer 設定。

| File | Description |
|------|-------------|
| `devcontainer.json` | DevContainer 設定 |
| `Dockerfile` | コンテナビルド設定 |

### `.github/`

GitHub 関連の設定。

```
.github/
├── workflows/
│   └── ci.yml              # CI 設定
├── PULL_REQUEST_TEMPLATE/  # PR テンプレート（複数）
│   ├── 01_spec.md
│   ├── 02_plan.md
│   ├── 03_implement.md
│   └── 04_release.md
├── ISSUE_TEMPLATE/         # Issue テンプレート
│   ├── feature_request.yml
│   ├── bug_report.yml
│   └── config.yml
└── pull_request_template.md # デフォルト PR テンプレート
```

### `.specify/`

機能の Spec（仕様）を格納。

```
.specify/
└── specs/
    └── <feature_id>/
        └── spec.md
```

### `design/`

デザインアセットを格納。

```
design/
└── tokens/
    ├── README.md
    └── tokens.json
```

### `docs/`

ドキュメントを格納。

```
docs/
├── 00_process/           # プロセス定義
│   └── process.md
├── 01_product/           # プロダクト要件
│   ├── identity.md
│   ├── prd.md
│   ├── glossary.md
│   ├── design/           # UX/UI 設計
│   └── design_system/    # デザインシステム
├── 02_architecture/      # アーキテクチャ
│   ├── adr/              # ADR
│   ├── repo_structure.md
│   └── impact_analysis_template.md
├── 03_quality/           # 品質・テスト
│   ├── template_acceptance_criteria.md
│   └── verification_runbook.md
└── 04_delivery/          # リリース
    └── release_process.md
```

### `projects/`

アプリケーションコードを格納（pnpm workspace）。

```
projects/
├── package.json          # Workspace ルート
├── pnpm-workspace.yaml   # Workspace 設定
├── tsconfig.json         # TypeScript 設定
├── apps/                 # アプリケーション
│   └── api/              # Backend API
│       ├── src/
│       │   ├── composition/    # DI 設定
│       │   ├── domain/         # ドメインモデル
│       │   ├── infrastructure/ # 外部依存
│       │   ├── presentation/   # HTTP ハンドラ
│       │   └── usecase/        # ユースケース
│       └── package.json
└── packages/             # 共有パッケージ
    ├── shared/           # 共通ドメイン・ユーティリティ
    └── guardrails/       # アーキテクチャガードレール
```

### `prompts/`

エージェント用プロンプトを格納。

```
prompts/
├── agents/
│   ├── orchestrator.md
│   ├── pdm.md
│   ├── designer.md
│   ├── design_system.md
│   ├── architect.md
│   ├── implementer.md
│   ├── qa.md
│   └── reviewer.md
└── skills/
    ├── read_contract_first.md
    ├── docdd_spec_first.md
    ├── minimize_diff.md
    └── ...
```

### `tools/`

ツール・スクリプトを格納。

```
tools/
├── contract/             # Golden Commands エントリポイント
│   ├── contract          # メインスクリプト
│   └── stack/            # 各コマンドの実装
│       ├── format
│       ├── lint
│       ├── typecheck
│       ├── test
│       ├── build
│       ├── guardrail
│       └── ...
├── orchestrate/          # Agent Orchestration
├── policy/               # ポリシーチェック
│   ├── check_required_artifacts.sh
│   └── check_docdd_minimum.sh
└── worktree/             # Worktree 管理
```

---

## Key Design Decisions

1. **Docs は `docs/` に集約**: 散らばらない
2. **アプリケーションコードは `projects/` に集約**: pnpm workspace で管理
3. **ツールは `tools/` に集約**: 実行可能スクリプトの場所が明確
4. **Clean Architecture**: domain → usecase → presentation の依存方向

---

## Links

- [AGENTS.md](../../AGENTS.md) - Canonical Instructions
- [docs/02_architecture/adr/0001_contract_architecture.md](adr/0001_contract_architecture.md) - ADR
