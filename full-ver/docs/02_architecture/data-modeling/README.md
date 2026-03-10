# データモデリング

このディレクトリにはプロジェクトのデータモデリングドキュメントが含まれています。

## ドキュメント

### [Entity-Relationship Diagram](./er-diagram.md)

Prisma スキーマに基づくすべてのエンティティリレーションシップを示す ER 図。

#### エンティティグループ

1. **認証・ユーザー管理 (Authentication & User Management)**: AUTH_USER, REFRESH_TOKEN, PASSWORD_RESET_TOKEN
2. **監査 (Audit)**: AUDIT_LOG
3. **テナント・コンテンツ管理 (Tenant & Content Management)**: TENANT, USER, CONTENT, ENTITLEMENT

## 参照

- [Prisma Schema](../../../projects/apps/api/prisma/schema.prisma)
- [Architecture Overview](../ARCHITECTURE.md#database-schema)
