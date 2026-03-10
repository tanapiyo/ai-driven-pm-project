# UX Psychology Integration Process

UX心理学の概念をプロダクト開発プロセスに統合する手順。

---

## Overview

```
設計 → AC定義 → 実装 → レビュー → 学習
```

各フェーズで UX心理学の観点を組み込み、設計判断の透明性と再現性を確保する。

---

## Phase 1: 設計（Design）

### Input
- Feature Request / Issue
- `rules/catalog.json`（概念カタログ）

### Steps

1. Issue の要件を確認
2. `rules/catalog.json` から関連する概念を検索
3. `templates/ux-psychology-impact-assessment.md` を作成
   - 適用する概念を選定し、適用箇所と期待効果を記載
   - 適用しない概念と理由を記録
   - ダークパターン防止チェックを実施
4. Impact Assessment を Issue にリンク

### Output
- UX Impact Assessment ドキュメント

### AI Prompt
- `prompts/design.md` を使用

---

## Phase 2: AC 定義（Acceptance Criteria）

### Input
- UX Impact Assessment
- `templates/ux-psychology-acceptance-criteria.md`

### Steps

1. 通常の AC（Given/When/Then）を定義
2. `templates/ux-psychology-acceptance-criteria.md` のパターンから UX 固有の AC を追加
   - AC-UX-001: 概念の適用が意図通りに機能する
   - AC-UX-002: ダークパターンが含まれていない
   - AC-UX-003: アクセシビリティが確保されている
   - AC-UX-004: 効果測定の基盤が整っている
3. 測定方法と目標値を定義

### Output
- UX 観点を含む AC リスト

---

## Phase 3: 実装（Implementation）

### Steps

1. Impact Assessment と AC に基づいて実装
2. 概念の適用箇所にコメントで概念名を記載（追跡可能にする）
3. ダークパターン防止チェック項目を実装時にも確認

### Code Comment Convention

```typescript
/**
 * @ux-concept social-proof
 * @ux-reason レビュー件数表示による信頼性向上
 */
```

---

## Phase 4: レビュー（Review）

### Input
- PR
- `templates/ux-psychology-pr-checklist.md`

### Steps

1. Impact Assessment が PR にリンクされているか確認
2. `templates/ux-psychology-pr-checklist.md` に沿ってチェック
   - 適用概念の妥当性
   - ダークパターン防止
   - アクセシビリティ
   - 測定基盤
3. 設計判断の根拠が明確か確認

### Output
- レビューコメント（UX 観点を含む）

### AI Prompt
- `prompts/review.md` を使用

---

## Phase 5: 学習（Learning）

### Trigger
- リリース後の測定期間経過時
- 四半期レビュー時

### Steps

1. 測定結果を収集
2. 適用した概念の効果を評価
   - 目標値を達成したか？
   - 予期しない効果はあったか？
3. 学習を記録し、次の設計に活用
4. テンプレートの改善が必要なら提案

### Output
- 効果測定レポート（簡易版でも可）
- テンプレート改善提案（必要に応じて）

---

## Quick Reference

| Phase | Template / Tool | Required? |
|-------|----------------|-----------|
| 設計 | `templates/ux-psychology-impact-assessment.md` | UI変更時は推奨 |
| AC | `templates/ux-psychology-acceptance-criteria.md` | UI変更時は推奨 |
| レビュー | `templates/ux-psychology-pr-checklist.md` | UI変更時は推奨 |
| 学習 | 効果測定レポート | 四半期レビュー |
