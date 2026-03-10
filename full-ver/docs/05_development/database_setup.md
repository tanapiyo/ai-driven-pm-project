# DB 初期化・シード手順

新規開発者がローカル DB を 1 コマンドで準備するための手順書です。

## 前提条件

- DevContainer または `./tools/contract up` で MySQL が起動していること
- `DATABASE_URL` 環境変数が設定されていること（DevContainer 内では自動設定済み）

DevContainer を使った開発環境の起動については [devcontainer.md](../devcontainer.md) を参照してください。

---

## クイックスタート（新規開発者向け）

**DevContainer 内で 1 コマンド実行するだけで DB が用意できます。**

```bash
./tools/contract db:setup
```

このコマンドは以下を順番に実行します。

1. Prisma クライアント生成
2. マイグレーション適用（`prisma migrate deploy`）
3. 初期データ投入（シード）

実行後、以下の初期アカウントが利用可能になります。

| 項目 | 値 |
|------|-----|
| メールアドレス | `admin@example.com` |
| パスワード | `Admin1234` |
| ロール | `admin` |

---

## 各コマンドの詳細

### `./tools/contract db:setup`（推奨）

新規開発者向けの一括セットアップコマンドです。generate → migrate → seed を順番に実行します。

```bash
./tools/contract db:setup
```

### `./tools/contract migrate`

未適用のマイグレーションを適用します（`prisma migrate dev`）。

```bash
./tools/contract migrate
```

### `./tools/contract seed-integrity-check`

シードデータが正しく投入されているか検証します。

```bash
./tools/contract seed-integrity-check
```

---

## `pnpm db:*` スクリプト一覧

`projects/` ディレクトリ配下でも直接 pnpm スクリプトが利用できます。

| コマンド | 説明 |
|----------|------|
| `pnpm db:setup` | 一括セットアップ（generate + migrate deploy + seed） |
| `pnpm db:generate` | Prisma クライアント生成 |
| `pnpm db:migrate` | マイグレーション実行（開発用、`prisma migrate dev`） |
| `pnpm db:seed` | 初期データ投入 |
| `pnpm db:reset` | DB 完全リセット（`prisma migrate reset --force`） |
| `pnpm db:integrity-check` | シードデータ整合性チェック |

> **推奨**: `./tools/contract db:setup` を使用してください。DevContainer 内での実行が保証されます。

---

## シードデータの内容

シードスクリプトは `projects/apps/api/prisma/seed.ts` に定義されています。

### 投入されるデータ

| テーブル | データ |
|---------|--------|
| `auth_users` | 管理者アカウント（`admin@example.com`） |

シードは冪等性を持ちます。同じデータが既に存在する場合はスキップされます。

---

## マイグレーションファイルの管理

マイグレーションファイルは `projects/apps/api/prisma/migrations/` に配置されます。

### 新しいマイグレーションを作成する

スキーマを変更した後、以下を実行してください。

```bash
./tools/contract migrate
```

> **注意**: `prisma migrate dev` はマイグレーションファイルを生成します。生成されたファイルは必ずコミットしてください。

### 本番環境への適用

本番環境では `prisma migrate deploy` を使用します（`db:setup` 内でも使用）。

---

## データベース構成

### ORM

Prisma を使用しています（ADR-0018 参照）。

### プロバイダー

MySQL 8（ADR-0017 で Aurora MySQL が選定済み）。Prisma schema の `provider` は `"mysql"` に設定されています。

### 接続 URL フォーマット

```
mysql://<user>:<password>@<host>:<port>/<database>
```

DevContainer 内の接続 URL 例:

```
mysql://mysql:mysql@db:3306/app
```

### 全文検索について

MySQL は `COLLATE` によって大文字小文字を区別しない検索が可能です。
デフォルトの collation（`utf8mb4_general_ci` など）は大文字小文字を区別しません。
PostgreSQL の `mode: 'insensitive'` は MySQL では不要です。

---

## トラブルシューティング

### `DATABASE_URL` が設定されていない

```
Error: DATABASE_URL environment variable is not set
```

DevContainer 内で実行しているか確認してください。

```bash
# DevContainer 内での確認
echo $DATABASE_URL
# 出力例: mysql://mysql:mysql@db:3306/app
```

### MySQL に接続できない

```
Error: Can't reach database server
```

1. MySQL が起動しているか確認します。

   ```bash
   ./tools/contract up:status
   ```

2. 起動していない場合は起動します。

   ```bash
   ./tools/contract up
   ```

### マイグレーションが失敗する

既存のデータと競合している場合は DB をリセットしてください。

```bash
# DevContainer 内で実行
pnpm db:reset
# 再度セットアップ
pnpm db:setup
```

> **警告**: `db:reset` は DB 内のすべてのデータを削除します。開発環境でのみ使用してください。

---

## 関連ドキュメント

- [DevContainer セットアップ](../devcontainer.md)
- [Docker Compose 開発環境](../docker_compose_dev.md)
- [ADR-0017: Aurora MySQL 選定](../02_architecture/adr/0017-aurora-mysql.md)
- [ADR-0018: ORM/Query Builder 選定](../02_architecture/adr/0018-orm-query-builder.md)
- Prisma スキーマ: `projects/apps/api/prisma/schema.prisma`
- シードスクリプト: `projects/apps/api/prisma/seed.ts`
