# API サービス (Express 5.x) の本番用 Dockerfile
# ビルドコンテキスト: projects/ (モノレポルート)
# 実行例: docker build -t api -f apps/api/Dockerfile .
#
# マルチステージビルドで本番イメージサイズを最小化:
#   deps    - 全依存関係をインストール (ビルドツール用の devDeps 含む)
#   builder - Prisma クライアント生成、tsup でビルド
#   runner  - コンパイル済み出力のみの最小本番イメージ
#
# ADR-0013: Hono から Express 5.x に移行済み
# - エントリーポイント: src/presentation/express/server.ts
# - OpenAPI バリデーション: express-openapi-validator (YAML を実行時に直接読む)

# ---- ベースステージ ----
FROM node:20-slim AS base

# OpenSSL (Prisma が必要) と pnpm をインストール
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@9

WORKDIR /app

# ---- 依存関係ステージ ----
FROM base AS deps

# モノレポルートからワークスペースマニフェストをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/shared/package.json ./packages/shared/

# 全依存関係をインストール (ビルドツールに devDeps が必要)
RUN pnpm install --frozen-lockfile

# ---- ビルドステージ ----
FROM deps AS builder

# ルートの tsconfig.json をコピー (apps/api/tsconfig.json が extends している)
COPY tsconfig.json ./

# ビルドに必要な全ソースコードをコピー
COPY apps/api/ ./apps/api/
COPY packages/ ./packages/

WORKDIR /app/apps/api

# Prisma クライアントを生成 (出力先: prisma/generated/prisma/)
RUN pnpm exec prisma generate --schema=./prisma/schema.prisma

# tsup で Express サーバーをビルド (出力先: dist/)
# Docker 専用の tsup 設定を生成してワークスペースパッケージ (@monorepo/shared) をバンドル
# shared は生の .ts をエクスポートしており、素の Node.js では実行時に読めないため
RUN printf 'export default {\n  entry: ["src/presentation/express/server.ts"],\n  format: ["esm"],\n  dts: true,\n  noExternal: ["@monorepo/shared"],\n};\n' > tsup.config.ts && pnpm exec tsup

# ---- 本番ステージ ----
FROM node:20-slim AS runner

WORKDIR /app

# OpenSSL をインストール (Prisma が実行時に必要)
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# セキュリティのため非 root ユーザーを作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeapp

# 本番依存関係インストール用に pnpm をインストール
RUN npm install -g pnpm@9

# ワークスペースマニフェストをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# 本番依存関係のみインストール
RUN pnpm install --frozen-lockfile --prod

# ビルド済み出力をコピー
COPY --from=builder --chown=nodeapp:nodejs /app/apps/api/dist ./apps/api/dist

# Prisma スキーマと生成クライアントをコピー (@prisma/client が実行時に必要)
COPY --from=builder --chown=nodeapp:nodejs /app/apps/api/prisma ./apps/api/prisma

# OpenAPI スペックをコピー (express-openapi-validator が実行時に YAML を読む)
# tsup バンドル後の __dirname パス解決により /packages/api-contract/ に配置
COPY --from=builder --chown=nodeapp:nodejs /app/packages/api-contract/openapi.yaml /packages/api-contract/openapi.yaml

USER nodeapp

WORKDIR /app/apps/api

# アプリケーションポートを公開 (PORT 環境変数で設定可能)
EXPOSE 3000

# 環境変数 (docker run -e または docker-compose の environment で設定)
# 実行時に必要:
#   DATABASE_URL  - PostgreSQL 接続文字列
#   JWT_SECRET    - JWT 署名用シークレット
#   PORT          - (任意) サーバーポート、デフォルト 3000
#   NODE_ENV      - (任意) 環境名
ENV NODE_ENV=production
ENV PORT=3000

# Express サーバーを起動
CMD ["node", "dist/server.js"]
