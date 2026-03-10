# Skill: DocDD Spec First

## Trigger
- 機能実装のリクエスト
- アーキテクチャ変更のリクエスト

## Purpose
Spec/Plan/Tasks を先に作成してから実装に移る。

## Guardrails

**重要**: Spec/Plan/Tasks がない限り Implementer に移行しない。

## Steps

### Step 1: Create or Update Spec

場所: `.specify/specs/<id>/spec.md`

```markdown
# Spec: [Feature Name]

## Overview
[機能の概要]

## Functional Requirements (FR)

### FR-001: [タイトル]
[詳細な要件説明]

## Non-Functional Requirements (NFR)

### NFR-001: Performance
[パフォーマンス要件]

### NFR-002: Security
[セキュリティ要件]

## Acceptance Criteria (AC)

### AC-001: [タイトル]

**Given** [前提条件]
**When** [実行するアクション]
**Then** [期待される結果]

## Out of Scope
[スコープ外の項目]

## Assumptions
[前提・仮定]
```

### Step 2: Create Plan (if needed)

場所: `.specify/specs/<id>/plan.md`

アーキテクチャ変更がある場合は ADR も作成:
- `docs/02_architecture/adr/<id>.md`

```markdown
# Plan: [Feature Name]

## Architecture Overview
[アーキテクチャの概要]

## Components
[影響を受けるコンポーネント]

## Data Flow
[データの流れ]

## Dependencies
[依存関係]

## Risks and Mitigations
[リスクと軽減策]

## Rollback Strategy
[ロールバック戦略]
```

### Step 3: Create Tasks

場所: `.specify/specs/<id>/tasks.md`

#### テストファースト原則

- ユニットテストなき実装は正解がわからない
- API 開発の場合は OpenAPI 仕様を先に定義する
- テスト/仕様 → 実装 の順序を厳守

```markdown
# Tasks: [Feature Name]

## Prerequisites
- [ ] Task 0: [前提タスク]

## Phase 1: Contract Definition (実装前に必須)

### API 仕様（API がある場合）
- [ ] Task 1: OpenAPI 仕様を定義 (`docs/02_architecture/api/`)
- [ ] Task 2: 型を生成 (`./tools/contract generate-api`)

### テスト設計
- [ ] Task 3: ユニットテストを作成（テストケース定義）
- [ ] Task 4: 統合テストを作成（E2E シナリオ定義）

## Phase 2: Implementation (テストを通すための実装)

### [機能領域 1]
- [ ] Task 5: [実装タスク] - 対応テスト: Task 3-X
- [ ] Task 6: [実装タスク] - 対応テスト: Task 3-Y

### [機能領域 2]
- [ ] Task 7: [実装タスク] - 対応テスト: Task 4-X

## Phase 3: Verification

- [ ] Task N: 全テスト通過を確認 (`./tools/contract test`)
- [ ] Task N+1: OpenAPI 仕様との整合性を確認

## Documentation Tasks
- [ ] Task M: Update API docs
- [ ] Task M+1: Update user guide
```

## Output
- `.specify/specs/<id>/spec.md`
- `.specify/specs/<id>/plan.md`
- `.specify/specs/<id>/tasks.md`
- `docs/02_architecture/adr/<id>.md` (if needed)
