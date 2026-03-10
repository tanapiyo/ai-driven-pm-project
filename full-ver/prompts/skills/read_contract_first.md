# Skill: Read Contract First

## Trigger
- 新タスク開始時
- リポジトリが未知の場合

## Purpose
AGENTS.md と process.md を読み、制約を把握する。

## Steps

### Step 1: Read AGENTS.md
```bash
cat AGENTS.md
```

確認すべき内容:
- Non-negotiables（絶対ルール）
- Golden Commands
- Golden Outputs（必須成果物）
- Git / Branch / Commit Rules
- PR Rules

### Step 2: Read Process Definition
```bash
cat docs/00_process/process.md
```

確認すべき内容:
- DocDD のステージ
- 各ステージの成果物
- Required Artifacts per Change Type

### Step 3: Understand Technology Stack

このリポジトリは Node.js + TypeScript + React に特化:
- Runtime: Node.js
- Language: TypeScript
- Package Manager: pnpm (workspace)
- Application Code: `projects/`

### Step 4: Understand Constraints

不明点があれば:
- 質問するか
- Assumptions を docs に明記

## Output

理解した制約を短くまとめる:

```markdown
## 理解した制約

### DocDD
- Spec/Plan/AC なしで実装しない

### Golden Commands
- `./tools/contract format|lint|typecheck|test|build|guardrail`

### Technology Stack
- Node.js + TypeScript + React (pnpm workspace)

### これからの作業順序
1. [ステップ1]
2. [ステップ2]
3. ...
```
