---
name: ux-psychology
description: UX心理学パックによる設計判断支援。UI変更時の概念選定、ダークパターン防止、Impact Assessment 作成、PRレビューチェック。Triggers on "UX", "心理学", "psychology", "dark pattern", "ダークパターン", "Impact Assessment", "cognitive load", "認知負荷".
globs:
  - "projects/apps/web/**/*.tsx"
  - "projects/apps/web/**/*.ts"
  - "**/features/**/ui/**"
  - "**/widgets/**"
  - "skill/agent/design-system/ux-psychology/**"
alwaysApply: false
---

# UX Psychology Pack

UX心理学の概念を設計・AC定義・レビュー・学習サイクルに統合するスキル。

## Pack Location

```
skill/agent/design-system/ux-psychology/
```

## Concept Catalog

`skill/agent/design-system/ux-psychology/rules/catalog.json` に43概念が登録されている。

```json
{
  "id": 1,
  "slug": "aesthetic-usability-effect",
  "title": "美的ユーザビリティ効果",
  "url": "https://www.shokasonjuku.com/ux-psychology/aesthetic-usability-effect",
  "local_path": "sources/text/aesthetic-usability-effect.txt",
  "content_hash": "sha256..."
}
```

概念の詳細は `skill/agent/design-system/ux-psychology/sources/text/{slug}.txt` を読む。

## When to Use

| Phase | Action | Template |
|-------|--------|----------|
| 設計 | 関連概念の選定、Impact Assessment 作成 | `templates/ux-psychology-impact-assessment.md` |
| AC定義 | UX固有の受入条件を追加 | `templates/ux-psychology-acceptance-criteria.md` |
| レビュー | PR チェックリストで検証 | `templates/ux-psychology-pr-checklist.md` |
| 学習 | リリース後の効果測定 | Impact Assessment に追記 |

## Design Phase Workflow

1. `rules/catalog.json` から機能に関連する概念を検索
2. `sources/text/{slug}.txt` で概念の詳細を確認
3. `templates/ux-psychology-impact-assessment.md` を使って Impact Assessment を作成
   - 適用する概念と理由
   - 適用しない概念と理由
   - ダークパターン防止チェック
   - 測定方法の定義
4. Impact Assessment を Issue にリンク

## Review Phase Workflow

1. Impact Assessment が PR にリンクされているか確認
2. `templates/ux-psychology-pr-checklist.md` に沿ってチェック:
   - 適用概念の妥当性
   - ダークパターン防止（P0 扱い）
   - アクセシビリティ
   - 測定基盤
3. 設計判断の根拠が明確か確認

## Dark Pattern Prevention (MUST)

以下は **P0 ブロッカー** として扱う:

| 禁止事項 | 例 |
|----------|-----|
| 意図的な誤解誘導 | フレーミング効果でユーザーに不利な選択を誘導 |
| 強制的な希少性演出 | 虚偽の「残りわずか」表示 |
| 隠れたコスト | サンクコスト効果を悪用した解約困難化 |
| 強制的ゲーミフィケーション | 依存を目的としたポイント設計 |
| 偽の社会的証明 | 架空のレビューや推薦 |

**3つの自問テスト:**
1. この施策はユーザーの目的達成を支援しているか？
2. ユーザーが十分な情報のもと自由に選択できるか？
3. 施策を取り除いてもユーザー体験が成立するか？

すべてに Yes と言えなければダークパターンの可能性がある。

## Code Comment Convention

UX概念を適用したコードには以下のコメントを付与:

```typescript
/**
 * @ux-concept social-proof
 * @ux-reason レビュー件数表示による信頼性向上
 */
```

## Reference

| Resource | Path |
|----------|------|
| Catalog | `skill/agent/design-system/ux-psychology/rules/catalog.json` |
| Source texts | `skill/agent/design-system/ux-psychology/sources/text/` |
| Impact Assessment template | `skill/agent/design-system/ux-psychology/templates/ux-psychology-impact-assessment.md` |
| AC template | `skill/agent/design-system/ux-psychology/templates/ux-psychology-acceptance-criteria.md` |
| PR checklist | `skill/agent/design-system/ux-psychology/templates/ux-psychology-pr-checklist.md` |
| Process | `skill/agent/design-system/ux-psychology/docs/process.md` |
| Governance | `skill/agent/design-system/ux-psychology/docs/governance.md` |
| Design prompt | `skill/agent/design-system/ux-psychology/prompts/design.md` |
| Review prompt | `skill/agent/design-system/ux-psychology/prompts/review.md` |
