# Agent Orchestration Tools

人間の要求を AI エージェントにルーティングし、独立した worktree + DevContainer 環境で並列作業を行うためのツール群。

## Quick Start

```bash
# タスクを開始（スマートルーティング - DocDD対応）
./tools/orchestrate/orchestrate.sh start "認証機能を追加して"

# 既存タスクの続きを実行
./tools/orchestrate/orchestrate.sh start --task-id "GH-123" "実装を進めて"

# 状態確認
./tools/orchestrate/orchestrate.sh status

# モニタリング
./tools/orchestrate/monitor.sh --watch
```

## Smart Routing（スマートルーティング）

デフォルトで有効。以下の2つの機能を組み合わせてルーティングを最適化：

### 1. ニュアンスベース Intent 分析

リクエストの意図を自動判定：
- `bug_fix` - バグ修正（Spec/Plan スキップ）
- `new_feature` - 新機能（フルパイプライン）
- `refactor` - リファクタリング
- `documentation` - ドキュメント変更
- `architecture_change` - アーキテクチャ変更（ADR必須）

### 2. DocDD アーティファクト認識

既存ドキュメントに基づいてステップをスキップ：
- Spec 存在 → PdM スキップ
- Plan/ADR 存在 → Architect スキップ
- Test Plan 存在 → QA 計画スキップ

```bash
# スマートルーティングを確認
./tools/orchestrate/router.sh --smart "認証機能を追加"

# インテント分析のみ表示
./tools/orchestrate/router.sh --intent "バグを直して"

# スマートルーティングを無効化
./tools/orchestrate/orchestrate.sh start --no-smart "タスク説明"
```

## Architecture

```
Human Request
     │
     ▼
┌─────────────────┐
│   Orchestrator  │  ← ルーティング判定
└────────┬────────┘
         │
    ┌────┴────┬────────┬────────┐
    ▼         ▼        ▼        ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│WT + DC│ │WT + DC│ │WT + DC│ │WT + DC│
│ PdM   │ │Archit │ │Impl   │ │ QA    │
└───────┘ └───────┘ └───────┘ └───────┘
   │         │        │          │
   └─────────┴────────┴──────────┘
                │
                ▼
           Pull Request
```

## Commands

### orchestrate.sh

メインエントリポイント。

```bash
# タスク開始（自動ルーティング）
./tools/orchestrate/orchestrate.sh start "新機能を追加"

# エージェント指定
./tools/orchestrate/orchestrate.sh start --agent implementer "バグを修正"

# ルーティング確認のみ
./tools/orchestrate/orchestrate.sh route "認証を追加"

# 状態確認
./tools/orchestrate/orchestrate.sh status

# 手動でエージェント起動
./tools/orchestrate/orchestrate.sh spawn architect feat/GH-123-design

# クリーンアップ
./tools/orchestrate/orchestrate.sh cleanup --merged
```

### router.sh

ルーティングエンジン。

```bash
# 基本ルーティング（キーワードベース）
./tools/orchestrate/router.sh "認証機能を追加して"

# スマートルーティング（DocDD対応）
./tools/orchestrate/router.sh --smart "機能を追加"

# 既存タスクを指定してスマートルーティング
./tools/orchestrate/router.sh --smart --task-id "GH-123" "続きを実装"

# インテント分析のみ
./tools/orchestrate/router.sh --intent "バグを直して"

# JSON出力
./tools/orchestrate/router.sh --smart --json "fix login bug"

# ルール一覧
./tools/orchestrate/router.sh --list-rules

# エージェント一覧
./tools/orchestrate/router.sh --list-agents
```

### docdd-scanner.sh

DocDD アーティファクトスキャナー。

```bash
# タスクのDocDD状態を確認
./tools/orchestrate/docdd-scanner.sh agent-orchestration

# JSON出力
./tools/orchestrate/docdd-scanner.sh --json GH-123

# 全Specをスキャン
./tools/orchestrate/docdd-scanner.sh --all

# リクエストから関連Specを検索
./tools/orchestrate/docdd-scanner.sh --find-related "認証機能"
```

### intent-analyzer.sh

インテント分析エンジン。

```bash
# インテント分析
./tools/orchestrate/intent-analyzer.sh "バグを修正して"

# 出力例
# {
#   "intent": "bug_fix",
#   "scope": "small",
#   "required_steps": ["implementer", "qa", "reviewer"],
#   "start_from": "implementer"
# }
```

### workflow.sh

ワークフロー管理。

```bash
# ワークフロー作成
./tools/orchestrate/workflow.sh create GH-123 sequential

# ステップ追加
./tools/orchestrate/workflow.sh add-step wf-xxx pdm "Create spec"
./tools/orchestrate/workflow.sh add-step wf-xxx architect "Create plan"

# ワークフロー開始
./tools/orchestrate/workflow.sh start wf-xxx

# 次ステップ実行
./tools/orchestrate/workflow.sh step wf-xxx

# ステップ完了
./tools/orchestrate/workflow.sh complete wf-xxx 1

# 状態確認
./tools/orchestrate/workflow.sh status wf-xxx
```

### monitor.sh

モニタリングダッシュボード。

```bash
# 一度だけ表示
./tools/orchestrate/monitor.sh

# 継続監視（5秒更新）
./tools/orchestrate/monitor.sh --watch

# JSON出力
./tools/orchestrate/monitor.sh --json
```

## Worktree Tools

### spawn.sh

worktree を作成し、DevContainer を起動。

```bash
./tools/worktree/spawn.sh <agent> <branch> [options]

# 例
./tools/worktree/spawn.sh implementer feat/GH-123-auth
./tools/worktree/spawn.sh architect feat/GH-456-design --no-devcontainer
```

### status.sh

worktree の状態を表示。

```bash
./tools/worktree/status.sh
./tools/worktree/status.sh --json
./tools/worktree/status.sh --brief
```

### cleanup.sh

worktree の削除とクリーンアップ。

```bash
# 特定の worktree を削除
./tools/worktree/cleanup.sh ../my-repo-feat-xxx

# マージ済みを削除
./tools/worktree/cleanup.sh --merged

# すべて削除
./tools/worktree/cleanup.sh --all

# orphaned 状態ファイルを削除
./tools/worktree/cleanup.sh --prune
```

### devcontainer-gen.sh

worktree 用の DevContainer 設定を生成。

```bash
./tools/worktree/devcontainer-gen.sh <worktree-path> <agent> <worktree-id> <port-base>
```

## Configuration

### routing-rules.yaml

ルーティングルールの定義。

```yaml
rules:
  - id: "new-feature"
    patterns:
      - "新機能"
      - "feature"
    agent: "pdm"
    workflow: "sequential"
    pipeline:
      - agent: "pdm"
      - agent: "architect"
      - agent: "implementer"
      - agent: "qa"
```

### context-schema.yaml

エージェント間で受け渡すコンテキストのスキーマ定義。

## Environment Isolation

各 worktree は独立した環境で動作:

| Resource | Isolation |
|----------|-----------|
| Git branch | 独立 |
| DevContainer | 独立（コンテナID分離） |
| Volumes | worktree ID で分離 |
| Ports | 100 ポート / worktree |
| Environment | `.worktree-context.yaml` |

### Port Allocation

| Worktree ID | Port Range |
|-------------|------------|
| 1 | 3100-3199 |
| 2 | 3200-3299 |
| 3 | 3300-3399 |
| ... | ... |

## Agents

| Agent | Purpose | Prompt |
|-------|---------|--------|
| orchestrator | ルーティング・調整 | `prompts/agents/orchestrator.md` |
| pdm | Spec・要件定義 | `prompts/agents/pdm.md` |
| architect | 設計・ADR | `prompts/agents/architect.md` |
| designer | UX/UI 設計 | `prompts/agents/designer.md` |
| implementer | 実装 | `prompts/agents/implementer.md` |
| qa | テスト | `prompts/agents/qa.md` |
| reviewer | レビュー | `prompts/agents/reviewer.md` |

## Workflow Types

### Sequential

エージェントが順番に作業し、前のエージェントの成果物を引き継ぐ。

```
PdM → Architect → Implementer → QA → Reviewer
```

### Parallel

独立したタスクを複数のエージェントが同時に作業。

```
Orchestrator
  ├─▶ Implementer (機能A)
  ├─▶ Implementer (機能B)
  └─▶ Implementer (機能C)
```

## State Files

状態ファイルの場所:

```
.worktree-state/
├── worktree-xxx.yaml       # Worktree 状態
└── workflows/
    └── wf-xxxxxx.yaml      # Workflow 状態
```

## Troubleshooting

### DevContainer が起動しない

```bash
# devcontainer CLI のインストール確認
which devcontainer || npm install -g @devcontainers/cli

# 手動起動
devcontainer up --workspace-folder <worktree-path>
```

### ポート競合

```bash
# 使用中ポート確認
lsof -i :3100

# 別の worktree ID を指定
./tools/worktree/spawn.sh implementer feat/xxx --worktree-id 10
```

### Orphaned State Files

```bash
./tools/worktree/cleanup.sh --prune
```

## Related

- [Spec](.specify/specs/agent-orchestration/spec.md)
- [Plan](.specify/specs/agent-orchestration/plan.md)
- [Agent Operating Model](docs/00_process/agent_operating_model.md)
- [Git Worktree Guide](tools/worktree/README.md)
