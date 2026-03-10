# E2E 運用ガイド

このガイドでは、Playwright を使った E2E テスト環境の構成、実行方法、エージェント利用方法、トラブルシューティングを説明します。

---

## 目次

1. [環境構成](#1-環境構成)
2. [実行コマンド一覧](#2-実行コマンド一覧)
3. [スコープ切り替え方法](#3-スコープ切り替え方法)
4. [E2E エージェントの利用方法](#4-e2e-エージェントの利用方法)
5. [結果の確認方法](#5-結果の確認方法)
6. [トラブルシューティング](#6-トラブルシューティング)

---

## 1. 環境構成

### コンテナ構成

E2E テストは `docker-compose.worktree.yml` で定義された専用コンテナ構成で動作します。

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ホスト (macOS / Linux)                                                   │
│                                                                            │
│  ./tools/contract e2e ─────────────────────────────────────────────┐     │
│                                                                      │     │
│  ┌──────────────── Docker network: internal (動的サブネット) ──────┼──┐  │
│  │                                                                   │  │  │
│  │  ┌──────────────────────────┐   ┌─────────────────────────────┐  │  │  │
│  │  │  web (Next.js)           │   │  api (Hono)                  │  │  │  │
│  │  │  :3000                   │   │  :8080                       │  │  │  │
│  │  │  IP: $WEB_STATIC_IP(固定)│   │  healthcheck: /health        │  │  │  │
│  │  │  INTERNAL_API_URL=       │   │  healthcheck: ✓              │  │  │  │
│  │  │    http://api:8080       │   │                              │  │  │  │
│  │  │  rewrites: /api/* →      │   │                              │  │  │  │
│  │  │    api:8080/*            │   │                              │  │  │  │
│  │  │  healthcheck: ✓          │   │                              │  │  │  │
│  │  └──────────────────────────┘   └─────────────────────────────┘  │  │  │
│  │          ▲                                   ▲                    │  │  │
│  │          │ depends_on (healthy)              │                    │  │  │
│  │  ┌───────┴───────────────────────────────────┴──────────────────┐ │  │  │
│  │  │  playwright                                                   │ │  │  │
│  │  │  PLAYWRIGHT_BASE_URL=http://web:3000                          │ │  │  │
│  │  │  extra_hosts: web=$WEB_STATIC_IP (Chromium DNS 回避)           │ │  │  │
│  │  │  CI=true  (webServer 無効化)                                  │ │  │  │
│  │  │  shm_size: 1gb  (Chromium クラッシュ防止)                     │ │  │  │
│  │  │  command: sleep infinity  (常時待機)                          │ │  │  │
│  │  └───────────────────────────────────────────────────────────────┘ │  │  │
│  │                                                                   │  │  │
│  └───────────────────────────────────────────────────────────────────┘  │  │
│   ▲                                                                       │  │
│   └───────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### ネットワーク構成の詳細

| 設定 | 値 | 目的 |
|---|---|---|
| `internal` ネットワーク サブネット | `${INTERNAL_SUBNET:-172.31.0.0/24}` | 静的 IP 割り当てのためのサブネット定義。worktree ごとに動的割り当て |
| `web` サービス 固定 IP | `${WEB_STATIC_IP:-172.31.0.10}` | Chromium が `/etc/hosts` で直接解決できるよう固定 |
| `playwright` の `extra_hosts` | `web:${WEB_STATIC_IP:-172.31.0.10}` | Chromium の非同期 DNS リゾルバを回避して名前解決を保証 |
| `web` の `INTERNAL_API_URL` | `http://api:8080` | Next.js リライトで `/api/*` を API コンテナに転送 |
| Next.js `rewrites()` | `/api/:path*` → `api:8080/:path*` | Traefik を経由しない直接通信でも API を到達可能に |
| `CI=true` (playwright) | `true` | `playwright.config.ts` の `webServer` を無効化し競合を防止 |

### ボリューム構成

| ボリューム名 | マウント先 (コンテナ内) | 用途 |
|---|---|---|
| `playwright-report` | `/workspace/projects/apps/web/playwright-report` | HTML レポート |
| `playwright-test-results` | `/workspace/projects/apps/web/test-results` | トレース・スクリーンショット・動画 |
| `.:/workspace` | `/workspace` | ソースコード (キャッシュモード) |

### Playwright プロジェクト一覧

`projects/apps/web/playwright.config.ts` で定義されているプロジェクト:

| プロジェクト名 | ロール | 認証状態 | 備考 |
|---|---|---|---|
| `chromium` | 未認証 | なし | ログインページ等の非認証テスト |
| `chromium:planner` | planner | `e2e/.auth/planner.json` | プランナーロールのテスト |
| `chromium:agent` | agent | `e2e/.auth/agent.json` | エージェントロールのテスト |
| `chromium:admin` | admin | `e2e/.auth/admin.json` | 管理者ロールのテスト |
| `chromium:executive` | executive | `e2e/.auth/executive.json` | エグゼクティブロールのテスト |
| `setup:planner` | planner セットアップ | — | 認証状態ファイルを生成 |
| `setup:agent` | agent セットアップ | — | 認証状態ファイルを生成 |
| `setup:admin` | admin セットアップ | — | 認証状態ファイルを生成 |
| `setup:executive` | executive セットアップ | — | 認証状態ファイルを生成 |

---

## 2. 実行コマンド一覧

すべて **worktree ディレクトリ**から実行してください。

### 事前準備: 環境起動

```bash
# E2E テスト前に必ずサービスを起動する
./tools/contract up
```

`up` コマンドは web / api / db / playwright の全コンテナを起動します。

### `./tools/contract e2e` のオプション

| オプション | 値 | 説明 | デフォルト |
|---|---|---|---|
| `--scope` | `smoke` / `affected` / `full` | テスト範囲 | `smoke` |
| `--file` | `<path>` | 特定のスペックファイルを実行 (`--scope` より優先) | — |
| `--project` | `<name>` | 特定の Playwright プロジェクト/ロールを指定 | — |
| `--help` | — | ヘルプを表示 | — |

### 実行例

```bash
# デフォルト: smoke スコープで golden-route のみ実行
./tools/contract e2e

# full スコープ: 全 E2E テストを実行
./tools/contract e2e --scope full

# affected スコープ: git diff で変更されたスペックのみ実行
./tools/contract e2e --scope affected

# 特定のファイルを指定
./tools/contract e2e --file projects/apps/web/e2e/flows/planner.spec.ts

# 特定のロールで実行
./tools/contract e2e --project chromium:planner

# ファイルとロールを組み合わせる
./tools/contract e2e \
  --file projects/apps/web/e2e/flows/planner.spec.ts \
  --project chromium:planner
```

---

## 3. スコープ切り替え方法

### smoke (デフォルト — 最速)

golden-route のみを実行する最小 CI ゲートです。

```bash
./tools/contract e2e
# または明示的に:
./tools/contract e2e --scope smoke
```

**実行対象:**
- `e2e/flows/golden-route.spec.ts`

**適切な場面:**
- PR の P0 ゲートとしての素早い確認
- 重要パスのファイルに変更がない場合
- CI の smoke チェック

### affected (推奨デフォルト — git diff ベース)

`git diff --name-only --diff-filter=AMR HEAD` の結果から `e2e/` 配下のスペックファイルだけを実行します。変更がない場合は自動的に smoke にフォールバックします。

```bash
./tools/contract e2e --scope affected
```

**適切な場面:**
- 特定の機能やページを変更した場合
- 変更に関連するテストのみを高速に確認したい場合

**変更ファイル → スペックファイル のマッピング例:**

| 変更パスパターン | 実行するスペック |
|---|---|
| `projects/apps/web/src/**/dashboard*` | `dashboard.spec.ts`, `flows/golden-route.spec.ts` |
| `projects/apps/web/src/**/admin*` | `flows/golden-route.spec.ts`, `flows/admin.spec.ts` |
| `projects/apps/web/src/**/settings*` | `flows/settings.spec.ts` |
| `projects/apps/web/src/**/auth*` | `home.spec.ts`, 全セットアッププロジェクト |
| `projects/apps/api/src/**` | 最低限 `flows/golden-route.spec.ts` |
| `projects/packages/**` | full スコープ |

### full (網羅的 — オンデマンド)

全ロール・全スペックを実行します。時間がかかるため明示的な指示がある場合のみ使用してください。

```bash
./tools/contract e2e --scope full
```

**適切な場面:**
- 明示的な要求がある場合
- 大規模リファクタリング後
- リリース候補の最終確認

---

## 4. E2E エージェントの利用方法

### e2e-runner エージェントとは

`.claude/agents/e2e-runner.md` で定義された専門エージェントです。

| 項目 | 内容 |
|---|---|
| 役割 | E2E テスト実行・影響範囲の見積もり・障害分析 |
| トリガーキーワード | `e2e`, `end-to-end`, `playwright`, `smoke test`, `regression`, `browser test`, `e2e failure`, `e2e result` |
| 利用可能ツール | Bash, Read, Grep, Glob |

### 他エージェントとの役割分担

| エージェント | 担当範囲 |
|---|---|
| `e2e-runner` | E2E 実行・影響範囲見積もり・障害トリアージ |
| `test-runner` | ユニットテスト・lint・typecheck・ビルド (E2E は担当しない) |
| `qa-planner` | テスト計画設計・AC カバレッジ確認 (実行は担当しない) |

### エージェントのワークフロー

```
1. git diff --name-only origin/main...HEAD で変更ファイルを取得
2. 変更ファイル → 影響する E2E シナリオにマッピング
3. スコープを選択: smoke | affected | full
4. ./tools/contract e2e [flags] を実行
5. 失敗時: Playwright アーティファクトを読み込んでトリアージ
6. 構造化フォーマットで報告 (最大 20 行)
```

### エージェントへの指示例

```
# PR の E2E smoke チェックを依頼する
"この PR の E2E smoke テストを実行して結果を報告してください"

# 特定機能の影響範囲でテストを依頼する
"ダッシュボード機能を変更しました。affected スコープで E2E を実行してください"

# 失敗分析を依頼する
"E2E テストが失敗しています。playwright-report を確認して原因を分析してください"
```

### レポートフォーマット

エージェントは以下の形式で結果を報告します:

```markdown
## E2E Result

Scope: <smoke|affected|full>
Ran: <N> tests | Passed: <N> | Failed: <N> | Skipped: <N>
Duration: <Xs>

### P0 — Failures blocking release
- [test name] — [root cause category] — [1-line summary]

### P1 — Failures with workaround
- [test name] — [root cause category] — [1-line summary]

### P2 — Flaky / Minor
- [test name] — [root cause category] — [1-line summary]

### Recommendation
[One action item]
```

全テストが通過した場合:

```markdown
## E2E Result

Scope: smoke | Ran: 5 | All passed | Duration: 12s
```

---

## 5. 結果の確認方法

### アーティファクトの場所

E2E テスト実行後、以下のアーティファクトが生成されます:

| アーティファクト | コンテナ内パス | 説明 |
|---|---|---|
| HTML レポート | `/workspace/projects/apps/web/playwright-report/` | 実行結果の詳細レポート |
| トレースファイル | `/workspace/projects/apps/web/test-results/**/trace.zip` | ステップ毎のトレース |
| スクリーンショット | `/workspace/projects/apps/web/test-results/**/*.png` | 失敗時のスクリーンショット |
| 動画 | `/workspace/projects/apps/web/test-results/**/*.webm` | 失敗時の録画 |

### コンテナ内でアーティファクトを確認する

```bash
# HTML レポートのファイル一覧を確認
docker exec <CONTAINER_NAME>-playwright \
  ls /workspace/projects/apps/web/playwright-report/

# テスト結果のファイル一覧を確認
docker exec <CONTAINER_NAME>-playwright \
  ls /workspace/projects/apps/web/test-results/
```

`<CONTAINER_NAME>` は worktree 名に基づいて自動生成されます。`./tools/contract up:status` で確認できます。

### ホストにアーティファクトをコピーする

```bash
# HTML レポートをホストにコピー
docker compose -p <COMPOSE_PROJECT_NAME> \
  -f docker-compose.worktree.yml cp \
  <CONTAINER_NAME>-playwright:/workspace/projects/apps/web/playwright-report \
  ./playwright-report

# テスト結果をホストにコピー
docker compose -p <COMPOSE_PROJECT_NAME> \
  -f docker-compose.worktree.yml cp \
  <CONTAINER_NAME>-playwright:/workspace/projects/apps/web/test-results \
  ./test-results
```

`./tools/contract e2e` 実行後に正確なコピーコマンドが出力されます。

### HTML レポートをブラウザで確認する

```bash
# コピー後、レポートを開く
open ./playwright-report/index.html
```

---

## 6. トラブルシューティング

### サービスが起動していない

**症状:** `ERROR: Playwright container '...-playwright' is not running.`

**対処:**
```bash
# 環境を起動する
./tools/contract up

# ステータスを確認する
./tools/contract up:status
```

### web/api が healthy にならない

**症状:** `ERROR: Web service did not become healthy within 120s.`

**対処:**
```bash
# ログを確認する
./tools/contract up:logs web
./tools/contract up:logs api

# 環境を再起動する
./tools/contract up:stop
./tools/contract up
```

### 認証エラー (Login fails during setup)

**症状:** `setup:planner` などのセットアッププロジェクトがログイン時に失敗する

**対処:**
```bash
# API が起動しているか確認する
./tools/contract up:status

# シードデータを再投入する (DevContainer 内で実行)
pnpm --filter api db:seed

# 古い認証状態を削除して再生成する
docker exec <CONTAINER_NAME>-playwright \
  rm -rf /workspace/projects/apps/web/e2e/.auth
./tools/contract e2e --scope smoke
```

### セッションが期限切れ

**症状:** `Auth state file not found` または認証済みテストが `/login` にリダイレクトされる

**対処:**
```bash
# 認証状態ファイルを削除して再生成する
docker exec <CONTAINER_NAME>-playwright \
  rm -rf /workspace/projects/apps/web/e2e/.auth
./tools/contract e2e --scope smoke
```

### Playwright コンテナでの依存関係エラー

**症状:** `Cannot find module` または `pnpm install` 関連のエラー

**対処:**
```bash
# コンテナ内で依存関係を再インストールする
docker exec <CONTAINER_NAME>-playwright \
  sh -c 'cd /workspace && pnpm install --frozen-lockfile'
```

### ルートリポジトリからの誤実行

**症状:** `ERROR: You are running 'contract e2e' from the root repository.`

**対処:**
```bash
# worktree ディレクトリで実行する
cd /path/to/worktrees/<branch-name>
./tools/contract e2e
```

### Chromium クラッシュ / OOM

**症状:** `Out of memory` や `Browser closed unexpectedly`

**対処:**
- `docker-compose.worktree.yml` の `shm_size: 1gb` が設定されていることを確認してください
- Docker Desktop のメモリ制限を確認してください (推奨: 8GB 以上)

### "No role found in project metadata" エラー

**症状:** 認証済みテストを誤ったプロジェクトで実行している

**対処:**
```bash
# 誤った例: 認証プロジェクトを指定していない
./tools/contract e2e --file projects/apps/web/e2e/dashboard.spec.ts

# 正しい例: 認証プロジェクトを指定する
./tools/contract e2e \
  --file projects/apps/web/e2e/dashboard.spec.ts \
  --project chromium:planner
```

### Chromium DNS 解決失敗 (ERR_NAME_NOT_RESOLVED)

**症状:** Playwright テストが `http://web:3000` に接続できず `ERR_NAME_NOT_RESOLVED` で失敗する

**根本原因:**
Chromium は独自の非同期 DNS リゾルバを持っており、Docker の組み込み DNS（`127.0.0.11`）を経由しません。
そのため、Docker Compose のサービスディスカバリ（`web` ホスト名）を Chromium が解決できません。
また、`playwright.config.ts` の `webServer` 設定が Docker 内でも有効になると、
すでに起動している `web` サービスとポートが競合して `ERR_NAME_NOT_RESOLVED` が発生することがあります。

**修正済み対処（`docker-compose.worktree.yml` + `spawn.sh`）:**
- `internal` ネットワークにサブネット `${INTERNAL_SUBNET}` を定義し、`web` サービスに固定 IP `${WEB_STATIC_IP}` を割り当て
- `spawn.sh` が worktree_id から一意のサブネットを計算し `.env` に書き出す（範囲: `172.18.0.0/24` 〜 `172.30.255.0/24`）
- 複数 worktree の同時起動時にサブネット衝突（`Pool overlaps`）が発生しない
- `playwright` サービスに `extra_hosts: [web:${WEB_STATIC_IP}]` を追加し、`/etc/hosts` 経由で Chromium が名前解決できるように設定
- `playwright` サービスに `CI=true` を設定し、`webServer` を `undefined` にして競合を防止

**手動確認手順:**
```bash
# extra_hosts が /etc/hosts に書き込まれているか確認する
docker exec ${CONTAINER_NAME}-playwright cat /etc/hosts | grep web

# Chromium から web サービスへの疎通を確認する
docker exec ${CONTAINER_NAME}-playwright curl -s -o /dev/null -w "%{http_code}" http://web:3000
# → 200 が返れば正常
```

**設定されていない場合の対処:**
```bash
# docker-compose.worktree.yml を最新化してコンテナを再起動する
./tools/contract up:stop
./tools/contract up
```

### API 経路不在 (`/api/*` が 404 を返す)

**症状:** 認証セットアップが失敗し `POST /api/auth/login` が 404 を返す

**根本原因:**
通常、ブラウザ → Traefik → `/api/*` → `api:8080` という経路でリクエストが到達します。
しかし、Playwright が `http://web:3000` に直接アクセスする場合（コンテナ間通信）は
Traefik を経由しないため、Next.js サーバーが `/api/*` ルートを処理できずに 404 を返します。

**修正済み対処（`next.config.js` の `rewrites()`）:**
Next.js に `rewrites()` を追加し、`NODE_ENV !== 'production'` の場合に
`/api/:path*` を `INTERNAL_API_URL`（`http://api:8080`）に転送するように設定しました。

```
Playwright → http://web:3000/api/auth/login
          → Next.js rewrites() → http://api:8080/auth/login
```

`INTERNAL_API_URL` は `docker-compose.worktree.yml` の `web` サービスで
`INTERNAL_API_URL=http://api:8080` として定義されています。
本番環境（`NODE_ENV=production`）では `rewrites()` は無効になります。

**手動確認手順:**
```bash
# playwright コンテナから直接 /api/* を叩いて到達確認する
docker exec ${CONTAINER_NAME}-playwright \
  curl -s -o /dev/null -w "%{http_code}" http://web:3000/api/health
# → 200 が返れば正常（Next.js が api:8080 に転送している）
```

**設定されていない場合の対処:**
```bash
# web コンテナで INTERNAL_API_URL が設定されているか確認する
docker exec ${CONTAINER_NAME}-web env | grep INTERNAL_API_URL
# → INTERNAL_API_URL=http://api:8080 が表示されれば正常

# 設定されていなければコンテナを再起動する
./tools/contract up:stop
./tools/contract up
```

### DB 初期化マーカーの陳腐化（スキーマ変更後にシードが実行されない）

**症状:** スキーマを変更した後も API が古いデータで動作するか、DB が空の状態で起動する

**根本原因（旧仕様）:**
以前は `.db-initialized` ファイルの有無でシード済みかを判定していました。
このファイルはスキーマの変更を追跡しないため、`schema.prisma` を変更しても
シードが再実行されず、DB の状態が陳腐化していました。

**修正済み対処（スキーマハッシュ連動マーカー）:**
`api` サービスの起動コマンドを以下のように変更しました:

1. `db:generate` と `db:push` は **常に実行**（冪等なため問題なし）
2. シードのマーカーを `.db-seeded-<schema-hash>` 形式に変更
   - `schema.prisma` の md5 ハッシュをマーカー名に含める
   - スキーマが変更されるとハッシュが変わり、旧マーカーが削除されてシードが再実行される

```bash
# api サービスの起動ロジック（概略）
db:generate && db:push
SCHEMA_HASH=$(md5sum schema.prisma | cut -d' ' -f1)
if [ ! -f ".db-seeded-${SCHEMA_HASH}" ]; then
  rm -f .db-seeded-*  # 旧ハッシュのマーカーを削除
  db:seed
  touch ".db-seeded-${SCHEMA_HASH}"
fi
```

**旧マーカー `.db-initialized` との互換性:**
旧マーカー `.db-initialized` は現在のロジックでは参照されません。
ファイルが残っていても害はありませんが、明示的に削除してもかまいません。

**手動でシードを再実行する手順:**
```bash
# マーカーファイルを削除してコンテナを再起動するとシードが再実行される
docker exec ${CONTAINER_NAME}-api rm -f /workspace/.db-seeded-*
./tools/contract up:stop
./tools/contract up

# または DevContainer 内で直接シードを実行する
pnpm --filter api db:seed
```

---

## 関連ドキュメント

- [verification_runbook.md](verification_runbook.md) - 検証手順書
- [template_acceptance_criteria.md](template_acceptance_criteria.md) - 受入基準テンプレート
- [ADR-0006: Testing Strategy](../02_architecture/adr/0006_testing_strategy.md) - テスト戦略
- [E2E README](../../projects/apps/web/e2e/README.md) - E2E テストの基本情報
- [AGENTS.md](../../AGENTS.md) - Canonical Instructions
