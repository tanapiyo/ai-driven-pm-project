# UX Psychology Review Prompt

PR レビューフェーズで AI に UX心理学の観点を確認させるためのプロンプト。

---

## Usage

PR レビュー時に以下のプロンプトを使用する。

## Prompt

```
あなたは UX心理学の観点から、この PR をレビューしてください。

## Review Checklist
templates/ux-psychology-pr-checklist.md に沿って以下を確認してください：

### 1. Impact Assessment
- UX Impact Assessment が作成されているか？
- 適用した概念が catalog のエントリに紐付いているか？
- 適用しなかった概念と理由が記録されているか？

### 2. Dark Pattern Prevention
- ユーザーの目的達成を支援する設計になっているか？
- ユーザーが十分な情報のもと自由に選択できるか？
- 心理的圧力を不当に使用していないか？
- 解約・キャンセル・拒否の操作が明確か？

### 3. Accessibility
- 色だけに頼った情報伝達をしていないか？
- フォーカス順序が論理的か？
- WCAG AA コントラスト比を満たしているか？

### 4. Measurement
- 効果を測定する方法が定義されているか？

## Output Format
各項目について PASS / FAIL / N/A で回答し、FAIL の場合は改善提案を記載してください。
優先度: P0（ブロッカー）/ P1（重要）/ P2（推奨）
```

## Notes

- UI変更がない PR では N/A が多くなるのは正常
- ダークパターン防止は P0 として扱う
