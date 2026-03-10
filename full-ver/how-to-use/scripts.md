# scripts/ 解説

`scripts/` にはインフラ環境の構築・停止と、データ匿名化のユーティリティが格納されている。

---

## ファイル一覧

```
scripts/
├── init-environment.sh      # Worktree 環境の初期化 (メイン)
├── ensure-traefik.sh        # Traefik ネットワーク・コンテナの起動保証
├── down.sh                  # Docker Compose 環境の停止
├── anonymize-csv.js         # CSV データ匿名化 (JavaScript 版)
├── anonymize_csv.py         # CSV データ匿名化 (Python 版)
└── tests/
    ├── test-init-environment-regression.sh   # init-environment.sh のリグレッションテスト
    ├── test-init-environment-subnet.sh       # サブネット割り当てのテスト
    └── test-find-available-subnet.sh         # 空きサブネット検索のテスト
```

---

## インフラ系スクリプト

### init-environment.sh

Worktree (またはルートリポジトリ) に対して Docker Compose 環境を構築するメインスクリプト。

```bash
./scripts/init-environment.sh
```

**処理の流れ:**

1. **環境検出** -- `.git` ファイルの存在から Worktree かルートリポジトリかを判定
2. **Traefik 起動** -- `ensure-traefik.sh` を呼び出し、リバースプロキシを確保
3. **サブネット割り当て** -- `tools/worktree/lib/subnet.sh` の `find_available_subnet` で空きサブネット (172.31.x.0/24) を確保。全 3,328 スロットが埋まっている場合はエラー
4. **.env 生成** -- Docker Compose に必要な環境変数ファイルを書き出す
5. **Git Worktree 用 env 生成** -- Worktree の場合、コンテナ内で git が動くよう `GIT_DIR` / `GIT_WORK_TREE` を `.devcontainer/.env.git-worktree` に書き出す
6. **Docker Compose 起動** -- `docker-compose.worktree.yml` でサービスをビルド・起動

**生成される .env の内容:**

| 変数 | 内容 |
|------|------|
| WORKTREE | Docker Compose プロジェクト名 |
| ENDPOINT_NAME | Traefik のルーティングドメイン名 (例: `feat-login.codama-ldh`) |
| COMPOSE_PROJECT_NAME | Docker Compose プロジェクト名 |
| CONTAINER_NAME | コンテナ名のプレフィックス (例: `feat-login-db`, `feat-login-api`) |
| HOST_WORKSPACE_PATH | ホスト側のワークスペースパス |
| INTERNAL_SUBNET | Docker 内部ネットワークのサブネット |
| WEB_STATIC_IP | Web コンテナの固定 IP (Playwright の名前解決用) |
| MAIN_GIT_DIR | メインリポジトリの .git ディレクトリパス |

**依存ライブラリ:**
- `tools/worktree/lib/naming.sh` -- コンテナ名・プロジェクト名のサニタイズ
- `tools/worktree/lib/subnet.sh` -- サブネット計算・空きスロット検索

**起動後のアクセス先:**
- フロントエンド: `http://{endpoint}.localhost`
- API: `http://{endpoint}.localhost/api`
- バックエンド直接: `http://be-{endpoint}.localhost`

---

### ensure-traefik.sh

Traefik リバースプロキシのネットワークとコンテナが存在することを保証する。

```bash
./scripts/ensure-traefik.sh
```

**処理の流れ:**

1. `traefik-public` Docker ネットワークの存在確認。なければ作成
2. `traefik` コンテナの起動確認。停止中なら `infra/docker-compose.traefik.yml` で起動

**infra ディレクトリの探索:**
- まず `scripts/` の親ディレクトリで `infra/` を探す
- Worktree の場合は、メインリポジトリの `infra/` も探す

**起動後:**
- Traefik Dashboard: `http://localhost:8080`

---

### down.sh

Docker Compose 環境を停止する。

```bash
./scripts/down.sh
```

**処理:**
1. `.env` からプロジェクト名 (`WORKTREE`) を読み取る。なければディレクトリ名を使用
2. `docker compose down` でコンテナを停止・削除

---

## データ匿名化スクリプト

CSV ファイル内の機密データ (料金、実績、備考等) をダミーデータに置き換えるユーティリティ。公開リポジトリに実データを含めないために使う。JavaScript 版と Python 版の 2 つがあり、機能は同じ。

### anonymize-csv.js (JavaScript 版)

```bash
node scripts/anonymize-csv.js
```

### anonymize_csv.py (Python 版)

```bash
python3 scripts/anonymize_csv.py
```

**対象ファイル:** `demo-data-source/master_sample.csv`

**置換対象カラム:**

| カラム (0-indexed) | 内容 | 置換方法 |
|-------------------|------|---------|
| 10-12 | 出稿費 (Story/Feed/Reel) | 50万-300万のランダム金額 |
| 16 | 想定クリック数 | 500-10,000 のランダム数 |
| 17 | 案件実績 | 1-100 件のランダム数 |
| 20 | 備考 | 4 種類のテンプレートからランダム選択 |
| 25 | 獲得できたオファー価格帯 | 5 段階の価格帯からランダム選択 |

ヘッダー行 (先頭 2 行) はスキップする。

---

## テスト

`scripts/tests/` に init-environment.sh のテストスイートがある。

### test-init-environment-regression.sh

`init-environment.sh` の `prepare_env` 関数が `.env` に `CONTAINER_NAME` を正しく書き出すかを検証する (Issue #733 のリグレッション防止)。

**検証内容:**
- `get_container_name` が空でない値を返すこと
- コンテナ名がハイフンで始まらないこと (Docker の命名規則)
- 4 つのサフィックス (-db, -dev, -web, -api) を付けても有効なコンテナ名になること
- `.env` に `CONTAINER_NAME=` 行が存在すること

### test-init-environment-subnet.sh

サブネット割り当てロジックのテスト。複数 Worktree が存在する場合にサブネットが衝突しないことを検証する。

### test-find-available-subnet.sh

空きサブネットの検索ロジックのテスト。Docker ネットワークの状態に応じて正しいサブネットが割り当てられることを検証する。

## scripts/ 配下ファイル一覧（コピー用）

### ルート直下

| パス | 概要 |
|------|------|
| init-environment.sh | Worktree 用の環境初期化。サブネット検出・Traefik 確認・docker-compose.worktree.yml 用の .env 生成 |
| down.sh | Worktree の docker-compose.worktree.yml を停止。`docker compose down` を実行 |
| ensure-traefik.sh | traefik-public ネットワーク作成、Traefik コンテナが未起動なら infra/docker-compose.traefik.yml で起動 |
| anonymize-csv.js | CSV の機密データをダミーデータへ置換（Node.js 版）。料金・実績などを公開しないための匿名化 |
| anonymize_csv.py | CSV の機密データをダミーデータへ置換（Python 版）。料金・実績などを公開しないための匿名化 |

### tests/

| パス | 概要 |
|------|------|
| test-init-environment-regression.sh | init-environment.sh のリグレッションテスト。prepare_env で CONTAINER_NAME が .env に含まれることを検証（Issue #733） |
| test-init-environment-subnet.sh | init-environment.sh のサブネット関連テスト。INTERNAL_SUBNET / WEB_STATIC_IP の動的生成、validate_subnet_format 等を検証（Issue #860, #885） |
| test-find-available-subnet.sh | find_available_subnet() の単体テスト。Docker 衝突時のスロットスキップ、全スロット枯渇時のエラー等を検証（Issue #885） |

---

合計 8 ファイル。