# Web サービス (Next.js) の本番用 Dockerfile
# ビルドコンテキスト: projects/ (モノレポルート)
# 実行例: docker build -t web -f apps/web/Dockerfile .
#
# Next.js standalone 出力を使ったマルチステージビルド (next.config.js で設定済み):
#   deps    - 全依存関係をインストール (ビルドに devDeps が必要)
#   builder - next build を実行 (standalone バンドルを .next/standalone/ に出力)
#   runner  - standalone バンドルのみの最小本番イメージ

# ---- ベースステージ ----
FROM node:20-slim AS base

# pnpm をインストール
RUN npm install -g pnpm@9

WORKDIR /app

# ---- 依存関係ステージ ----
FROM base AS deps

# モノレポルートからワークスペースマニフェストをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/api-contract/package.json ./packages/api-contract/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# 全依存関係をインストール (Next.js ビルドに devDeps が必要)
RUN pnpm install --frozen-lockfile

# ---- ビルドステージ ----
FROM deps AS builder

# ルートの tsconfig.json をコピー (apps/web/tsconfig.json が extends している)
COPY tsconfig.json ./

# ビルドに必要な全ソースコードをコピー
COPY apps/web/ ./apps/web/
COPY packages/ ./packages/

WORKDIR /app/apps/web

# Next.js アプリケーションをビルド
# next.config.js の output: 'standalone' により自己完結型バンドルが生成される
RUN pnpm run build

# ---- 本番ステージ ----
FROM node:20-slim AS runner

WORKDIR /app

# セキュリティのため非 root ユーザーを作成
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone 出力をコピー (最小限の自己完結型 Next.js サーバーバンドル)
# standalone 出力には必要な node_modules がすべて含まれている
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# 静的アセットをコピー (クライアントサイドレンダリング用の CSS、JS バンドル)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

# アプリケーションポートを公開 (PORT 環境変数で設定可能)
EXPOSE 3000

# 環境変数 (docker run -e または docker-compose の environment で設定)
# 実行時に必要:
#   NEXT_PUBLIC_API_URL - ブラウザリクエスト用の公開 API URL (例: https://api.example.com)
#   INTERNAL_API_URL    - サーバーサイドリクエスト用の内部 API URL (例: http://api:8080)
#   PORT                - (任意) サーバーポート、デフォルト 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# standalone Next.js サーバーを起動
CMD ["node", "apps/web/server.js"]
