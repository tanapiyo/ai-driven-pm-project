# 開発プロセス定義

## 基本フロー

```
Issue作成 → Spec作成 → Plan作成 → 実装 → PR → レビュー → マージ
```

## SDD（Spec-Driven Development）

Spec/Plan なしで実装を開始しない。

### Spec（.specify/specs/<id>/spec.md）

- 目的・スコープ・受入基準（AC）を定義
- AC は Given/When/Then 形式を推奨

### Plan（.specify/specs/<id>/plan.md）

- 実装アプローチ・影響範囲・タスク分割を定義

## ブランチ・PR ルール

| 項目 | ルール |
|------|--------|
| ブランチ名 | `feat/<issue>-<slug>` / `fix/<issue>-<slug>` |
| PR タイトル | Conventional Commits 形式 |
| PR body | `Closes #<issue>` を必ず含める |
| CI | green でなければマージ不可 |

## Definition of Done

- [ ] ユニットテストが追加・更新されている
- [ ] lint エラーがない
- [ ] 型エラーがない
- [ ] ビルドが通る
- [ ] PR body に `Closes #<issue>` がある

## コミュニケーション

- 問題は事象・原因・対策の 3 点で記述する
- 「適宜」「必要に応じて」等の曖昧表現は使わない
