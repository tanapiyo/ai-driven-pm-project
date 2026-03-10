# ローカル開発のセキュリティ設定まとめ

## 1. 構成概要

このリポジトリは DevContainer + アウトバウンドファイアウォールにより、AI エージェント（Claude Code）実行時のローカルネットワークアクセスを制限しています。
ベース: https://github.com/anthropics/claude-code/.devcontainer/

---

## 2. 主な設定ファイル

| ファイル | 役割 |
|----------|------|
| .devcontainer/devcontainer.json | DevContainer メイン設定（docker-compose 使用時） |
| .devcontainer/init-firewall.sh | アウトバウンドファイアウォール初期化 |
| .devcontainer/allowlist.domains | 許可ドメインのホワイトリスト |
| .devcontainer/allowlist.readme.md | allowlist 管理ガイド |
| .devcontainer/Dockerfile | ベースイメージ（ファイアウォールツール込み） |
| docs/devcontainer.md | セットアップ・トラブルシュート |
| tools/worktree/devcontainer-gen.sh | worktree 用 DevContainer 生成（ファイアウォール有効） |

---

## 3. ファイアウォールの詳細

### ポリシー

- deny-by-default: allowlist にないドメインへの接続をブロック
- iptables + ipset: 許可ドメインの IP を ipset で管理し、iptables で制御

### 処理フロー（init-firewall.sh）

1. Docker DNS ルールを退避・復元（コンテナ DNS 維持）
2. iptables / ipset の初期化
3. ベースルール: DNS(53)、SSH(22)、localhost 許可
4. GitHub IP レンジ取得（api.github.com/meta）→ 許可
5. allowlist のドメインを DNS 解決して ipset に追加
6. ホストネットワーク（デフォルトゲートウェイのサブネット）を許可
7. 検証: example.com がブロック、api.github.com が通ることを確認

### 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| DEVCONTAINER_FIREWALL_MODE | strict | strict: 全ドメイン解決必須 / balanced: 失敗しても続行 |
| DEVCONTAINER_ALLOW_GITHUB | true | GitHub API アクセス許可 |
| DEVCONTAINER_ALLOW_SSH | true | SSH(22) 許可 |
| DEVCONTAINER_ALLOWLIST_FILE | /usr/local/etc/devcontainer/allowlist.domains | allowlist パス |

### 必要な Docker capability

    "runArgs": [
      "--cap-add=NET_ADMIN",
      "--cap-add=NET_RAW"
    ]

### allowlist の内容

- Anthropic: api.anthropic.com, sentry.io, statsig.com 等
- VS Code: marketplace.visualstudio.com, vscode.blob.core.windows.net 等
- npm: registry.npmjs.org, npmjs.org 等
- GitHub: objects.githubusercontent.com, raw.githubusercontent.com, ghcr.io 等
- Terraform: releases.hashicorp.com, registry.terraform.io 等
- AWS: awscli.amazonaws.com, s3.amazonaws.com 等

---

## 4. 適用される環境

ファイアウォールが有効になるのは worktree 用 DevContainer のみ。

- worktree (./tools/worktree/spawn.sh): devcontainer-gen.sh 生成の DevContainer で有効
- メイン docker-compose: Dockerfile.dev ベースでファイアウォールは含まれない

---

## 5. その他のセキュリティ設定

### CODEOWNERS

    /.devcontainer/init-firewall.sh   @your-org/security-team
    /.devcontainer/allowlist.domains  @your-org/security-team

### Git wrapper

.devcontainer/git-wrapper.sh が /usr/local/bin/git として配置され、--no-verify を防止

### 認証まわり

- GitHub CLI: init-gh-token.sh でホストから取得し .env.devcontainer に渡す
- Claude Code/Codex: init-claude-auth.sh でホストから認証情報を転送
- SSH: Agent Forwarding（鍵はホストに保持）

### アプリケーションセキュリティ

- .claude/rules/04-security.md: 秘密情報、SQL、認証のルール
- security-baseline スキル: 入力検証、bcrypt、パラメタライズドクエリ等

---

## 6. 同様の環境を再現する手順

### ステップ 1: ベース Docker イメージの準備

    RUN apt-get update && apt-get install -y --no-install-recommends \
      iptables \
      ipset \
      iproute2 \
      dnsutils \
      aggregate \
      jq \
      && rm -rf /var/lib/apt/lists/*

### ステップ 2: init-firewall.sh の作成

.devcontainer/init-firewall.sh をコピーし、ALLOWLIST パスなどを必要に応じて調整する。

### ステップ 3: allowlist.domains の作成

    registry.npmjs.org
    api.github.com
    api.anthropic.com

### ステップ 4: Dockerfile にコピーと権限設定

    COPY init-firewall.sh /usr/local/bin/
    COPY allowlist.domains /usr/local/etc/devcontainer/

    USER root
    RUN chmod +x /usr/local/bin/init-firewall.sh && \
      echo "node ALL=(root) NOPASSWD: /usr/local/bin/init-firewall.sh" > /etc/sudoers.d/node-firewall && \
      chmod 0440 /etc/sudoers.d/node-firewall
    USER node

### ステップ 5: devcontainer.json の設定

    "runArgs": [
      "--cap-add=NET_ADMIN",
      "--cap-add=NET_RAW"
    ],
    "containerEnv": {
      "DEVCONTAINER_FIREWALL_MODE": "strict"
    },
    "postStartCommand": "sudo /usr/local/bin/init-firewall.sh",
    "waitFor": "postStartCommand"

### ステップ 6: 診断用 Makefile（任意）

    devcontainer:firewall:status:
    	sudo iptables -L -n -v
    	sudo ipset list allowed-domains

    devcontainer:firewall:verify:
    	curl --connect-timeout 5 https://example.com && echo "FAIL" || echo "PASS"
    	curl --connect-timeout 5 https://api.github.com/zen && echo "PASS" || echo "FAIL"

### ステップ 7: 運用ポリシー

- allowlist の変更は PR で実施し、理由をコメントで記載
- 不要ドメインは定期的に削除
- strict が厳しすぎる場合は balanced へ切り替え（理由を記録）

---

## 7. 注意事項（docs/devcontainer.md より）

- DevContainer のファイアウォールは完全な防御ではない
- コンテナエスケープのリスクは残る
- ホストファイルシステムへのアクセスは制限されない
- 信頼できるリポジトリでの使用を前提とし、ホスト側のセキュリティ対策も併用する