# 実装ガイド

P0実装に必要なロジック・受入条件・デモデータの仕様。

---

## ドキュメント一覧

| ファイル | 説明 |
|---------|------|
| [logic.md](logic.md) | 重要ビジネスロジック（必須実装ルール） |
| [acceptance.md](acceptance.md) | P0受入条件・デモシナリオ |
| [demo-data.md](demo-data.md) | デモ用初期データ仕様 |

---

## クイックリファレンス

### 重要ロジック（logic.md）

1. **楽観ロック**: `updated_at`比較で同時編集検知
2. **権限チェック**: Agent=自担当のみ、Planner=閲覧のみ

### P0受入条件（acceptance.md）

| パス | 成功条件 |
|-----|---------|
| Planner | 検索→候補選定→詳細確認 |
| Agent | 担当管理→実績登録 |
| Exec | カバレッジ可視化→傾向確認 |
| Admin | ユーザー管理→マスタ管理 |

---

## 関連ドキュメント

- 機能要件: [../requirements/README.md](../requirements/README.md)
- 画面仕様: [../screens/README.md](../screens/README.md)
- API仕様: [../../02_architecture/api/](../../02_architecture/api/)
