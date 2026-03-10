## 概要
<!-- このPRで何を変更するか簡潔に -->

<!-- AC レビューポリシー: レビュアーは AC が正しく定義・証跡付きであるかを確認します。
     詳細は CONTRIBUTING.md#pr-での-ac-定義検証フロー を参照してください。 -->

## Issue (必須 / Required)
<!--
⚠️ 必ず "Closes #xxx" 形式で記載してください（GitHub の自動クローズが有効になります）
📌 1 Issue = 1 PR が原則です。複数 Issue を解決する場合は Epic を検討してください
❌ Issue なしの PR は原則禁止です（例外: hotfix, typo修正 等の trivial な変更）

GitHub auto-close keywords: Closes, Fixes, Resolves
Epic の子 Issue の場合: Part of #<epic-number> も追記
-->
Closes #

---

## AC Verification（受入基準の検証）

<!-- 必須: すべての PR で Issue の AC を列挙し、各 AC の証跡を示してください。
     レビュアーはこのテーブルを主な確認対象とします。 -->

| AC ID | AC 概要 | テスト証跡 | 状態 |
|-------|---------|-----------|------|
| AC-001 | | `path/to/test.test.ts` | :white_check_mark: / :warning: |
| AC-002 | | `path/to/test.test.ts` | :white_check_mark: / :warning: |

---

## Spec
- Spec: `.specify/specs/xxx/spec.md`

---

## Checklist

### Issue Link
- [ ] Issue が `Closes #xxx` 形式でリンクされている（または例外理由を概要に記載）

### AC Review
- [ ] AC Verification テーブルが記入されている（feat/fix PR では必須）
- [ ] 各 AC が証跡（テスト/スクリーンショット/CI ログ）で確認できる
- [ ] レビュアーは AC の正しさ（ビジネス要件の妥当性）を確認した

### Docs (Single Source of Truth)

- [ ] `.specify/specs/<feature>/spec.md` が作成/更新されている
- [ ] **新規機能・ビジネスルール変更の場合:**
  - [ ] `docs/01_product/requirements/` が更新されている（FR/NFR）
  - [ ] `docs/01_product/screens/` が更新されている（UI変更時）
- [ ] Spec に Product Requirement への参照がある（`docs/01_product/requirements/xxx.md#FR-XX`）
- [ ] アーキテクチャ決定がある場合、ADR が作成されている

### Quality
- [ ] `./tools/contract lint` が通る
- [ ] `./tools/contract test` が通る
- [ ] `./tools/contract build` が通る

### Review
- [ ] セルフレビュー済み
- [ ] 破壊的変更がある場合、Migration Plan がある

### UX Psychology (UI変更時)
- [ ] UX Impact Assessment が作成/更新されている（該当する場合）
- [ ] ダークパターンチェック済み（ユーザーの目的支援・自由な選択・心理的圧力なし）
- [ ] アクセシビリティ確認済み（WCAG AA コントラスト比、フォーカス順序）

---

## 変更内容

### Added
<!-- 追加した機能 -->

### Changed
<!-- 変更した内容 -->

### Fixed
<!-- 修正したバグ -->

---

## テスト方法
<!-- レビュアーが動作確認する手順 -->

```bash
# 例
./tools/contract test
```

---

## スクリーンショット / 動画

<!--
⚠️ UI変更がある場合は必須（Impact Points に「UI / フロントエンド」がある場合）
以下の状態ごとにスクリーンショットを貼ってください:
-->

| 状態 | スクリーンショット |
|------|-------------------|
| Normal（通常表示） | |
| Loading（読み込み中） | |
| Empty（データなし） | |
| Error（エラー時） | |

---

## 補足
<!-- その他、レビュアーに伝えたいこと -->
