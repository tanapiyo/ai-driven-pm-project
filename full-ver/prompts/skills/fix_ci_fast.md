# Skill: Fix CI Fast

## Trigger
- `./tools/contract <cmd>` failing

## Purpose
CI を素早く修復し、3ループで止める。

## Rules

**重要**: 3ループで直らなければ原因を記録して止める。

## Steps

### Step 1: Get Failure Log

失敗ログを取得（要点のみ）:
```bash
./tools/contract lint 2>&1 | tail -50
./tools/contract test 2>&1 | tail -50
./tools/contract build 2>&1 | tail -50
```

### Step 2: Classify Failure

失敗の種類を分類:

| Category | Examples |
|----------|----------|
| 依存関係 | missing package, version conflict |
| 設定 | config error, path issue |
| 環境 | env var, permission |
| コード | syntax, type, logic |

### Step 3: Fix in Order

順番に修正:

```bash
# 1. Format
./tools/contract format

# 2. Lint
./tools/contract lint

# 3. Typecheck
./tools/contract typecheck

# 4. Test
./tools/contract test

# 5. Build
./tools/contract build
```

### Step 4: Loop Counter

ループカウンタを管理:

| Loop | Action |
|------|--------|
| 1 | 最初の修正試行 |
| 2 | 別のアプローチを試す |
| 3 | 原因を記録して止める |

### Step 5: Record Root Cause (if 3 loops reached)

3ループで直らない場合は記録:

```markdown
# CI Failure Record: [Date]

## Error Summary
[エラーの要約]

## Attempted Fixes
1. [試した修正1]
2. [試した修正2]
3. [試した修正3]

## Root Cause Analysis
[推定される根本原因]

## Next Steps
[次に試すべきこと]
```

場所: `docs/03_quality/ci-failures/<date>-<issue>.md`

## Output
- 修正コミット
- 再発防止メモ（3ループの場合）
