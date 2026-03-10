# Docker Compose 開発環境

apps 配下のプロダクトを一括で docker-compose で起動し、デバッグできる環境を提供します。

## 概要

各技術スタック（node-ts_pnpm, python_ruff_pytest）に対応した docker-compose 設定が scaffold 時に自動生成されます。

### 対応スタック

| Stack | アプリポート | デバッグポート | デバッグプロトコル |
|-------|-------------|---------------|-------------------|
| node-ts_pnpm | 3000 | 9229 | Node.js Inspector |
| python_ruff_pytest | 8000 | 5678 | debugpy (DAP) |
| gas_clasp | N/A | N/A | ローカル起動なし |

---

## クイックスタート

### 1. 開発サーバー起動

```bash
./tools/contract dev
```

これにより:
- `projects/docker-compose.yaml` に定義されたサービスがビルド・起動
- ホットリロードが有効
- デバッグポートが公開

### 2. ログ確認

```bash
./tools/contract dev:logs
```

特定のサービスのみ:
```bash
./tools/contract dev:logs api
```

### 3. 停止

```bash
./tools/contract dev:stop
```

---

## VS Code デバッグ

### Node.js (node-ts_pnpm)

1. `./tools/contract dev` でサーバー起動
2. VS Code で `Run and Debug` (Cmd/Ctrl + Shift + D)
3. `Attach to Docker (API)` を選択して実行
4. ブレークポイントを設定してデバッグ

### Python (python_ruff_pytest)

1. `./tools/contract dev` でサーバー起動
2. VS Code で `Run and Debug` (Cmd/Ctrl + Shift + D)
3. `Attach to Docker (debugpy)` を選択して実行
4. ブレークポイントを設定してデバッグ

### ワンクリック起動

`Start Docker & Attach` を使用すると、docker-compose 起動とデバッガーアタッチを一度に行えます。

---

## ファイル構成

### Node.js スタック

```
projects/
├── docker-compose.yaml           # サービス定義
├── docker-compose.override.yaml  # ローカルオーバーライド（gitignore）
├── apps/
│   └── api/
│       ├── Dockerfile.dev        # 開発用Dockerfile
│       ├── package.json
│       └── src/
└── .vscode/
    ├── launch.json               # デバッグ設定
    └── tasks.json                # タスク設定
```

### Python スタック

```
projects/
├── docker-compose.yaml
├── Dockerfile.dev
├── pyproject.toml
├── src/
│   └── app/
│       ├── main.py
│       └── server.py
└── .vscode/
    ├── launch.json
    └── tasks.json
```

---

## カスタマイズ

### 新しいサービスを追加

`docker-compose.yaml` を編集:

```yaml
services:
  # 既存のapi
  api:
    # ...
  
  # 新しいwebサービス
  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile.dev
    ports:
      - "5173:5173"
    volumes:
      - ./apps/web/src:/app/src:cached
    depends_on:
      - api
    networks:
      - app-network
```

### ローカルオーバーライド

`docker-compose.override.yaml` を作成（gitignore済み）:

```yaml
services:
  api:
    environment:
      - API_KEY=your-local-key
    ports:
      - "3001:3000"  # 別ポートを使用
```

### データベースを追加

`docker-compose.yaml` のコメントアウトされた `db` サービスを有効化:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: monorepo-db
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: devuser
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: devdb
    volumes:
      - db_data:/var/lib/postgresql/data
    networks:
      - app-network

volumes:
  db_data:
```

---

## トラブルシューティング

### ポートが既に使用されている

```bash
# 使用中のプロセスを確認
lsof -i :3000

# または docker-compose.override.yaml で別ポートを指定
```

### デバッガーがアタッチできない

1. コンテナが起動していることを確認: `./tools/contract dev:logs`
2. デバッグポートが正しく公開されているか確認:
   ```bash
   docker compose ps
   ```
3. ファイアウォール設定を確認

### ホットリロードが効かない

ボリュームマウントが正しく設定されているか確認:
```bash
docker compose exec api ls -la /app/src
```

### コンテナがすぐ終了する

ログを確認:
```bash
./tools/contract dev:logs --tail 50
```

---

## 関連ドキュメント

- [ADR-0002: Docker Compose for Apps](02_architecture/adr/0002_docker_compose_for_apps.md)
- [DevContainer セットアップ](devcontainer.md)
- [Contract コマンド](../AGENTS.md#golden-commands)
