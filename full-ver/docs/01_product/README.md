# 01_product - プロダクト仕様ドキュメント

**Product requirements, feature specifications, and implementation guide.**

---

## 📚 ドキュメント階層（3-Tier Hierarchy）

本ディレクトリは、プロダクト定義から実装まで を **3 つのレベル** で管理します。

```
Tier 1: Product Requirements (何をするか - WHAT)
   ↓
Tier 2: Feature Specifications (どう見えるか - UI/UX)
   ↓
Tier 3: Implementation Guidance (どう作るか - Code)
```

### Tier 1: Product Requirements（機能要件）

**ファイル**: `requirements/`

何を実装するべきか を定義します。**事業要求が変わったときはここを更新**します。

| ドキュメント | 説明 |
| --- | --- |
| `requirements/README.md` | FR/NFR インデックス（マスターリスト） |
| `requirements/admin.md` | 権限・監査ログ |
| `requirements/non-functional.md` | NFR: パフォーマンス・セキュリティ等 |

**更新タイミング**:
- 新機能の追加・削除
- 機能要件の仕様変更
- 優先順位の変更（P0 → P1, など）

---

### Tier 2: Feature Specifications（画面仕様）

**ファイル**: `screens/`

UI/UX の詳細を定義します。**ユーザーの操作フロー・画面設計が決まったときはここを更新**します。

#### 共通仕様
| ドキュメント | 説明 |
| --- | --- |
| `screens/README.md` | 画面一覧・遷移図・Golden Route |
| `screens/common/PREREQUISITES.md` | 出力ポリシー・固定ルール |
| `screens/common/RBAC.md` | 権限管理仕様・権限マトリクス |
| `screens/common/SCREEN_LAYOUT.md` | 2 カラムレイアウト・ナビゲーション・レスポンシブ |

#### 個別画面
| ロール | 画面 |
| --- | --- |
| 共通 | L01 ログイン、H01 ホーム |
| Admin | AD01 ユーザー管理 |

**更新タイミング**:
- UI/UX デザイン確定時
- 画面遷移の変更
- 各画面の入出力仕様が決まったとき

---

### Tier 3: Implementation Guidance（実装ガイド）

**ファイル**: `implementation/`

コード実装での細部ルール・テストシナリオ・デモデータ を定義します。**開発中に実装パターンが確定したときはここを更新**します。

| ドキュメント | 説明 |
| --- | --- |
| `implementation/README.md` | 実装ガイド索引 |
| `implementation/logic.md` | 重要ビジネスロジック |
| `implementation/acceptance.md` | P0 受入条件・デモシナリオ |
| `implementation/demo-data.md` | デモ用初期データ仕様 |

**更新タイミング**:
- 実装での例外パターンが見つかったとき
- テストケースの追加
- デモデータの調整

---

## 🔄 ドキュメント同期ワークフロー

新機能実装時は、**Tier 1 → Tier 2 → Tier 3 の順序で更新**してください。

### 例: 新画面「パフォーマンス詳細」を追加する場合

1. **Tier 1 更新**: 機能要件を `requirements/` に追加
   - どの FR 番号に該当するか明記
   - ユーザーストーリーを記述

2. **Tier 2 更新**: 画面仕様を `screens/` に追加
   - 新しい画面ファイル を作成（例: `screens/agent/A04-performance-detail.md`）
   - `screens/README.md` に画面一覧を追加
   - `screens/common/SCREEN_LAYOUT.md` に navigation を追加（必要に応じて）

3. **Tier 3 更新**: 実装ガイドを更新
   - `implementation/logic.md` に新規ビジネスロジック を追加（あれば）
   - `implementation/acceptance.md` に GWT テストケースを追加

---

## 🔗 クロス参照ガイド

### Requirements → Screens

機能要件（FR-XX）をクリックしたら、関連する画面仕様をすぐ見つけられるようにします。

**例**: FR-14 の権限管理機能 → AD01 ユーザー管理画面

```
📄 requirements/admin.md (FR-14)
  → 関連画面: screens/admin/AD01-user-management.md
```

### Screens → Implementation

画面仕様から実装ガイドへのリンク。

```
📄 screens/admin/AD01-user-management.md
  → 実装ロジック: implementation/logic.md
  → テスト: implementation/acceptance.md
```

---

## 📖 ドキュメント使用ガイド

### Product Manager（要件定義）
1. `prd.md` を最初に読む
2. `requirements/README.md` でマスターリストを確認
3. 新規機能は `requirements/` 配下に追加

### Designer / PM（UI/UX 設計）
1. `screens/README.md` で現在の画面一覧を把握
2. `screens/common/SCREEN_LAYOUT.md` で共通レイアウト を確認
3. 新規画面は `screens/[role]/` に追加

### Engineer（実装）
1. 対象画面の仕様を `screens/` で確認
2. 関連要件を `requirements/` で確認
3. 実装パターンを `implementation/` で確認

### QA / Tester（テスト）
1. 機能要件を `requirements/` で確認
2. テストシナリオを `implementation/acceptance.md` で確認
3. Given/When/Then フォーマットで テストケース作成

---

## 📝 ドキュメント保守ルール

### 1. バージョン管理

各ドキュメントには `最終更新日` を含める：

```markdown
| 最終更新 | 2026-01-27 |
| バージョン | v1.0 |
```

### 2. PR チェックリスト

新機能の PR 時は、以下を確認：

- [ ] `requirements/` が更新されたか（新 FR 番号の場合）
- [ ] `screens/` が更新されたか（新画面 or 画面修正の場合）
- [ ] `implementation/` が更新されたか（新ロジック or テストケースの場合）
- [ ] すべてのリンクが有効か
- [ ] 用語が `glossary.md` に定義されているか

### 3. 用語の一貫性

新しい用語を使う場合は **必ず** `glossary.md` に追加：

```markdown
| 新規概念 | 定義 | 関連テーブル/機能 |
| --- | --- | --- |
| XXX | 説明 | テクニカル情報 |
```

### 4. 相互参照の保持

- `requirements/README.md` → 各画面番号 (S01, A01 等) へのリンク
- `screens/README.md` → 関連 FR 番号へのリンク
- すべてのリンクは相対パスを使用

---

## 📂 ファイルツリー（全体構成）

```
docs/01_product/
├── README.md                           ← このファイル
├── prd.md                              # PRD（全体概要）
├── glossary.md                         # 用語集
├── RECONCILIATION_SUMMARY.md           # MVP vs Phase 2 決定記録
│
├── design/                             # UX/UI 参考資料
│   ├── ux_flows.md
│   ├── ui_requirements.md
│   └── wireframes_text.md
│
├── design_system/                      # Design Tokens
│   ├── overview.md
│   └── tokens.schema.md
│
├── requirements/                       # 📌 Tier 1: Product Requirements
│   ├── README.md                       # FR/NFR マスターリスト
│   ├── admin.md                        # 権限・監査ログ
│   └── non-functional.md               # NFR: パフォーマンス・セキュリティ等
│
├── screens/                            # 📌 Tier 2: Feature Specifications
│   ├── README.md                       # 画面一覧・遷移図
│   ├── L01-login.md
│   ├── H01-home.md
│   │
│   ├── admin/                          # Admin 向け
│   │   └── AD01-user-management.md
│   │
│   └── common/                         # 共通仕様
│       ├── PREREQUISITES.md            # 出力ポリシー・固定ルール
│       ├── RBAC.md                     # 権限管理仕様
│       └── SCREEN_LAYOUT.md            # 2 カラムレイアウト・ナビゲーション
│
└── implementation/                     # 📌 Tier 3: Implementation Guidance
    ├── README.md                       # 実装ガイド索引
    ├── logic.md                        # 重要ビジネスロジック
    ├── acceptance.md                   # P0 受入条件・デモシナリオ
    └── demo-data.md                    # デモ用初期データ
```

---

## 🎯 Quick Links

| 用途 | ドキュメント |
| --- | --- |
| **全体を把握したい** | [prd.md](prd.md) → [RECONCILIATION_SUMMARY.md](RECONCILIATION_SUMMARY.md) |
| **機能要件を見たい** | [requirements/README.md](requirements/README.md) |
| **画面仕様を見たい** | [screens/README.md](screens/README.md) |
| **デモシナリオ** | [implementation/acceptance.md](implementation/acceptance.md) |
| **用語を確認したい** | [glossary.md](glossary.md) |
| **実装時の注意点** | [RECONCILIATION_SUMMARY.md](RECONCILIATION_SUMMARY.md#⚠️-実装時の注意点) |

---

## 📅 バージョン履歴

| 日付 | バージョン | 内容 |
| --- | --- | --- |
| 2026-01-27 | v1.0 | MVP 仕様確定。ドキュメント階層化完了 |

