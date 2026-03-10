# ドキュメント保守ガイド

プロダクト仕様ドキュメント（docs/01_product/）の更新・保守を効率的に進めるためのルール。

---

## 📋 更新順序（重要）

新機能実装時は、**必ずこの順序**で更新してください：

### 1️⃣ **Tier 1 (Product Requirements)** を最初に更新

- [ ] `requirements/` 配下の該当ファイルを編集
- [ ] 新規 FR 番号が必要なら明記
- [ ] `requirements/README.md` のマスターリストを更新
- [ ] 関連画面番号をコメントで記述

**例**:
```markdown
FR-23: 新規機能 → 関連画面: S07, A04
```

### 2️⃣ **Tier 2 (Feature Specifications)** を次に更新

- [ ] 画面仕様ファイルを `screens/` に作成または編集
- [ ] `screens/README.md` の一覧に追加
- [ ] 必要に応じて `screens/common/` の共通仕様を更新（レイアウト変更時）
- [ ] 関連 FR 番号をリンク

**例**:
```markdown
## 関連要件

- FR-14: 権限管理（RBAC）
- FR-15: 監査ログ
```

### 3️⃣ **Tier 3 (Implementation Guidance)** を最後に更新

- [ ] `implementation/logic.md` に新規ビジネスロジック を追加（あれば）
- [ ] `implementation/acceptance.md` に GWT テストケースを追加
- [ ] `implementation/demo-data.md` にデモデータを追加（あれば）

---

## 🔍 PR チェックリスト

新機能の PR 作成時、**マージ前に必ず確認**してください：

```markdown
## Documentation

- [ ] `requirements/` が更新されたか（新機能の場合）
  - [ ] `requirements/README.md` に新 FR が追加されたか
  - [ ] 関連画面番号が記述されているか

- [ ] `screens/` が更新されたか（新画面の場合）
  - [ ] 新規画面ファイルが作成されたか
  - [ ] `screens/README.md` に追加されたか
  - [ ] 共通仕様（SCREEN_LAYOUT.md等）に影響がないか確認

- [ ] `implementation/` が更新されたか
  - [ ] 新規ビジネスロジック があれば `logic.md` に追加
  - [ ] `acceptance.md` にテストケースが追加されたか

- [ ] リンク確認
  - [ ] 新しいマークダウンリンクは相対パスか
  - [ ] すべてのリンク先ファイルが実在するか
  - [ ] リンク先の行番号は正確か（`#L数字` の場合）

- [ ] 用語確認
  - [ ] 新しい用語を使用している場合、`glossary.md` に追加したか
  - [ ] 既存用語と矛盾していないか

- [ ] 更新日付
  - [ ] ファイル内の「最終更新日」を本日に更新したか
  - [ ] バージョン番号を適切に変更したか
```

---

## 🏷️ バージョン管理

### 形式: MAJOR.MINOR.PATCH

```
v1.0.0 = 最初のリリース
v1.0.1 = ドキュメント修正（機能変更なし）
v1.1.0 = 機能追加（Tier 1 更新）
v2.0.0 = 大規模リアーキ
```

### 更新タイミング

| 変更内容 | MAJOR | MINOR | PATCH |
| --- | --- | --- | --- |
| 機能追加（新FR） | - | ✓ | - |
| 機能削除（FR削除） | ✓ | - | - |
| 画面追加 | - | ✓ | - |
| 画面修正（UI変更） | - | - | ✓ |
| ドキュメント修正 | - | - | ✓ |
| 用語定義追加 | - | - | ✓ |
| 実装ガイド更新 | - | - | ✓ |

**例**:
```markdown
| 最終更新 | 2026-01-27 |
| バージョン | v1.0.1 |
```

---

## 📝 ファイル更新ルール

### requirements/ を更新するとき

1. 該当ファイル（例: `admin.md`）を編集
2. `requirements/README.md` のマスターリストに反映
3. 関連する画面番号（AD01 等）をコメントで追加

**チェック項目**:
- [ ] FR 番号に重複がないか
- [ ] 優先度（P0/P1/P2）が正確か
- [ ] 関連する画面が存在するか

### screens/ を更新するとき

1. 画面ファイルを作成・編集
2. `screens/README.md` の一覧に追加
3. 必要に応じて `common/` 仕様を更新

**チェック項目**:
- [ ] 画面ID（S01, A01 等）に重複がないか
- [ ] `common/SCREEN_LAYOUT.md` に新規パターンが必要ないか
- [ ] すべての Given/When/Then テストケースが入っているか

### implementation/ を更新するとき

1. 対応する `requirements/` と `screens/` が完成している
2. ビジネスロジック、テストケース、デモデータを追加
3. 各ファイルの参照リンクを確認

**チェック項目**:
- [ ] `logic.md` に実装パターンが書かれているか
- [ ] `acceptance.md` に GWT テストケースがあるか
- [ ] デモデータが `demo-data.md` に追加されているか

### glossary.md を更新するとき

新しい用語を追加する場合：

1. 業務用語か技術用語か分類
2. 定義を簡潔に記述
3. 関連テーブル / 機能 を明記
4. 既存用語と矛盾がないか確認

**テンプレート**:
```markdown
| 新規用語 | 定義（1文） | 関連テーブル / 機能 |
| --- | --- | --- |
| XXX | 説明 | 技術的な対応 |
```

---

## 🔗 相互参照の維持

### 必須リンク

- `prd.md` → `requirements/README.md`, `screens/README.md`
- `requirements/README.md` → 各画面ファイル（S01 等）
- `screens/README.md` → 各要件ファイル（FR-01 等）
- `screens/` 各ファイル → 関連 `requirements/`
- `implementation/` → `requirements/`, `screens/`

### リンク書き方

**相対パス（推奨）**:
```markdown
[requirements](../requirements/README.md)
[AD01 ユーザー管理](./admin/AD01-user-management.md)
[FR-14](../requirements/admin.md#FR-14)
```

**行番号参照**:
```markdown
[logic.md:20](../implementation/logic.md#L20)
```

### リンク確認コマンド

```bash
# すべてのリンク先が存在するか確認
for link in $(grep -r '\[.*\](' docs/01_product/ | grep -o '^\([^]]*\)'); do
  [ -f "$link" ] || echo "Missing: $link"
done
```

---

## 🎯 よくある更新パターン

### パターン 1: 新機能追加（新画面）

```
1. requirements/ に新 FR を追加
2. screens/ に新画面ファイルを作成
3. screens/README.md に一覧追加
4. implementation/ に テストケース追加
5. 相互参照を確認
```

**例**: 新画面「AD05: 新機能管理」

```
Step 1: requirements/admin.md に "FR-XX: 新機能管理" を追加
Step 2: screens/admin/AD05-new-feature.md を作成
Step 3: screens/README.md の Admin セクションに AD05 を追加
Step 4: implementation/acceptance.md に Admin テストを追加
Step 5: requirements/README.md で AD05 を関連画面として追加
```

### パターン 2: 既存機能修正

```
1. 該当する requirements/ ファイルを編集
2. 対応する screens/ ファイルを編集
3. implementation/ にテストケースを追加
4. 全リンク確認
```

### パターン 3: 共通仕様変更

```
1. screens/common/ ファイルを編集（例: SCREEN_LAYOUT.md）
2. 影響を受ける全画面ファイルに注記を追加
3. screens/README.md で変更を説明
4. implementation/acceptance.md で共通テスト追加
```

---

## 📊 ドキュメント構成チェック

月 1 回程度、以下を確認してください：

```markdown
### 月次ドキュメント監査

- [ ] **requirements/ との矛盾**
  - FR 番号が画面に対応しているか
  - 優先度が一貫しているか

- [ ] **screens/ との矛盾**
  - すべての画面が requirements に対応しているか
  - 画面遷移が正確か

- [ ] **リンク切れ**
  - README ファイルのリンク先が全て有効か
  - 相互参照が完全か

- [ ] **用語の一貫性**
  - glossary.md と本文の用語が統一されているか
  - 新しい用語が登録されているか

- [ ] **更新日付**
  - 最近のドキュメント更新日が正確か
  - バージョン番号の進め方は正確か
```

---

## ❓ FAQ

### Q: 画面仕様を大きく変更したい場合は？

**A**: 以下の手順で進めてください：

1. `requirements/` で機能要件を確認
2. `screens/` で現在の仕様を把握
3. 変更案を作成（新ブランチ推奨）
4. 相互参照をすべて確認
5. PR レビューで ドキュメント変更も含める

### Q: 新規用語を使いたい場合は？

**A**: `glossary.md` に必ず追加してください。推奨フォーマット：

```markdown
| 新規用語 | 定義（1文） | テーブル/機能 |
| --- | --- | --- |
| XXX | 説明 | 関連する実装 |
```

### Q: Phase 2 の機能が見つからない場合は？

**A**: `RECONCILIATION_SUMMARY.md` の「Phase 2 追加候補」を確認してください。Phase 1 完了後に追加予定です。

### Q: ドキュメント内のコード例を更新したい場合は？

**A**: 実際に実装・テスト後に更新してください。例：

```markdown
❌ 推測で書く
✅ 実装コードを参照して書く
```

---

## 📚 関連ドキュメント

- [README.md](README.md) - ドキュメント階層の説明
- [RECONCILIATION_SUMMARY.md](RECONCILIATION_SUMMARY.md) - MVP vs Phase 2
- [glossary.md](glossary.md) - 用語集

---

## 版履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-01-27 | v1.0 | 初版。PR チェックリスト、更新順序を定義 |

