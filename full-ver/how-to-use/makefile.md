# Makefile 解説

Makefile は Golden Commands (`./tools/contract`) と DevContainer 診断コマンドのショートカットを提供する。

---

## コマンド一覧の確認

```bash
make help
```

定義済みの全コマンドとその説明が表示される。

---

## コマンド体系

Makefile のコマンドは 2 カテゴリに分かれる。

### 1. Contract Commands (品質チェック・ビルド)

Golden Commands のショートカット。内部で `./tools/contract <cmd>` を呼ぶだけなので、直接 `./tools/contract` を実行しても同じ結果になる。

| make コマンド | 実体 | 内容 |
|--------------|------|------|
| `make format` | `./tools/contract format` | Prettier フォーマット |
| `make lint` | `./tools/contract lint` | ESLint 静的解析 |
| `make typecheck` | `./tools/contract typecheck` | TypeScript 型チェック |
| `make test` | `./tools/contract test` | Vitest ユニットテスト |
| `make build` | `./tools/contract build` | プロダクションビルド |
| `make e2e` | `./tools/contract e2e` | Playwright E2E テスト |
| `make migrate` | `./tools/contract migrate` | DB マイグレーション |
| `make deploy-dryrun` | `./tools/contract deploy-dryrun` | デプロイのドライラン |

CI 失敗時の修正順序: `make format` → `make lint` → `make typecheck` → `make test` → `make build`

### 2. DevContainer Commands (診断・検証)

DevContainer 内部で実行する診断ツール群。環境の問題を切り分ける際に使う。

#### `make devcontainer:doctor`

DevContainer 環境の総合診断。5 カテゴリをチェックする。

```
$ make devcontainer:doctor
==============================================
DevContainer Diagnostic Report
==============================================

1. Required Tools        ← 必須ツールの存在確認
   ✓ iptables, ipset, dig, jq, aggregate, gh, curl

2. DNS Resolution        ← DNS 名前解決の動作確認
   ✓ api.github.com

3. GitHub API Access     ← GitHub API への疎通確認
   ✓ GitHub Meta API accessible

4. Environment           ← 環境変数の設定状態
   DEVCONTAINER, DEVCONTAINER_FIREWALL_MODE, CLAUDE_CONFIG_DIR

5. File Permissions      ← ファイル権限の確認
   init-firewall.sh の実行権限, allowlist.domains の存在
```

**使う場面:** DevContainer 起動後に環境が正常かを確認したいとき、CI で環境起因の失敗が出たとき。

#### `make devcontainer:firewall:status`

iptables ルールと ipset (許可ドメインリスト) の現在の状態を表示する。

```bash
make devcontainer:firewall:status
```

**表示内容:**
- iptables の filter テーブルルール (入出力ルール一覧)
- ipset `allowed-domains` のエントリ (許可された IP アドレスリスト)

**使う場面:** 通信がブロックされている原因を調べたいとき。

#### `make devcontainer:firewall:verify`

ファイアウォールの動作を 3 つのテストで検証する。

| テスト | 期待結果 | 確認内容 |
|--------|---------|---------|
| example.com | ブロックされる | 許可リスト外のドメインが遮断されていること |
| api.github.com | 到達できる | GitHub API が疎通すること |
| api.anthropic.com | 到達できる | Claude API が疎通すること |

```bash
make devcontainer:firewall:verify
```

**使う場面:** ファイアウォール設定変更後の動作確認。

#### `make devcontainer:allowlist:check`

`/usr/local/etc/devcontainer/allowlist.domains` に記載された全ドメインに対して DNS 解決を試行し、結果を一覧表示する。

```bash
make devcontainer:allowlist:check
```

解決に失敗したドメインがあれば WARNING を出す。

**使う場面:** 許可リストに追加したドメインが正しく解決できるか確認したいとき。

---

## make と ./tools/contract の使い分け

どちらを使っても結果は同じ。

| 状況 | 推奨 |
|------|------|
| ターミナルで手動実行 | `make format` (短い) |
| スクリプトや CI 内 | `./tools/contract format` (明示的) |
| Claude Code エージェント内 | `./tools/contract format` (ルールで規定) |
| DevContainer 診断 | `make devcontainer:*` (Makefile のみ) |

Claude Code のルール (05-quality.md) では `./tools/contract` 経由を必須としているため、AI エージェントは `make` ではなく `./tools/contract` を使う。人間が手動で叩く分には `make` の方が短くて便利。

## 利用場所と役割
1. DevContainer 診断（主用途）
docs/devcontainer.md に「診断コマンド」として記載されており、トラブルシューティング時に手動実行する想定です

2. Golden commands
ADR-0001 で **Makefile を Golden Commands の主経路としては採用しない** とされています
pnpmと二重管理になるから
