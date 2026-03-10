# 環境変数と秘密情報の取り扱い

このドキュメントでは、ローカル開発における環境変数の仕組みと秘密情報の運用ルールを説明します。

---

## 環境変数の仕組み

ローカル開発では環境変数の手動設定は不要です。すべて自動で設定されます。

### 全体の流れ

```
spawn.sh が .env を自動生成（インフラ変数のみ）
     ↓
docker-compose.worktree.yml が 2 種類の変数を使用:
  ① .env のインフラ変数 → コンテナ名・ネットワーク分離
  ② ハードコードのアプリ変数 → DB 接続先・ポート等
     ↓
各コンテナの process.env に注入
     ↓
API / Web アプリが process.env から参照
```

### インフラ変数（`.env` — spawn.sh が自動生成）

`spawn.sh` が worktree 作成時に自動生成します。手動編集は不要です。

| 変数 | 用途 |
|------|------|
| `WORKTREE` | Docker コンテナ・ネットワークの接頭辞 |
| `COMPOSE_PROJECT_NAME` | Docker Compose プロジェクト名 |
| `ENDPOINT_NAME` | Traefik ルーティングのホスト名 |
| `CONTAINER_NAME` | コンテナ名の接頭辞 |
| `HOST_WORKSPACE_PATH` | ホスト側の worktree 絶対パス |
| `INTERNAL_SUBNET` | worktree 専用サブネット（自動割当） |
| `WEB_STATIC_IP` | web サービスの固定 IP（Playwright 用） |

これらは並列 worktree でコンテナ名・URL・ネットワークが衝突しないための変数です。

### アプリ変数（`docker-compose.worktree.yml` の `environment:`）

アプリが使う変数は compose ファイルの `environment:` ブロックに設定済みです。

**api サービス:**

| 変数 | 値 | 説明 |
|------|-----|------|
| `NODE_ENV` | `development` | 実行環境 |
| `PORT` | `8080` | API サーバーポート |
| `DATABASE_URL` | `postgresql://postgres:postgres@db:5432/app` | DB 接続文字列 |
| `CORS_ALLOWED_ORIGINS` | `http://${ENDPOINT_NAME}.localhost,...` | CORS 許可オリジン |

**web サービス:**

| 変数 | 値 | 説明 |
|------|-----|------|
| `NODE_ENV` | `development` | 実行環境 |
| `NEXT_PUBLIC_API_URL` | `/api` | API リクエスト先（Traefik 経由） |
| `INTERNAL_API_URL` | `http://api:8080` | SSR 時の内部 API URL |

### API コード内のデフォルト値

compose の `environment:` に含まれない変数は、API コード内のデフォルト値が使われます。

| 変数 | デフォルト値 | 説明 |
|------|-------------|------|
| `JWT_SECRET` | `dev-secret-key-do-not-use-in-production` | JWT 署名シークレット |
| `JWT_ACCESS_TOKEN_EXPIRES_IN` | `900` | アクセストークン有効期間（秒） |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | `604800` | リフレッシュトークン有効期間（秒） |
| `BCRYPT_ROUNDS` | `12` | bcrypt コストファクター |
| `LOG_LEVEL` | `info` | ログレベル |

ローカル開発ではこれらのデフォルト値で十分です。変更は不要です。

---

## 秘密情報の取り扱いルール

### 絶対禁止事項

| ルール | 理由 |
|--------|------|
| `.env` や秘密情報を git にコミットしない | `.env` は `.gitignore` 対象。`.env.example` のみコミット可 |
| `JWT_SECRET`、パスワード、API キーをログ出力しない | 秘密情報・個人情報の漏洩 |
| `NEXT_PUBLIC_*` 変数に秘密情報を入れない | ビルド時にブラウザバンドルに含まれ公開される |
| チャット、メール、PR コメントで秘密情報を共有しない | 秘密情報の漏洩 |

### Gitignore の対象パターン

以下は `.gitignore` に含まれており、コミットされません:

```
.env
.env.local
.env.*.local
.env.secrets
.envrc
```

### サードパーティ API キーが必要になったとき

ローカル開発で外部サービス（Stripe、SendGrid 等）の API キーが必要になった場合:

1. **`docker-compose.worktree.yml` の `environment:` に変数名を追加**し、デフォルト値はダミーにする
2. **リポジトリルートの `.env.secrets` に実際のキーを書く**
3. **チームメンバーへの共有は 1Password 等のシークレットマネージャー経由で行う**
4. **PR、チャット、メール、Issue コメントでは絶対に共有しない**
5. **誤って公開された場合は即座にキーをローテーションする**

#### `.env.secrets` の仕組み

`spawn.sh` は worktree の `.env` 生成後、リポジトリルートに `.env.secrets` が存在すればその内容を自動で追記します。これにより worktree を作るたびに手動でキーを配置する必要がありません。

```yaml
# docker-compose.worktree.yml の例
environment:
  STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-sk_test_dummy}
```

```bash
# リポジトリルートの .env.secrets（初回のみ作成、git にはコミットされない）
STRIPE_SECRET_KEY=sk_test_実際のテストキー
```

> **Note:** `.env.secrets` は `.gitignore` 対象です。Claude Code の deny rules により AI エージェントからも読み書きできません。

---

## トラブルシューティング

### DATABASE_URL の接続エラー

DB コンテナが起動していない可能性があります:

```bash
# コンテナの状態を確認
docker ps --filter "name=$(basename $(pwd))"

# DB コンテナが停止していたら再起動
./tools/contract up
```

### 環境変数を一時的に変更したい

compose の `environment:` はバージョン管理されているため、直接編集すると `git diff` にノイズが出ます。
一時的な変更は `docker compose exec` で確認してください:

```bash
# 例: ログレベルを変えて API を手動起動
docker exec -it <container-name>-api sh -c "LOG_LEVEL=debug pnpm --filter @monorepo/api dev"
```

### コンテナ内の環境変数を確認したい

```bash
docker exec <container-name>-api env | grep DATABASE_URL
```
