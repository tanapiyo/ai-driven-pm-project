# UX Psychology Design Prompt

設計フェーズで AI に UX心理学の観点を組み込ませるためのプロンプト。

---

## Usage

以下のプロンプトを設計レビュー時に使用する。

## Prompt

```
あなたは UX心理学の専門家として、以下の機能設計をレビューしてください。

## Context
- Feature: [機能名]
- Screen: [画面ID]
- Target User: [ターゲットユーザー]
- User Goal: [ユーザーの目的]

## Available Concepts
rules/catalog.json に定義された UX心理学の概念を参照してください。

## Tasks
1. この機能に適用すべき UX心理学の概念を 1-3 つ提案してください
   - 各概念について: なぜ適用すべきか、どこに適用するか、期待効果は何か
2. ダークパターンのリスクがないか確認してください
   - ユーザーの自由な選択を妨げていないか
   - 心理的圧力を不当に使用していないか
3. 適用しない方がよい概念があれば、その理由も説明してください

## Output Format
templates/ux-psychology-impact-assessment.md の形式で回答してください。
```

## Notes

- catalog.json が存在しない場合は、概念名を直接指定しても可
- 設計の早期段階（ワイヤーフレーム以前）でも使用可能
