# Entity-Relationship Diagram

```mermaid
erDiagram
    AUTH_USER ||--o{ REFRESH_TOKEN : has
    AUTH_USER ||--o{ PASSWORD_RESET_TOKEN : has
    AUTH_USER ||--o{ AUDIT_LOG : acts
    AUTH_USER ||--o{ USER : "linked to"

    TENANT ||--o{ USER : has
    TENANT ||--o{ CONTENT : has
    USER ||--o{ ENTITLEMENT : has
    CONTENT ||--o{ ENTITLEMENT : has

    AUTH_USER {
        string id
        string email
        string name
        enum role
        string passwordHash
        timestamp createdAt
        timestamp updatedAt
    }

    REFRESH_TOKEN {
        string id
        string userId
        string tokenHash
        timestamp expiresAt
        timestamp revokedAt
    }

    PASSWORD_RESET_TOKEN {
        string id
        string userId
        string tokenHash
        timestamp expiresAt
        timestamp usedAt
    }

    AUDIT_LOG {
        string id
        string actorId
        enum entityType
        string entityId
        enum action
        json changes
        json metadata
    }

    TENANT {
        string id
        string name
        string slug
        enum status
        timestamp createdAt
        timestamp updatedAt
        timestamp deletedAt
    }

    USER {
        string id
        string tenantId
        string authUserId
        string name
        string email
        enum role
        enum status
        timestamp createdAt
        timestamp updatedAt
        timestamp deletedAt
    }

    CONTENT {
        string id
        string tenantId
        string title
        string description
        enum type
        enum status
        timestamp createdAt
        timestamp updatedAt
        timestamp deletedAt
    }

    ENTITLEMENT {
        string id
        string userId
        string contentId
        enum type
        timestamp grantedAt
        timestamp expiresAt
        timestamp revokedAt
        timestamp createdAt
    }
```

## エンティティグループ

### 認証・ユーザー管理 (Authentication & User Management)
- `AUTH_USER`: ロールベースアクセス制御を持つ認証ユーザー
- `REFRESH_TOKEN`: JWT リフレッシュトークンレコード
- `PASSWORD_RESET_TOKEN`: パスワードリセットトークンレコード

### 監査 (Audit)
- `AUDIT_LOG`: トラッキング対象エンティティへの変更の不変監査ログ

### テナント・コンテンツ管理 (Tenant & Content Management)
- `TENANT`: テナント（レーベル等）を管理するエンティティ
- `USER`: テナントに紐づくユーザープロファイル（`AUTH_USER` とは別）
- `CONTENT`: テナント配下のコンテンツ（音楽・動画・画像等）
- `ENTITLEMENT`: コンテンツに対するアクセス権（購入・サブスクリプション等）
