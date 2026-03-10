# Initial Setup Runbook

このテンプレートリポジトリを使って新しいプロジェクトを開始するための手順書です。

> **Note**: このランブックは元のテンプレートリポジトリ `matsuokah/vibecoding-repository-template` 用です。
> このリポジトリはこのテンプレートから派生したプロダクトリポジトリです。
> 以下の手順は新規プロジェクト作成時の参考として保持しています。

---

## Overview

```
[Template Clone] → [Project設定] → [DevContainer起動] → [開発開始]
```

---

## Technology Stack

このリポジトリは **Node.js + TypeScript + React** に特化しています。

- **Runtime**: Node.js
- **Language**: TypeScript
- **Package Manager**: pnpm (workspace)
- **Backend**: Hono
- **Frontend**: React

---

## Phase 1: リポジトリ作成

### Option A: GitHub の "Use this template" を使用

1. GitHub で [matsuokah/vibecoding-repository-template](https://github.com/matsuokah/vibecoding-repository-template) を開く
2. "Use this template" → "Create a new repository" をクリック
3. リポジトリ名、公開設定を入力
4. "Create repository" をクリック

### Option B: CLI を使用

```bash
# GitHub CLI を使用
gh repo create my-project --template matsuokah/vibecoding-repository-template --private

# または手動でクローン
git clone https://github.com/matsuokah/vibecoding-repository-template.git my-project
cd my-project
rm -rf .git
git init
git remote add origin <your-repo-url>
```

---

## Phase 2: プロジェクト情報の設定

### 1. README.md の更新

```bash
# README.md を開いて以下を置換
# {{project.name}} → 実際のプロジェクト名
# {{project.short_description}} → プロジェクトの説明
# {{license}} → ライセンス
```

### 2. Product Identity の記入

```bash
# docs/01_product/identity.md を編集
# Vision, Mission, Principles, Positioning を記入
```

### 3. PRD の記入

```bash
# docs/01_product/prd.md を編集
# Background, Goals, User Stories 等を記入
```

### 4. package.json の更新

```bash
# projects/package.json の name, description を更新
```

---

## Phase 3: DevContainer の起動

### VSCode / Cursor の場合

1. VSCode/Cursor でプロジェクトを開く
2. Command Palette (Cmd+Shift+P) を開く
3. "Dev Containers: Reopen in Container" を選択
4. コンテナが起動するまで待つ（初回は数分かかる）

### CLI の場合

```bash
# devcontainer CLI がインストールされている場合
devcontainer up --workspace-folder .
devcontainer exec --workspace-folder . bash
```

---

## Phase 4: 依存関係のインストール

DevContainer 内で以下を実行:

```bash
cd projects
pnpm install
```

---

## Phase 5: 動作確認

DevContainer 内で以下を実行:

```bash
# Contract コマンドの確認
./tools/contract lint
./tools/contract test
./tools/contract build

# Policy の確認
./tools/policy/check_required_artifacts.sh
```

すべて成功すれば準備完了です！

---

## Phase 6: Git の設定

```bash
# 初期コミット
git add .
git commit -m "chore: initial project setup"

# リモートにプッシュ
git push -u origin main
```

---

## Next Steps

1. **最初の Spec を書く**
   - `.specify/specs/001_first_feature/spec.md` を作成
   - FR, NFR, AC を定義

2. **ADR を書く**
   - 重要な技術決定がある場合、ADR を追加

3. **開発を開始**
   - Spec に基づいて実装
   - PR テンプレートを使用

---

## Troubleshooting

### DevContainer が起動しない

```bash
# Docker が起動しているか確認
docker ps

# Docker のリソースを解放
docker system prune -a
```

### Contract コマンドが失敗する

```bash
# スクリプトの実行権限を確認
ls -la tools/contract

# 依存のインストールを確認
cd projects && pnpm install
```

### Policy Check が失敗する

```bash
# 不足ファイルを確認
./tools/policy/check_required_artifacts.sh

# 必要なファイルを作成
```

---

## Checklist

- [ ] リポジトリを作成した
- [ ] README.md を更新した
- [ ] Product Identity を記入した
- [ ] DevContainer が起動した
- [ ] 依存関係をインストールした
- [ ] Contract コマンドが動作した
- [ ] 初期コミットをプッシュした

---

## Links

- [AGENTS.md](../../AGENTS.md) - Canonical Instructions
- [docs/00_process/process.md](process.md) - 開発プロセス
- [docs/03_quality/verification_runbook.md](../03_quality/verification_runbook.md) - 検証手順
