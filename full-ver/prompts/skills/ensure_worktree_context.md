# Skill: Ensure Worktree Context

## Trigger
- エージェント作業開始時（Orchestrator 以外のすべてのエージェント）
- タスク実行前の最初のステップ

## Purpose
Worktree 環境で作業していることを確認し、コンテキストを読み込む。
メインリポジトリでの直接作業を防ぎ、並列作業の分離を保証する。

## Why This Matters
- **分離**: 各タスクを独立した worktree で行うことで、作業が衝突しない
- **コンテキスト継承**: 前工程のエージェントからの情報を正確に引き継ぐ
- **追跡可能性**: どのエージェントが何の作業をしているか明確になる
- **安全性**: メインブランチへの誤った変更を防ぐ

## Steps

### Step 1: Worktree Context の存在確認

```bash
# Worktree context ファイルが存在するか確認
if [[ -f ".worktree-context.yaml" ]]; then
    echo "OK: Worktree context found"
else
    echo "ERROR: Not in a worktree environment"
    echo "Action: Request Orchestrator to spawn this agent in a worktree"
    exit 1
fi
```

### Step 2: Context の読み込み

```bash
cat .worktree-context.yaml
```

確認すべき内容:
- `task_id`: 作業対象のタスク識別子
- `assigned_agent`: 自分に割り当てられたエージェント種別
- `branch`: 作業ブランチ名
- `parent_agent`: 前工程のエージェント
- `context.spec/plan/adr`: DocDD ドキュメントへの参照

### Step 3: 割り当て確認

自分のロールが `assigned_agent` と一致することを確認:

```bash
# 例: Implementer の場合
EXPECTED_AGENT="implementer"
ASSIGNED=$(grep "assigned_agent:" .worktree-context.yaml | awk '{print $2}' | tr -d '"')
if [[ "$ASSIGNED" != "$EXPECTED_AGENT" ]]; then
    echo "WARNING: Assigned agent mismatch. Expected: $EXPECTED_AGENT, Got: $ASSIGNED"
fi
```

### Step 4: DocDD コンテキストの取得

Context に記載されているドキュメントを読み込む:

```bash
# Spec があれば読む
SPEC=$(grep "spec:" .worktree-context.yaml | head -1 | awk '{print $2}' | tr -d '"')
if [[ -n "$SPEC" && -f "$SPEC" ]]; then
    cat "$SPEC"
fi
```

## Fallback: Worktree 外での作業が必要な場合

以下の場合のみ、worktree 外での作業を許可:

1. **Orchestrator Agent**: ルーティングと worktree 管理のためメインで動作
2. **緊急 Hotfix**: 明示的な承認がある場合のみ

それ以外の場合は、必ず Orchestrator 経由で worktree を作成してから作業を開始すること。

## Output

- Worktree context が存在することを確認
- 作業コンテキストを把握した状態で次のステップに進む

## Error Recovery

Worktree context が見つからない場合:

```
ERROR: Worktree context not found.

This agent must run in a worktree environment.
Please use the Orchestrator to start this task:

    ./tools/orchestrate/orchestrate.sh start "your task description"

Or manually spawn this agent:

    ./tools/worktree/spawn.sh <agent-type> <branch-name>
```

## Prompt Reference
`prompts/skills/ensure_worktree_context.md`
