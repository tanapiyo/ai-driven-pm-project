# API設計書

## 1. 文書管理情報
- **作成日**: YYYY/MM/DD
- **最終更新日**: YYYY/MM/DD
- **作成者**: [作成者名]
- **バージョン**: 1.0
- **承認者**: [承認者名]

## 2. 概要
### 2.1 目的
[このAPI設計書の目的を記載]

### 2.2 対象システム
[対象となるシステム名を記載]

### 2.3 参照ドキュメント
- 要件定義書
- システム構成図
- DB設計書
- [その他関連ドキュメント]

## 3. API設計方針
### 3.1 アーキテクチャスタイル
| 項目 | 内容 |
|------|------|
| API種別 | [RESTful API / GraphQL / gRPC] |
| 選定理由 | [要件との関連性を明記] |

### 3.2 通信プロトコル
| 項目 | 内容 |
|------|------|
| プロトコル | HTTPS |
| バージョン | HTTP/1.1 or HTTP/2 |
| ポート | 443 |

### 3.3 データフォーマット
| 項目 | 内容 |
|------|------|
| リクエスト形式 | application/json |
| レスポンス形式 | application/json |
| 文字コード | UTF-8 |
| 日時形式 | ISO 8601 (YYYY-MM-DDTHH:mm:ssZ) |

### 3.4 命名規則
| 対象 | 規則 | 例 |
|------|------|-----|
| エンドポイント | ケバブケース・複数形 | /api/v1/users |
| パラメータ名 | スネークケース | user_id, created_at |
| JSONキー | キャメルケース | userId, createdAt |

### 3.5 バージョニング方針
| 項目 | 内容 |
|------|------|
| バージョン管理方式 | URLパスに含める |
| バージョン形式 | /api/v{major_version}/ |
| 現行バージョン | v1 |
| 後方互換性ポリシー | メジャーバージョンアップ時に非互換許容 |

### 3.6 レート制限
| 項目 | 内容 |
|------|------|
| 認証済みユーザー | 1000リクエスト/時間 |
| 未認証ユーザー | 100リクエスト/時間 |
| 制限超過時レスポンス | 429 Too Many Requests |

## 4. 認証・認可
### 4.1 認証方式
| 項目 | 内容 |
|------|------|
| 認証方式 | [Bearer Token / OAuth 2.0 / API Key] |
| トークン形式 | JWT |
| トークン有効期限 | アクセストークン: 1時間、リフレッシュトークン: 30日 |
| ヘッダー形式 | Authorization: Bearer {token} |

### 4.2 認可方式
| 項目 | 内容 |
|------|------|
| 認可モデル | [RBAC / ABAC] |
| ロール定義 | admin, user, guest |

### 4.3 認証フロー
```
[認証フローの図またはシーケンス図]
1. クライアント → サーバー: POST /api/v1/auth/login (email, password)
2. サーバー → クライアント: 200 OK {accessToken, refreshToken}
3. クライアント → サーバー: GET /api/v1/users (Authorization: Bearer {accessToken})
4. サーバー → クライアント: 200 OK {user data}
```

## 5. エラーハンドリング
### 5.1 HTTPステータスコード
| ステータスコード | 意味 | 使用場面 |
|---------------|------|---------|
| 200 OK | 成功 | GET, PUT成功時 |
| 201 Created | 作成成功 | POST成功時 |
| 204 No Content | 成功（レスポンスボディなし） | DELETE成功時 |
| 400 Bad Request | リクエストエラー | バリデーションエラー |
| 401 Unauthorized | 認証エラー | トークン未提供、無効 |
| 403 Forbidden | 認可エラー | 権限不足 |
| 404 Not Found | リソース未存在 | 指定IDのデータなし |
| 409 Conflict | 競合エラー | 一意制約違反 |
| 422 Unprocessable Entity | 処理不可 | ビジネスロジックエラー |
| 429 Too Many Requests | レート制限超過 | リクエスト過多 |
| 500 Internal Server Error | サーバーエラー | 予期しないエラー |
| 503 Service Unavailable | サービス利用不可 | メンテナンス中 |

### 5.2 エラーレスポンス形式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーの説明（ユーザー向け）",
    "details": [
      {
        "field": "email",
        "message": "メールアドレスの形式が正しくありません"
      }
    ],
    "requestId": "req-123456789",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### 5.3 エラーコード一覧
| エラーコード | HTTPステータス | 説明 | 対処方法 |
|------------|--------------|------|---------|
| VALIDATION_ERROR | 400 | バリデーションエラー | 入力値を修正 |
| UNAUTHORIZED | 401 | 認証エラー | ログインし直す |
| FORBIDDEN | 403 | 権限不足 | 管理者に権限を依頼 |
| NOT_FOUND | 404 | リソース未存在 | IDを確認 |
| DUPLICATE_ENTRY | 409 | 重複エラー | 既存データを確認 |
| BUSINESS_LOGIC_ERROR | 422 | ビジネスロジックエラー | エラーメッセージを確認 |
| INTERNAL_ERROR | 500 | サーバーエラー | 管理者に連絡 |

## 6. API一覧
### 6.1 エンドポイント一覧表
| No | カテゴリ | エンドポイント | メソッド | 概要 | 認証 | ロール |
|----|---------|--------------|---------|------|------|-------|
| 1 | 認証 | /api/v1/auth/login | POST | ログイン | 不要 | - |
| 2 | 認証 | /api/v1/auth/logout | POST | ログアウト | 必要 | all |
| 3 | 認証 | /api/v1/auth/refresh | POST | トークン更新 | 必要 | all |
| 4 | ユーザー | /api/v1/users | GET | ユーザー一覧取得 | 必要 | admin |
| 5 | ユーザー | /api/v1/users/{id} | GET | ユーザー詳細取得 | 必要 | all |
| 6 | ユーザー | /api/v1/users | POST | ユーザー作成 | 必要 | admin |
| 7 | ユーザー | /api/v1/users/{id} | PUT | ユーザー更新 | 必要 | admin, self |
| 8 | ユーザー | /api/v1/users/{id} | DELETE | ユーザー削除 | 必要 | admin |

## 7. API詳細仕様

### 7.1 [カテゴリ: 認証]

#### 7.1.1 ログイン
**基本情報**
| 項目 | 内容 |
|------|------|
| エンドポイント | POST /api/v1/auth/login |
| 概要 | メールアドレスとパスワードでログイン |
| 認証 | 不要 |
| レート制限 | 10リクエスト/分 |

**リクエスト**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**リクエストパラメータ**
| フィールド名 | 型 | 必須 | 説明 | バリデーション |
|------------|-----|------|------|--------------|
| email | string | ○ | メールアドレス | メールアドレス形式、最大255文字 |
| password | string | ○ | パスワード | 最小8文字、最大100文字 |

**レスポンス (200 OK)**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "山田太郎",
    "role": "user"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**レスポンスフィールド**
| フィールド名 | 型 | 説明 |
|------------|-----|------|
| user.id | integer | ユーザーID |
| user.email | string | メールアドレス |
| user.name | string | ユーザー名 |
| user.role | string | ロール (admin/user) |
| accessToken | string | アクセストークン |
| refreshToken | string | リフレッシュトークン |
| expiresIn | integer | アクセストークン有効期限（秒） |

**エラーレスポンス (401 Unauthorized)**
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "メールアドレスまたはパスワードが正しくありません",
    "requestId": "req-123456789",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

**エラーレスポンス (429 Too Many Requests)**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "リクエスト回数の上限に達しました。しばらく待ってから再試行してください。",
    "retryAfter": 60,
    "requestId": "req-123456789",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

#### 7.1.2 ログアウト
**基本情報**
| 項目 | 内容 |
|------|------|
| エンドポイント | POST /api/v1/auth/logout |
| 概要 | ログアウト（トークン無効化） |
| 認証 | 必要 |
| ロール | all |

**リクエストヘッダー**
```
Authorization: Bearer {accessToken}
```

**リクエスト**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス (204 No Content)**
レスポンスボディなし

---

### 7.2 [カテゴリ: ユーザー管理]

#### 7.2.1 ユーザー一覧取得
**基本情報**
| 項目 | 内容 |
|------|------|
| エンドポイント | GET /api/v1/users |
| 概要 | ユーザー一覧を取得 |
| 認証 | 必要 |
| ロール | admin |

**リクエストヘッダー**
```
Authorization: Bearer {accessToken}
```

**クエリパラメータ**
| パラメータ名 | 型 | 必須 | デフォルト値 | 説明 | バリデーション |
|------------|-----|------|------------|------|--------------|
| page | integer | × | 1 | ページ番号 | 1以上 |
| limit | integer | × | 20 | 1ページあたりの件数 | 1-100 |
| sort | string | × | created_at | ソート項目 | id, email, created_at |
| order | string | × | desc | ソート順 | asc, desc |
| search | string | × | - | 検索キーワード（名前、メール） | 最大100文字 |
| role | string | × | - | ロールフィルタ | admin, user |
| status | string | × | - | ステータスフィルタ | active, inactive |

**レスポンス (200 OK)**
```json
{
  "data": [
    {
      "id": 1,
      "email": "user1@example.com",
      "name": "山田太郎",
      "role": "admin",
      "status": "active",
      "lastLoginAt": "2024-01-01T12:00:00Z",
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T12:00:00Z"
    },
    {
      "id": 2,
      "email": "user2@example.com",
      "name": "佐藤花子",
      "role": "user",
      "status": "active",
      "lastLoginAt": "2024-01-01T11:00:00Z",
      "createdAt": "2023-01-15T00:00:00Z",
      "updatedAt": "2024-01-01T11:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 100,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

#### 7.2.2 ユーザー詳細取得
**基本情報**
| 項目 | 内容 |
|------|------|
| エンドポイント | GET /api/v1/users/{id} |
| 概要 | 指定されたIDのユーザー詳細を取得 |
| 認証 | 必要 |
| ロール | admin, self（自分自身のみ） |

**パスパラメータ**
| パラメータ名 | 型 | 説明 |
|------------|-----|------|
| id | integer | ユーザーID |

**レスポンス (200 OK)**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "山田太郎",
  "role": "user",
  "status": "active",
  "profile": {
    "phoneNumber": "090-1234-5678",
    "address": "東京都渋谷区...",
    "birthDate": "1990-01-01"
  },
  "lastLoginAt": "2024-01-01T12:00:00Z",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

**エラーレスポンス (404 Not Found)**
```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "指定されたユーザーが見つかりません",
    "requestId": "req-123456789",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

#### 7.2.3 ユーザー作成
**基本情報**
| 項目 | 内容 |
|------|------|
| エンドポイント | POST /api/v1/users |
| 概要 | 新規ユーザーを作成 |
| 認証 | 必要 |
| ロール | admin |

**リクエスト**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123",
  "name": "新規太郎",
  "role": "user",
  "profile": {
    "phoneNumber": "090-1234-5678",
    "address": "東京都渋谷区...",
    "birthDate": "1990-01-01"
  }
}
```

**リクエストパラメータ**
| フィールド名 | 型 | 必須 | 説明 | バリデーション |
|------------|-----|------|------|--------------|
| email | string | ○ | メールアドレス | メールアドレス形式、最大255文字、一意 |
| password | string | ○ | パスワード | 最小8文字、英数字記号を含む |
| name | string | ○ | 氏名 | 最小1文字、最大100文字 |
| role | string | × | ロール | admin, user (デフォルト: user) |
| profile.phoneNumber | string | × | 電話番号 | 電話番号形式 |
| profile.address | string | × | 住所 | 最大500文字 |
| profile.birthDate | string | × | 生年月日 | YYYY-MM-DD形式 |

**レスポンス (201 Created)**
```json
{
  "id": 101,
  "email": "newuser@example.com",
  "name": "新規太郎",
  "role": "user",
  "status": "active",
  "profile": {
    "phoneNumber": "090-1234-5678",
    "address": "東京都渋谷区...",
    "birthDate": "1990-01-01"
  },
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

**エラーレスポンス (400 Bad Request)**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力値が正しくありません",
    "details": [
      {
        "field": "email",
        "message": "メールアドレスの形式が正しくありません"
      },
      {
        "field": "password",
        "message": "パスワードは8文字以上である必要があります"
      }
    ],
    "requestId": "req-123456789",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

**エラーレスポンス (409 Conflict)**
```json
{
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "このメールアドレスは既に登録されています",
    "requestId": "req-123456789",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

#### 7.2.4 ユーザー更新
**基本情報**
| 項目 | 内容 |
|------|------|
| エンドポイント | PUT /api/v1/users/{id} |
| 概要 | ユーザー情報を更新 |
| 認証 | 必要 |
| ロール | admin, self（自分自身のみ） |

**パスパラメータ**
| パラメータ名 | 型 | 説明 |
|------------|-----|------|
| id | integer | ユーザーID |

**リクエスト**
```json
{
  "name": "山田太郎（更新）",
  "profile": {
    "phoneNumber": "090-9999-9999",
    "address": "東京都新宿区..."
  }
}
```

**レスポンス (200 OK)**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "山田太郎（更新）",
  "role": "user",
  "status": "active",
  "profile": {
    "phoneNumber": "090-9999-9999",
    "address": "東京都新宿区...",
    "birthDate": "1990-01-01"
  },
  "lastLoginAt": "2024-01-01T12:00:00Z",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T13:00:00Z"
}
```

---

#### 7.2.5 ユーザー削除
**基本情報**
| 項目 | 内容 |
|------|------|
| エンドポイント | DELETE /api/v1/users/{id} |
| 概要 | ユーザーを論理削除 |
| 認証 | 必要 |
| ロール | admin |

**パスパラメータ**
| パラメータ名 | 型 | 説明 |
|------------|-----|------|
| id | integer | ユーザーID |

**レスポンス (204 No Content)**
レスポンスボディなし

**エラーレスポンス (404 Not Found)**
```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "指定されたユーザーが見つかりません",
    "requestId": "req-123456789",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

---

[他のカテゴリのAPIも同様の形式で定義]

## 8. ページネーション
### 8.1 ページネーション方式
| 項目 | 内容 |
|------|------|
| 方式 | オフセットベース（page/limit） |
| デフォルトページサイズ | 20 |
| 最大ページサイズ | 100 |

### 8.2 ページネーションレスポンス形式
```json
{
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalCount": 100,
    "limit": 20,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 9. フィルタリング・ソート・検索
### 9.1 フィルタリング
- クエリパラメータで指定
- 複数フィルタはAND条件
- 例: `?role=admin&status=active`

### 9.2 ソート
- `sort`: ソート対象フィールド
- `order`: asc（昇順）/ desc（降順）
- 例: `?sort=created_at&order=desc`

### 9.3 検索
- `search`: 検索キーワード
- 部分一致検索
- 対象フィールドはエンドポイントごとに定義

## 10. 外部API連携
### 10.1 外部API一覧
| No | 連携先 | 用途 | プロトコル | 認証方式 |
|----|-------|------|----------|---------|
| 1 | 決済API | 決済処理 | HTTPS | API Key |
| 2 | メール配信API | メール送信 | HTTPS | OAuth 2.0 |

### 10.2 外部API詳細
[各外部APIの接続情報、エラーハンドリング、リトライポリシーなど]

## 11. Webhook
### 11.1 Webhook一覧
| イベント名 | 発火タイミング | 送信データ |
|-----------|--------------|----------|
| user.created | ユーザー作成時 | ユーザー情報 |
| order.completed | 注文完了時 | 注文情報 |

### 11.2 Webhook仕様
**送信形式**
```
POST {登録されたWebhook URL}
Content-Type: application/json
X-Webhook-Signature: {HMAC署名}
```

**ペイロード例**
```json
{
  "event": "user.created",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "id": 101,
    "email": "newuser@example.com",
    "name": "新規太郎"
  }
}
```

**署名検証**
- HMAC-SHA256を使用
- 秘密鍵はWebhook登録時に提供

**リトライポリシー**
- 失敗時は3回までリトライ
- リトライ間隔: 1分、5分、30分

## 12. パフォーマンス
### 12.1 レスポンスタイム目標
| API種別 | 目標レスポンスタイム |
|---------|-------------------|
| 一覧取得 | 500ms以内 |
| 詳細取得 | 200ms以内 |
| 作成・更新・削除 | 1秒以内 |

### 12.2 キャッシュ戦略
| 対象 | キャッシュ時間 | キャッシュ方式 |
|------|-------------|--------------|
| マスターデータ | 1時間 | サーバーサイド |
| ユーザー情報 | 5分 | サーバーサイド |

### 12.3 圧縮
- gzip圧縮を有効化
- 最小レスポンスサイズ: 1KB

## 13. セキュリティ
### 13.1 CORS設定
| 項目 | 内容 |
|------|------|
| 許可オリジン | https://example.com |
| 許可メソッド | GET, POST, PUT, DELETE, OPTIONS |
| 許可ヘッダー | Content-Type, Authorization |
| 認証情報の送信 | 許可 |

### 13.2 HTTPS強制
- すべてのAPIはHTTPS必須
- HTTP接続は301リダイレクト

### 13.3 入力値検証
- すべての入力値をサーバーサイドで検証
- SQLインジェクション対策: ORMまたはプリペアドステートメント
- XSS対策: 出力時にエスケープ
- CSRF対策: トークン検証（必要に応じて）

### 13.4 機密情報の取り扱い
- パスワードはハッシュ化（bcrypt）
- APIレスポンスに機密情報を含めない
- ログに機密情報を出力しない

## 14. ロギング・監視
### 14.1 ログ出力
| ログ種別 | 内容 | 保存期間 |
|---------|------|---------|
| アクセスログ | リクエスト/レスポンス情報 | 90日 |
| エラーログ | エラー詳細、スタックトレース | 180日 |
| 監査ログ | 重要操作の履歴 | 1年 |

### 14.2 監視項目
| 項目 | しきい値 | アラート |
|------|---------|---------|
| エラー率 | 5%超 | 即時通知 |
| レスポンスタイム | 1秒超 | 即時通知 |
| リクエスト数 | 想定の2倍 | 即時通知 |

## 15. テスト
### 15.1 テスト方針
- 単体テスト: 全エンドポイント
- 結合テスト: 主要フロー
- 負荷テスト: 想定トラフィックの2倍

### 15.2 テストデータ
- テスト環境用のサンプルデータを用意
- 本番データは使用しない

## 16. API仕様書公開
### 16.1 公開形式
| 項目 | 内容 |
|------|------|
| 仕様書形式 | OpenAPI 3.0 |
| 公開URL | https://api.example.com/docs |
| インタラクティブUI | Swagger UI |

### 16.2 OpenAPI定義ファイル
```yaml
# [OpenAPI 3.0形式の定義ファイル]
```

## 17. 変更管理
### 17.1 変更ポリシー
- 後方互換性のない変更はメジャーバージョンアップ
- 新機能追加はマイナーバージョンアップ
- バグ修正はパッチバージョンアップ
- 非推奨機能は6ヶ月前に告知

### 17.2 非推奨化プロセス
1. 新バージョンでの代替API提供
2. 旧APIに非推奨警告ヘッダー追加
3. 6ヶ月後に旧API廃止

## 18. サンプルコード
### 18.1 cURL
```bash
# ログイン
curl -X POST https://api.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# ユーザー一覧取得
curl -X GET https://api.example.com/api/v1/users?page=1&limit=20 \
  -H "Authorization: Bearer {accessToken}"
```

### 18.2 JavaScript (fetch)
```javascript
// ログイン
const login = async () => {
  const response = await fetch('https://api.example.com/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'user@example.com',
      password: 'password',
    }),
  });
  const data = await response.json();
  return data;
};

// ユーザー一覧取得
const getUsers = async (accessToken) => {
  const response = await fetch('https://api.example.com/api/v1/users?page=1&limit=20', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  return data;
};
```

## 19. 用語集
| 用語 | 説明 |
|------|------|
| JWT | JSON Web Token - トークンベース認証の形式 |
| RBAC | Role-Based Access Control - ロールベースのアクセス制御 |
| [その他用語] | [説明] |

## 20. 変更履歴
| 版数 | 変更日 | 変更者 | 変更内容 |
|------|-------|--------|---------|
| 1.0 | YYYY/MM/DD | [氏名] | 初版作成 |
