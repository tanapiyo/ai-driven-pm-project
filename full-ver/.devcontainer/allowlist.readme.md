# Allowlist Management Guide

DevContainer のファイアウォール allowlist を管理するためのガイドです。

## 概要

[allowlist.domains](./allowlist.domains) ファイルには、devcontainer から外部接続を許可するドメインが列挙されています。**deny-by-default** のファイアウォールポリシーにより、このリストにないドメインへの接続はブロックされます。

## 変更手順

### 1. ドメイン追加が必要な状況

- 新しいパッケージレジストリへのアクセス（pypi, crates.io など）
- 社内アーティファクトリポジトリへのアクセス
- 外部 API サービスへのアクセス
- Observability サービス（Datadog, New Relic など）

### 2. 追加判断の観点

| 観点 | 確認事項 |
|------|----------|
| **最小権限** | 本当にそのドメインが必要か？代替手段はないか？ |
| **信頼性** | そのドメインは信頼できるか？HTTPS を使用しているか？ |
| **範囲** | ワイルドカードではなく、具体的なドメインを指定できるか？ |
| **期限** | 永続的に必要か？一時的な対応ではないか？ |

### 3. PR での変更

```bash
# 1. ブランチを作成
git checkout -b chore/add-allowlist-domain

# 2. allowlist.domains を編集
# コメントで理由を残す

# 3. PR を作成
# - 追加するドメインと理由を明記
# - セキュリティレビューを依頼
```

### 4. PR 記載事項

```markdown
## What
- `example-registry.com` を allowlist に追加

## Why
- 新しい dependency の取得に必要
- Issue #123 参照

## Security Considerations
- HTTPS のみ使用
- パッケージ署名を検証
- 一時的な追加ではなく、継続的に必要
```

## Stack 別の推奨ドメイン

以下は各 Stack で一般的に必要となるドメインです。必要に応じて追加してください。

### Python

```
pypi.org
files.pythonhosted.org
```

### Node.js / TypeScript

```
registry.npmjs.org
```

### Rust

```
crates.io
static.crates.io
```

### Go

```
proxy.golang.org
sum.golang.org
storage.googleapis.com
```

### Java (Maven/Gradle)

```
repo1.maven.org
plugins.gradle.org
services.gradle.org
```

### .NET

```
nuget.org
api.nuget.org
```

### Ruby

```
rubygems.org
```

## トラブルシューティング

### 通信がブロックされる

```bash
# 1. ブロックされたドメインを特定
make devcontainer:firewall:logs

# 2. DNS 解決を確認
dig +short <domain>

# 3. 必要であれば allowlist に追加（PR 経由）
```

### balanced モードへの切り替え

開発中に頻繁なブロックが発生する場合、一時的に `balanced` モードを使用できます：

```jsonc
// devcontainer.json の containerEnv で
"DEVCONTAINER_FIREWALL_MODE": "balanced"
```

> ⚠️ **注意**: balanced モードでも allowlist は必要です。DNS 解決に失敗してもエラーにならないだけです。

## セキュリティに関する注意

- allowlist の変更は必ず **PR でレビュー** を受けてください
- 不明なドメインや広範なワイルドカードは避けてください
- 定期的に使用されていないドメインを削除してください
- devcontainer のファイアウォールは **完全な防御ではありません**
  - 信頼できるリポジトリでのみ使用してください
  - ホストマシンのセキュリティ対策も併用してください
