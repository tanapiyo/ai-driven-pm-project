---
name: Implement PR
about: 実装を行うPR
title: "[Impl] "
labels: implementation
---

## Implement

### 実装内容
<!-- 何を実装したか -->

### Issue (必須 / Required)
<!-- 必ず "Closes #xxx" 形式で記載（GitHub の自動クローズが有効になります） -->
Closes #

### 関連 Spec / Plan
- Spec: `.specify/specs/xxx/spec.md`
- Plan PR: #

---

## Changes

### Files Changed
<!-- 主な変更ファイル -->

- `path/to/file.ts` - 説明

### Tests Added
<!-- 追加したテスト -->

- `path/to/file.test.ts` - 何をテストしているか

### Docs Updated
<!-- 更新したドキュメント -->

- `docs/xxx.md` - 何を更新したか

---

## Verification

```bash
# 実行結果を貼り付け
./tools/contract lint
./tools/contract test
./tools/contract build
```

### Contract Results
- [ ] `./tools/contract lint` ✅
- [ ] `./tools/contract test` ✅
- [ ] `./tools/contract build` ✅

---

## AC Verification

<!-- Issue/Spec の AC を満たしているか：テスト証跡を必ず記載 -->

| AC ID | Given/When/Then 概要 | テスト証跡（ファイル:行） | 状態 |
|-------|---------------------|-------------------------|------|
| AC-001 | | `path/to/test.test.ts:L42` | :white_check_mark: / :warning: |
| AC-002 | | `path/to/test.test.ts:L68` | :white_check_mark: / :warning: |

### UI Screenshots（UI変更時必須）

| 状態 | Before | After |
|------|--------|-------|
| Normal | | |
| Loading | | |
| Empty | | |
| Error | | |

---

## Screenshots / Demo
<!-- UI変更がない場合、上の UI Screenshots テーブルは削除可 -->

---

## Checklist

- [ ] Spec に沿った実装になっている
- [ ] ドキュメントが更新されている
- [ ] Contract commands がすべて通る

### Testing Checklist (TDD)

- [ ] ユニットテストが新規コードに追加されている
- [ ] テストが AAA (Arrange-Act-Assert) パターンに従っている
- [ ] カバレッジが維持/向上している（80%以上）
- [ ] Spec にテストプランがリンクされている
- [ ] レイヤー別テスト戦略に従っている
  - Domain: 純粋関数、Mock不要
  - UseCase: Repository/Service を Mock
  - Presentation: HTTP インタフェースを Mock
