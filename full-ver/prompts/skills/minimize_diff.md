# Skill: Minimize Diff

## Trigger
- CI failing
- レビューフィードバック

## Purpose
原因を1つに絞り、最小差分に収束させる。

## Steps

### Step 1: Reproduce the Issue

問題を再現する:
```bash
# CI 失敗の場合
./tools/contract lint
./tools/contract test
./tools/contract build

# レビュー指摘の場合
# 指摘された箇所を確認
```

### Step 2: Identify Root Cause

原因を1つに絞る:
- エラーメッセージを読む
- 影響範囲を特定
- 最小修正を検討

### Step 3: Classify Changes

変更を分類:

| Category | Action |
|----------|--------|
| docs-only | Docs のみ変更 |
| code-only | Code のみ変更 |
| refactor | リファクタリング |
| feature | 機能追加 |
| fix | バグ修正 |

### Step 4: Split if Needed

必要に応じて変更を分割:
- 1 PR = 1 目的
- 不要な変更は別 PR に分離

### Step 5: Revert Unnecessary Changes

不要な変更を revert:
```bash
git checkout HEAD -- <file>
```

## Checklist

- [ ] 原因を1つに絞れたか
- [ ] 変更が最小限か
- [ ] 不要な変更を revert したか
- [ ] PR の目的が明確か

## Output
最小差分 PR に収束させる
