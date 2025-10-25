# API設計書

## 1. API基本方針

### アーキテクチャ
| 項目 | 内容 |
|------|------|
| API種別 | RESTful API |
| プロトコル | HTTPS |
| データ形式 | JSON (UTF-8) |
| 日時形式 | ISO 8601 (YYYY-MM-DDTHH:mm:ssZ) |

### 命名規則
| 対象 | 規則 | 例 |
|------|------|-----|
| エンドポイント | ケバブケース・複数形 | /api/v1/users |
| パスパラメータ | ケバブケース | user-id |
| クエリパラメータ | スネークケース | created_at, page |
| JSONキー | キャメルケース | userId, createdAt |

### バージョニング
- 方式: URLパスに含める `/api/v{major}/`
- 現行: v1
- 後方互換性: メジャーバージョンアップ時のみ非互換許容

---

## 2. 認証・認可

### 認証方式
| 項目 | 内容 |
|------|------|
| 方式 | Bearer Token (JWT) |
| ヘッダー | `Authorization: Bearer {token}` |
| トークン有効期限 | アクセストークン: 1時間、リフレッシュトークン: 30日 |

### ロール定義
| ロール | 説明 |
|-------|------|
| admin | 管理者 (全操作可能) |
| user | 一般ユーザー (自分のデータのみ操作可能) |

---

## 3. 共通仕様

### HTTPステータスコード
| コード | 用途 |
|-------|------|
| 200 OK | GET, PUT成功 |
| 201 Created | POST成功 (リソース作成) |
| 204 No Content | DELETE成功 |
| 400 Bad Request | バリデーションエラー |
| 401 Unauthorized | 認証エラー |
| 403 Forbidden | 認可エラー (権限不足) |
| 404 Not Found | リソース未存在 |
| 409 Conflict | 競合エラー (一意制約違反等) |
| 422 Unprocessable Entity | ビジネスロジックエラー |
| 429 Too Many Requests | レート制限超過 |
| 500 Internal Server Error | サーバーエラー |

### エラーレスポンス形式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "ユーザー向けエラーメッセージ",
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

### エラーコード一覧
| コード | HTTPステータス | 説明 |
|-------|--------------|------|
| VALIDATION_ERROR | 400 | 入力値バリデーションエラー |
| UNAUTHORIZED | 401 | 認証エラー (トークン未提供/無効) |
| FORBIDDEN | 403 | 権限不足 |
| NOT_FOUND | 404 | リソース未存在 |
| DUPLICATE_ENTRY | 409 | 一意制約違反 |
| BUSINESS_LOGIC_ERROR | 422 | ビジネスルール違反 |
| RATE_LIMIT_EXCEEDED | 429 | レート制限超過 |
| INTERNAL_ERROR | 500 | サーバー内部エラー |

### ページネーション
**リクエスト**
- `page`: ページ番号 (デフォルト: 1)
- `limit`: 1ページあたりの件数 (デフォルト: 20, 最大: 100)

**レスポンス**
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

### フィルタリング・ソート
- フィルタ: クエリパラメータ `?status=active&role=admin` (AND条件)
- ソート: `?sort=created_at&order=desc` (asc/desc)
- 検索: `?search=keyword` (部分一致)

---

## 4. API一覧

| No | カテゴリ | エンドポイント | メソッド | 概要 | 認証 | ロール |
|----|---------|--------------|---------|------|------|-------|
| 1 | 認証 | /api/v1/auth/login | POST | ログイン | 不要 | - |
| 2 | 認証 | /api/v1/auth/logout | POST | ログアウト | 必要 | all |
| 3 | 認証 | /api/v1/auth/refresh | POST | トークン更新 | 必要 | all |
| 4 | ユーザー | /api/v1/users | GET | ユーザー一覧 | 必要 | admin |
| 5 | ユーザー | /api/v1/users/{id} | GET | ユーザー詳細 | 必要 | admin, self |
| 6 | ユーザー | /api/v1/users | POST | ユーザー作成 | 必要 | admin |
| 7 | ユーザー | /api/v1/users/{id} | PUT | ユーザー更新 | 必要 | admin, self |
| 8 | ユーザー | /api/v1/users/{id} | DELETE | ユーザー削除 | 必要 | admin |
| 9 | 注文 | /api/v1/orders | GET | 注文一覧 | 必要 | all |
| 10 | 注文 | /api/v1/orders/{id} | GET | 注文詳細 | 必要 | all |
| 11 | 注文 | /api/v1/orders | POST | 注文作成 | 必要 | all |
| 12 | 商品 | /api/v1/products | GET | 商品一覧 | 不要 | - |
| 13 | 商品 | /api/v1/products/{id} | GET | 商品詳細 | 不要 | - |

---

## 5. API詳細定義

### 5.1 認証: ログイン

**基本情報**
- エンドポイント: `POST /api/v1/auth/login`
- 認証: 不要
- レート制限: 10リクエスト/分/IP

**リクエスト**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**リクエストパラメータ**
| フィールド | 型 | 必須 | バリデーション |
|-----------|-----|------|--------------|
| email | string | ○ | メール形式, 最大255文字 |
| password | string | ○ | 最小8文字, 最大100文字 |

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

**エラーレスポンス**
- 401: 認証失敗 (`INVALID_CREDENTIALS`)
- 429: レート制限超過 (`RATE_LIMIT_EXCEEDED`)

---

### 5.2 認証: ログアウト

**基本情報**
- エンドポイント: `POST /api/v1/auth/logout`
- 認証: 必要
- ロール: all

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

**レスポンス**
- 204 No Content (成功)

---

### 5.3 認証: トークン更新

**基本情報**
- エンドポイント: `POST /api/v1/auth/refresh`
- 認証: 必要 (リフレッシュトークンで認証)

**リクエスト**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**レスポンス (200 OK)**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**エラーレスポンス**
- 401: トークン無効 (`INVALID_TOKEN`)

---

### 5.4 ユーザー: 一覧取得

**基本情報**
- エンドポイント: `GET /api/v1/users`
- 認証: 必要
- ロール: admin

**クエリパラメータ**
| パラメータ | 型 | 必須 | デフォルト | バリデーション |
|-----------|-----|------|----------|--------------|
| page | integer | × | 1 | >= 1 |
| limit | integer | × | 20 | 1-100 |
| sort | string | × | created_at | id, email, created_at |
| order | string | × | desc | asc, desc |
| search | string | × | - | 最大100文字 (名前・メール部分一致) |
| role | string | × | - | admin, user |
| status | string | × | - | active, inactive, suspended |

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

### 5.5 ユーザー: 詳細取得

**基本情報**
- エンドポイント: `GET /api/v1/users/{id}`
- 認証: 必要
- ロール: admin, self (自分自身のみ)

**パスパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | integer | ユーザーID |

**レスポンス (200 OK)**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "山田太郎",
  "role": "user",
  "status": "active",
  "lastLoginAt": "2024-01-01T12:00:00Z",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

**エラーレスポンス**
- 404: ユーザー未存在 (`USER_NOT_FOUND`)
- 403: 権限不足 (`FORBIDDEN`)

---

### 5.6 ユーザー: 作成

**基本情報**
- エンドポイント: `POST /api/v1/users`
- 認証: 必要
- ロール: admin

**リクエスト**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123",
  "name": "新規太郎",
  "role": "user"
}
```

**リクエストパラメータ**
| フィールド | 型 | 必須 | バリデーション |
|-----------|-----|------|--------------|
| email | string | ○ | メール形式, 最大255文字, 一意 |
| password | string | ○ | 最小8文字, 英数字記号含む |
| name | string | ○ | 1-100文字 |
| role | string | × | admin, user (デフォルト: user) |

**レスポンス (201 Created)**
```json
{
  "id": 101,
  "email": "newuser@example.com",
  "name": "新規太郎",
  "role": "user",
  "status": "active",
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

**エラーレスポンス**
- 400: バリデーションエラー (`VALIDATION_ERROR`)
- 409: メールアドレス重複 (`DUPLICATE_EMAIL`)

---

### 5.7 ユーザー: 更新

**基本情報**
- エンドポイント: `PUT /api/v1/users/{id}`
- 認証: 必要
- ロール: admin, self (自分自身のみ)

**パスパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | integer | ユーザーID |

**リクエスト** (部分更新可能)
```json
{
  "name": "山田太郎(更新)",
  "status": "inactive"
}
```

**リクエストパラメータ**
| フィールド | 型 | 必須 | バリデーション |
|-----------|-----|------|--------------|
| name | string | × | 1-100文字 |
| status | string | × | active, inactive, suspended (admin のみ) |

**レスポンス (200 OK)**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "山田太郎(更新)",
  "role": "user",
  "status": "inactive",
  "lastLoginAt": "2024-01-01T12:00:00Z",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T13:00:00Z"
}
```

**エラーレスポンス**
- 404: ユーザー未存在 (`USER_NOT_FOUND`)
- 403: 権限不足 (`FORBIDDEN`)

---

### 5.8 ユーザー: 削除

**基本情報**
- エンドポイント: `DELETE /api/v1/users/{id}`
- 認証: 必要
- ロール: admin

**パスパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | integer | ユーザーID |

**レスポンス**
- 204 No Content (成功)

**エラーレスポンス**
- 404: ユーザー未存在 (`USER_NOT_FOUND`)

**備考**
- 論理削除を実施 (deleted_atにタイムスタンプ設定)
- 参照されているデータがある場合は削除不可 (RESTRICT)

---

### 5.9 注文: 一覧取得

**基本情報**
- エンドポイント: `GET /api/v1/orders`
- 認証: 必要
- ロール: all (admin: 全注文, user: 自分の注文のみ)

**クエリパラメータ**
| パラメータ | 型 | 必須 | デフォルト | バリデーション |
|-----------|-----|------|----------|--------------|
| page | integer | × | 1 | >= 1 |
| limit | integer | × | 20 | 1-100 |
| sort | string | × | created_at | id, order_date, total_amount |
| order | string | × | desc | asc, desc |
| status | string | × | - | pending, confirmed, shipped, delivered, cancelled |
| user_id | integer | × | - | >= 1 (admin のみ) |

**レスポンス (200 OK)**
```json
{
  "data": [
    {
      "id": 1,
      "userId": 1,
      "orderNumber": "ORD-20240101-0001",
      "orderDate": "2024-01-01",
      "totalAmount": 10000.00,
      "status": "delivered",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-05T15:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### 5.10 注文: 詳細取得

**基本情報**
- エンドポイント: `GET /api/v1/orders/{id}`
- 認証: 必要
- ロール: all (admin: 全注文, user: 自分の注文のみ)

**パスパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | integer | 注文ID |

**レスポンス (200 OK)**
```json
{
  "id": 1,
  "userId": 1,
  "orderNumber": "ORD-20240101-0001",
  "orderDate": "2024-01-01",
  "totalAmount": 10000.00,
  "status": "delivered",
  "items": [
    {
      "id": 1,
      "productId": 1,
      "productName": "商品A",
      "quantity": 2,
      "unitPrice": 1000.00,
      "amount": 2000.00
    }
  ],
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-05T15:00:00Z"
}
```

**エラーレスポンス**
- 404: 注文未存在 (`ORDER_NOT_FOUND`)
- 403: 権限不足 (`FORBIDDEN`)

---

### 5.11 注文: 作成

**基本情報**
- エンドポイント: `POST /api/v1/orders`
- 認証: 必要
- ロール: all

**リクエスト**
```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    },
    {
      "productId": 2,
      "quantity": 1
    }
  ]
}
```

**リクエストパラメータ**
| フィールド | 型 | 必須 | バリデーション |
|-----------|-----|------|--------------|
| items | array | ○ | 最小1件 |
| items[].productId | integer | ○ | 存在する商品ID |
| items[].quantity | integer | ○ | >= 1 |

**レスポンス (201 Created)**
```json
{
  "id": 101,
  "userId": 1,
  "orderNumber": "ORD-20240101-0101",
  "orderDate": "2024-01-01",
  "totalAmount": 3000.00,
  "status": "pending",
  "items": [
    {
      "id": 201,
      "productId": 1,
      "productName": "商品A",
      "quantity": 2,
      "unitPrice": 1000.00,
      "amount": 2000.00
    }
  ],
  "createdAt": "2024-01-01T12:00:00Z",
  "updatedAt": "2024-01-01T12:00:00Z"
}
```

**エラーレスポンス**
- 400: バリデーションエラー (`VALIDATION_ERROR`)
- 404: 商品未存在 (`PRODUCT_NOT_FOUND`)
- 422: 在庫不足 (`INSUFFICIENT_STOCK`)

**処理ロジック**
1. 商品存在確認
2. 在庫確認
3. 注文番号生成 (ORD-YYYYMMDD-NNNN)
4. 合計金額計算 (商品単価 × 数量の合計)
5. 注文・注文明細をトランザクション内で一括作成

---

### 5.12 商品: 一覧取得

**基本情報**
- エンドポイント: `GET /api/v1/products`
- 認証: 不要

**クエリパラメータ**
| パラメータ | 型 | 必須 | デフォルト | バリデーション |
|-----------|-----|------|----------|--------------|
| page | integer | × | 1 | >= 1 |
| limit | integer | × | 20 | 1-100 |
| sort | string | × | id | id, name, price |
| order | string | × | asc | asc, desc |
| search | string | × | - | 最大100文字 (商品名部分一致) |
| status | string | × | active | active, inactive, all |

**レスポンス (200 OK)**
```json
{
  "data": [
    {
      "id": 1,
      "name": "商品A",
      "description": "商品Aの説明",
      "price": 1000.00,
      "stock": 100,
      "status": "active"
    }
  ],
  "pagination": {...}
}
```

---

### 5.13 商品: 詳細取得

**基本情報**
- エンドポイント: `GET /api/v1/products/{id}`
- 認証: 不要

**パスパラメータ**
| パラメータ | 型 | 説明 |
|-----------|-----|------|
| id | integer | 商品ID |

**レスポンス (200 OK)**
```json
{
  "id": 1,
  "name": "商品A",
  "description": "商品Aの詳細説明",
  "price": 1000.00,
  "stock": 100,
  "status": "active",
  "createdAt": "2023-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**エラーレスポンス**
- 404: 商品未存在 (`PRODUCT_NOT_FOUND`)

---

## 6. レート制限

| エンドポイント | 制限 |
|--------------|------|
| 認証API (/auth/login) | 10リクエスト/分/IP |
| その他API (認証済み) | 1000リクエスト/時間/ユーザー |
| その他API (未認証) | 100リクエスト/時間/IP |

**制限超過時**
- HTTPステータス: 429 Too Many Requests
- ヘッダー: `Retry-After: 60` (秒数)

---

## 7. 重要な設計判断

### トランザクション管理
- 注文作成: 注文+注文明細を一括作成 (トランザクション)
- ロールバック: エラー時は全て巻き戻し

### エラーハンドリング方針
- クライアント側で再試行可能なエラー (401, 429) にはRetry-Afterヘッダー付与
- サーバーエラー (500) はrequestIdを返し、ログで追跡可能に

### セキュリティ考慮事項
- パスワードはリクエスト/レスポンスに含めない (ハッシュ化してDB保存)
- 削除は論理削除 (deleted_at設定)
- レート制限でブルートフォース攻撃を防御

### パフォーマンス考慮事項
- ページネーション必須 (最大100件/リクエスト)
- N+1問題回避: 注文詳細取得時はJOINで明細も一括取得
- キャッシュ: 商品一覧は5分間キャッシュ推奨
