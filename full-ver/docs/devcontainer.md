# DevContainer セットアップガイド

Node.js モノレポプロダクト開発のための devcontainer 環境を提供します。

## 目的

この devcontainer は、Node.js + TypeScript + pnpm workspace を使用したモノレポ開発に特化した環境です。
Claude Code（`--dangerously-skip-permissions`）をエージェント運用（無人実行）で安全に使用できます。

### 主な特徴

- **Node.js モノレポ最適化**: pnpm workspace、TypeScript、ESLint/Prettier 統合
- **VS Code 拡張機能**: TypeScript、React、ESLint、Prettier、OpenAPI 等がプリインストール
- **pnpm store 永続化**: 依存関係キャッシュによる高速な `pnpm install`
- **Secure-by-default**: 起動時に outbound ファイアウォールが有効化
- **Deny-by-default**: allowlist にないドメインへの接続をブロック
- **永続化**: Claude の設定、シェル履歴、pnpm store がコンテナ再作成後も維持
- **診断ツール**: トラブルシューティング用の make targets

## 技術スタック

| カテゴリ | ツール |
|---------|--------|
| Runtime | Node.js 20 |
| Package Manager | pnpm 9.15+ (corepack) |
| Language | TypeScript 5.3+ |
| Frontend | React, Next.js |
| Linter/Formatter | ESLint, Prettier |
| API | OpenAPI (コード生成) |

## 品質ゲートの実行手順

`./tools/contract` による品質ゲートはすべて **worktree + DevContainer** 内で実行する必要があります。
以下の手順に従ってください。

### ステップ 1: worktree を作成する

```bash
# Issue 番号から自動でブランチ名を生成して worktree を作成
./tools/worktree/spawn.sh implementer --issue <N>

# またはブランチ名を直接指定
./tools/worktree/spawn.sh implementer feat/my-feature-123
```

`spawn.sh` は worktree の作成と DevContainer の起動を自動的に行います。

### ステップ 2: DevContainer を起動する

`spawn.sh` は自動的に DevContainer を起動しますが、手動で起動する場合は次のいずれかを使用します。

**VS Code の場合:**

```
コマンドパレット（Cmd/Ctrl + Shift + P）→「Dev Containers: Reopen in Container」
```

または VS Code のリモートウィンドウで worktree フォルダを開いてコンテナで再度開きます。

**Dev Container CLI の場合:**

```bash
# worktree ディレクトリ内で実行
cd ./worktrees/<branch-name>
devcontainer up --workspace-folder .
```

### ステップ 3: 品質ゲートを実行する

worktree ディレクトリ内（または DevContainer 内）でコマンドを実行します。

```bash
cd ./worktrees/<branch-name>

./tools/contract format     # フォーマット（自動修正）
./tools/contract lint       # 静的解析
./tools/contract typecheck  # 型チェック
./tools/contract test       # ユニットテスト
./tools/contract build      # ビルド
```

**注意**: `./tools/contract` は main リポジトリ直下から実行すると以下のエラーが発生します。

```
ERROR: devcontainer_exec must be run from a worktree directory.
```

このエラーが出た場合は、ステップ 1 に戻って worktree を作成してください。

### ステップ 4: 作業が完了したら worktree をクリーンアップする

```bash
./tools/worktree/cleanup.sh <branch-name>
```

---

## 起動手順

### VS Code

1. [Dev Containers 拡張機能](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) をインストール
2. リポジトリを開く
3. コマンドパレット（`Cmd/Ctrl + Shift + P`）で「Dev Containers: Reopen in Container」を選択
4. ビルド完了後、自動的にファイアウォールが適用される

### Cursor

1. リポジトリを開く
2. コマンドパレットで「Dev Containers: Reopen in Container」を選択
3. ビルド完了後、自動的にファイアウォールが適用される

### Dev Container CLI

```bash
# インストール
npm install -g @devcontainers/cli

# 起動
devcontainer up --workspace-folder .

# 接続
devcontainer exec --workspace-folder . bash
```

## 永続化

### pnpm Store

- **保存場所**: `/home/node/.local/share/pnpm`
- **永続化方法**: named volume (`devcontainer-pnpm-store-${devcontainerId}`)
- **環境変数**: `PNPM_HOME=/home/node/.local/share/pnpm`

pnpm の依存関係キャッシュはコンテナを Rebuild しても維持されます。
これにより、再ビルド後の `pnpm install` が高速に完了します。

### Claude 設定

- **保存場所**: `/home/node/.claude`
- **永続化方法**: named volume (`devcontainer-claude-config-${devcontainerId}`)
- **環境変数**: `CLAUDE_CONFIG_DIR=/home/node/.claude`

Claude の認証情報、設定ファイルはコンテナを Rebuild しても維持されます。

### シェル履歴

- **保存場所**: `/commandhistory/.bash_history`
- **永続化方法**: named volume (`devcontainer-bashhistory-${devcontainerId}`)

### Git 設定の共有

ホストマシンの Git 設定（`user.name`, `user.email`）は自動的にコンテナ内に共有されます。

**仕組み:**

- `ghcr.io/devcontainers/features/common-utils` feature がホストの Git 設定を転送
- `ghcr.io/devcontainers/features/git` feature で最新の Git をインストール

**確認方法:**

```bash
# コンテナ内で実行
git config --global user.name
git config --global user.email
```

### GitHub CLI 認証

ホストマシンの `gh auth` 認証情報は自動的にコンテナ内に共有されます。

**前提条件:**

ホストマシンで GitHub CLI にログイン済みであること:

```bash
# ホストマシンで実行
gh auth login
gh auth status  # 確認
```

**コンテナ内での確認:**

```bash
# コンテナ内で実行
gh auth status
```

**仕組み:**

1. DevContainer 起動時に `initializeCommand` でホスト側の `gh auth token` を取得
2. 取得したトークンを `.devcontainer/.env.devcontainer` に書き出し
3. `--env-file` オプションでコンテナに `GH_TOKEN` 環境変数として渡す
4. `ghcr.io/devcontainers/features/github-cli` feature で `gh` コマンドをインストール

**関連ファイル:**

- `.devcontainer/init-gh-token.sh` - トークン取得スクリプト
- `.devcontainer/.env.devcontainer` - 生成されるenv ファイル（gitignore済み）

### SSH Agent Forwarding

ホストマシンの SSH 鍵をコンテナ内で使用して `git push` できます。

**前提条件（ホストで実行）:**

```bash
# SSH agent に鍵が登録されているか確認
ssh-add -l

# もし "The agent has no identities." と出たら鍵を追加
# macOS の場合
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
# または
ssh-add ~/.ssh/id_rsa
```

**コンテナ内での確認:**

```bash
# SSH agent が転送されているか確認
ssh-add -l

# GitHub への接続テスト
ssh -T git@github.com
```

**仕組み:**

- ホストの `SSH_AUTH_SOCK` をコンテナにマウント
- コンテナ内の `SSH_AUTH_SOCK` 環境変数でソケットを参照
- SSH 鍵自体はホストにあり、コンテナには転送されない（セキュア）

## ファイアウォール

### モード

| モード | 説明 |
|--------|------|
| `strict`（デフォルト） | 全ての allowlist ドメインが解決できない場合、初期化失敗 |
| `balanced` | DNS 解決に失敗してもエラーにならず続行 |

モード変更:

```jsonc
// .devcontainer/devcontainer.json
"containerEnv": {
  "DEVCONTAINER_FIREWALL_MODE": "balanced"
}
```

### Allowlist 変更

[.devcontainer/allowlist.domains](../.devcontainer/allowlist.domains) を編集してください。

**変更手順:**

1. ブランチを作成
2. `allowlist.domains` にドメインを追加
3. PR を作成（理由を明記）
4. レビュー後にマージ

詳細は [allowlist.readme.md](../.devcontainer/allowlist.readme.md) を参照。

### 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `DEVCONTAINER_FIREWALL_MODE` | `strict` | `strict` または `balanced` |
| `DEVCONTAINER_ALLOW_GITHUB` | `true` | GitHub API へのアクセス許可 |
| `DEVCONTAINER_ALLOW_SSH` | `true` | SSH (port 22) へのアクセス許可 |
| `DEVCONTAINER_ALLOWLIST_FILE` | `/usr/local/etc/devcontainer/allowlist.domains` | allowlist ファイルパス |

## 診断コマンド

```bash
# 環境診断
make devcontainer:doctor

# ファイアウォール状態確認
make devcontainer:firewall:status

# ブロックされた通信のログ
make devcontainer:firewall:logs

# ファイアウォール動作検証
make devcontainer:firewall:verify

# allowlist ドメインの DNS 解決チェック
make devcontainer:allowlist:check
```

## トラブルシューティング

### `devcontainer_exec must be run from a worktree directory`

このエラーは `./tools/contract` を main リポジトリの直下で実行した場合に発生します。
Contract コマンドは worktree + DevContainer 内でのみ実行できます。

**解決手順:**

```bash
# 1. worktree を作成する（まだ存在しない場合）
./tools/worktree/spawn.sh implementer --issue <N>

# 2. worktree ディレクトリに移動する
cd ./worktrees/<branch-name>

# 3. contract コマンドを再実行する
./tools/contract lint
```

詳細は[品質ゲートの実行手順](#品質ゲートの実行手順)を参照してください。

---

### `permission denied while trying to connect to the Docker daemon socket`

このエラーは Docker daemon に接続する権限がない場合に発生します。

**macOS の場合:**

1. Docker Desktop が起動しているか確認する
2. 起動していない場合は Docker Desktop を起動する
3. 起動していても解決しない場合は Docker Desktop を再起動する

```bash
# 動作確認（エラーなく出力されれば OK）
docker info
```

**Linux の場合:**

現在のユーザーを `docker` グループに追加する必要があります。

```bash
# docker グループにユーザーを追加
sudo usermod -aG docker $USER

# 変更を即時適用（ログアウト不要）
newgrp docker

# または一度ログアウトしてログインし直す
```

グループ変更後に確認:

```bash
# エラーなく出力されれば OK
docker info
```

**DevContainer 内でこのエラーが出る場合:**

DevContainer 内で Docker コマンドを実行している場合（Docker-in-Docker）、
`.devcontainer/devcontainer.json` の `runArgs` に以下が設定されているか確認してください。

```jsonc
"runArgs": [
  "--cap-add=NET_ADMIN",
  "--cap-add=NET_RAW"
]
```

---

### 通信がブロックされる

```bash
# 1. ファイアウォールが有効か確認
make devcontainer:firewall:status

# 2. ブロックされているドメインを特定
# エラーメッセージからドメインを確認

# 3. DNS 解決を確認
dig +short <domain>

# 4. 必要であれば allowlist に追加（PR 経由）
```

### iptables の権限エラー

devcontainer は `NET_ADMIN` と `NET_RAW` の capability が必要です。

```jsonc
// devcontainer.json で確認
"runArgs": [
  "--cap-add=NET_ADMIN",
  "--cap-add=NET_RAW"
]
```

### WSL での問題

WSL2 環境では、Docker Desktop のネットワーク設定が影響する場合があります。

```bash
# WSL のネットワークモードを確認
wsl --status

# Docker Desktop の設定で「Use the WSL 2 based engine」を確認
```

### プロキシ環境

企業プロキシ環境では追加設定が必要な場合があります。

```jsonc
// devcontainer.json に追加
"containerEnv": {
  "HTTP_PROXY": "http://proxy.example.com:8080",
  "HTTPS_PROXY": "http://proxy.example.com:8080",
  "NO_PROXY": "localhost,127.0.0.1"
}
```

プロキシを経由する場合、プロキシサーバー自体を allowlist に追加する必要があります。

### DNS 解決の問題

```bash
# 1. Docker DNS が動作しているか確認
cat /etc/resolv.conf

# 2. 外部 DNS で直接解決
dig @8.8.8.8 api.github.com

# 3. Docker Desktop の DNS 設定を確認（GUI）
```

### postStartCommand の失敗

```bash
# ログを確認
# VS Code: 「Dev Containers: Show Container Log」

# 手動でファイアウォールを再実行
sudo /usr/local/bin/init-firewall.sh
```

## YOLO モード（headless 無人実行）

DevContainer 内で Claude Code と Codex CLI を完全無人で実行するモードです。

### 前提条件

1. **Claude Code OAuth トークン**の生成（ホストで1回実行）:
   ```bash
   # ホストマシンで実行（対話的、TTY 必須）
   claude setup-token
   ```
   出力されたトークンを `.devcontainer/.env.devcontainer` に追加:
   ```
   CLAUDE_CODE_OAUTH_TOKEN=<生成されたトークン>
   ```

2. **Codex CLI 認証**（任意、ホストで1回実行）:
   ```bash
   # ホストマシンで実行
   codex login
   ```
   認証情報は DevContainer 起動時に自動転送されます。

3. **GitHub CLI 認証**（既存の仕組み）:
   ```bash
   # ホストマシンで実行
   gh auth login
   ```

### セットアップフロー

```
ホスト                          DevContainer
├── claude setup-token          ├── CLAUDE_CODE_OAUTH_TOKEN 環境変数
│   → .env.devcontainer         │   → 自動注入
├── codex login                 ├── ~/.codex/auth.json
│   → ~/.codex/auth.json        │   → init-claude-auth.sh がコピー
├── gh auth login               ├── GH_TOKEN 環境変数
│   → init-gh-token.sh          │   → 自動注入
└── SSH Agent                   └── SSH_AUTH_SOCK
    → 自動フォワード                → git push 可能
```

### 使い方

```bash
# DevContainer 内から実行
/autopilot --yolo #123

# または max-turns を指定
/autopilot --yolo --max-turns 50 #123
```

`DEVCONTAINER=true` 環境変数が設定されている場合、`--yolo` フラグなしでも自動的に YOLO モードが有効になります。

### コスト制御

| パラメータ | デフォルト | 説明 |
|-----------|-----------|------|
| `--max-turns` | 30 | エージェントループの最大ターン数 |
| `--max-budget-usd` | - | API コスト上限（ドル、Claude Code v2.1+） |

### 安全ガード

YOLO モードでも以下の安全メカニズムは維持されます:

1. **DevContainer ファイアウォール**: deny-by-default、allowlist にないドメインへの通信はブロック
2. **worktree 隔離**: main ブランチへの直接編集は不可
3. **品質ゲート**: format → lint → typecheck → test → build は省略不可
4. **`--max-turns` 制限**: コスト暴走防止
5. **Git Safety**: force push、main への直接 push は DevContainer 内でもブロック

### トラブルシューティング

#### Claude Code が「Not logged in」になる

```bash
# トークンが設定されているか確認
echo $CLAUDE_CODE_OAUTH_TOKEN | head -c 20
# 出力が空の場合、ホストで claude setup-token を再実行
```

#### Codex CLI が未認証になる

```bash
# コンテナ内で確認
codex login status
# 「Not logged in」の場合、ホストで codex login を再実行し、コンテナを Rebuild
```

#### トークンの有効期限

| ツール | 有効期限 | 更新方法 |
|--------|---------|---------|
| Claude Code (`setup-token`) | 1年 | ホストで `claude setup-token` を再実行 |
| Codex CLI | セッションベース | ホストで `codex login` を再実行 |
| GitHub (`gh auth`) | 長期 | ホストで `gh auth refresh` |

### Phase ロードマップ

| Phase | 内容 | 状態 |
|-------|------|------|
| **Phase 1** | Claude Code OAuth 転送 + YOLO フラグ + 運用ドキュメント | ✅ 完了 |
| **Phase 2** | 監査ログ（JSONL 構造化ログ）、エフェメラルコンテナ化 | 計画中 |
| **Phase 3** | プロキシ型キー管理、MCP ゲートウェイ | 構想 |

### 関連ファイル

| ファイル | 説明 |
|----------|------|
| `.devcontainer/init-claude-auth.sh` | ホスト側: Claude/Codex 認証情報の転送 |
| `.devcontainer/setup-ai-auth.sh` | コンテナ側: 認証情報のセットアップ |
| `.devcontainer/init-gh-token.sh` | ホスト側: GitHub トークンの転送 |
| `.claude/commands/autopilot.md` | autopilot コマンド（`--yolo` フラグ） |
| `docs/00_process/agent_operating_model.md` | YOLO モード設定定義 |

## セキュリティに関する注意

### DevContainer の限界

- DevContainer のファイアウォールは **完全な防御ではありません**
- コンテナエスケープの脆弱性が存在する可能性があります
- ホストファイルシステムへのアクセスは制限されていません

### 推奨事項

1. **信頼できるリポジトリでのみ使用**
   - 不明なソースのコードを devcontainer で実行しない
   
2. **定期的な更新**
   - ベースイメージと Claude Code を定期的に更新
   
3. **多層防御**
   - ホストマシンのセキュリティ対策も併用
   - 機密情報をコンテナ内に保存しない

4. **監査**
   - allowlist の変更を PR でレビュー
   - 定期的に不要なドメインを削除

## 関連ファイル

| ファイル | 説明 |
|----------|------|
| [.devcontainer/devcontainer.json](../.devcontainer/devcontainer.json) | メイン設定 |
| [.devcontainer/Dockerfile](../.devcontainer/Dockerfile) | コンテナイメージ定義 |
| [.devcontainer/init-firewall.sh](../.devcontainer/init-firewall.sh) | ファイアウォール初期化スクリプト |
| [.devcontainer/allowlist.domains](../.devcontainer/allowlist.domains) | 許可ドメインリスト |
| [.devcontainer/allowlist.readme.md](../.devcontainer/allowlist.readme.md) | allowlist 管理ガイド |

## プリインストール VS Code 拡張機能

### 開発効率化

| 拡張機能 | 用途 |
|----------|------|
| `esbenp.prettier-vscode` | Prettier フォーマッター |
| `dbaeumer.vscode-eslint` | ESLint 統合 |
| `ms-vscode.vscode-typescript-next` | TypeScript 最新機能 |
| `christian-kohler.path-intellisense` | パス補完 |
| `christian-kohler.npm-intellisense` | npm パッケージ補完 |
| `usernamehw.errorlens` | インラインエラー表示 |

### React / Frontend

| 拡張機能 | 用途 |
|----------|------|
| `dsznajder.es7-react-js-snippets` | React スニペット |
| `styled-components.vscode-styled-components` | styled-components 対応 |

### API 開発

| 拡張機能 | 用途 |
|----------|------|
| `42Crunch.vscode-openapi` | OpenAPI エディタ |
| `Arjun.swagger-viewer` | Swagger UI プレビュー |

### その他

| 拡張機能 | 用途 |
|----------|------|
| `anthropic.claude-code` | Claude Code |
| `eamodio.gitlens` | Git 拡張 |
| `vitest.explorer` | Vitest テストランナー |
| `ms-azuretools.vscode-docker` | Docker 統合 |

## リファレンス

- [anthropics/claude-code devcontainer](https://github.com/anthropics/claude-code/tree/main/.devcontainer) - 本実装のベース
- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [Dev Container CLI](https://github.com/devcontainers/cli)
- [pnpm](https://pnpm.io/) - 高速なパッケージマネージャー
