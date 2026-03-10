# Git Hooks / イベントドリブンハーネス設定ガイド

このリポジトリには 3 層のイベントドリブンなフック機構がある。

---

## 目次

1. [全体構成と有効状態](#全体構成と有効状態)
2. [Husky (.husky/)](#husky-husky)
3. [カスタム Git Hooks (.git-hooks/)](#カスタム-git-hooks-git-hooks)
4. [Claude Code Hooks (.claude/hooks/)](#claude-code-hooks-claudehooks)
5. [Commitlint (commitlint.config.js)](#commitlint-commitlintconfigjs)
6. [lint-staged (projects/package.json)](#lint-staged-projectspackagejson)
7. [フック間の関係図](#フック間の関係図)

---

## 全体構成と有効状態

| 層 | ディレクトリ | トリガー | 現在の有効状態 |
|----|------------|----------|---------------|
| Husky | `.husky/` | git commit / git push | 有効 (`prepare` スクリプトでインストール) |
| カスタム Git Hooks | `.git-hooks/` | git commit / git push | 未有効 (`core.hooksPath` 未設定) |
| Claude Code Hooks | `.claude/hooks/` | Claude Code のツール実行前後 | 有効 (`settings.json` で定義) |

### 有効化の仕組み

- **Husky**: `package.json` の `"prepare": "husky"` で `npm install` 時に自動インストールされる。`.husky/` 内のスクリプトが `.git/hooks/` にシンボリックリンクされる。
- **カスタム Git Hooks**: `git config core.hooksPath .git-hooks` を実行すると有効化できるが、現状未設定のため動作しない。Husky と排他的関係にある (同時に使えない)。
- **Claude Code Hooks**: `.claude/settings.json` の hooks セクションで定義。Claude Code 内でのみ動作する。

---

## Husky (.husky/)

Husky v9 による git フック管理。

### インストール

```json
// package.json (ルート)
{
  "scripts": {
    "prepare": "husky"
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "@commitlint/cli": "^19.0.0",
    "@commitlint/config-conventional": "^19.0.0"
  }
}
```

`npm install` または `pnpm install` 実行時に `prepare` スクリプトが走り、Husky が `.git/hooks/` にフックを登録する。

### .husky/commit-msg

**トリガー:** `git commit` 実行時 (コミットメッセージ入力後)

**処理内容:** commitlint でコミットメッセージの形式を検証する。

```sh
npx --no -- commitlint --edit $1
```

Conventional Commits 形式に合致しないメッセージは拒否される。

### .husky/pre-commit

**トリガー:** `git commit` 実行時 (コミット作成前)

**処理内容:** 4 つのチェックを順番に実行する。

#### 1. シークレット検出

ステージングされたファイルの diff から以下のパターンを検出する:

| パターン | 対象 |
|----------|------|
| `AKIA[0-9A-Z]{16}` | AWS アクセスキー ID |
| `gh[pousr]_[a-zA-Z0-9]{36}` | GitHub トークン |
| `-----BEGIN .* PRIVATE KEY-----` | 秘密鍵 (PEM) |
| `eyJ...\.eyJ...\.` | JWT トークン |

検出時はコミットをブロックし、エラーメッセージを表示する。

**除外対象:**
- バイナリファイル (.png, .jpg, .gif, .ico, .woff, .ttf, .svg, .lock 等)
- テンプレートファイル (.example, .template)

#### 2. lint-staged 実行

`projects/` ディレクトリが存在する場合、lint-staged を実行する。

```sh
cd projects && npx --yes lint-staged
```

lint-staged の設定は後述。

#### 3. OpenAPI 同期チェック

`packages/api-contract/openapi.yaml` がステージングされているのに、対応する生成ファイル (`apps/api/src/generated/oas`) がステージングされていない場合、警告を表示する。

**警告時の対処:**
```sh
cd projects
pnpm openapi:generate
pnpm format
git add apps/api/src/generated/oas
```

#### 4. ロックファイル同期チェック

`projects/` 配下の `package.json` がステージングされているのに `pnpm-lock.yaml` がステージングされていない場合、警告を表示する。

**警告時の対処:**
```sh
cd projects
pnpm install
git add projects/pnpm-lock.yaml
```

**注意:** チェック 3, 4 は警告のみでコミットはブロックしない。

---

## カスタム Git Hooks (.git-hooks/)

保護ブランチへの直接コミット/プッシュを防ぐ追加フック。現在は未有効。

### 有効化方法

```sh
git config core.hooksPath .git-hooks
```

ただし Husky と排他的関係のため、有効化すると Husky のフック (commitlint, シークレット検出等) が動作しなくなる。両方使う場合は `.husky/` のスクリプト内から `.git-hooks/` のスクリプトを呼び出す統合が必要。

### .git-hooks/pre-commit

**トリガー:** `git commit` 実行時

**処理内容:** 保護ブランチ (main, master, develop) にいる場合、コミットをブロックする。

```
⛔ COMMIT BLOCKED: Protected branch 'main'

main/master ブランチへの直接コミットは禁止されています。

以下のいずれかの方法で作業してください:
1. 新しいブランチを作成:
   git checkout -b feat/your-feature-branch
2. worktree を使用:
   ./tools/worktree/spawn.sh implementer feat/GH-123-feature
```

### .git-hooks/pre-push

**トリガー:** `git push` 実行時

**処理内容:** 保護ブランチ (main, master, develop) へのプッシュをブロックする。

```
⛔ PUSH BLOCKED: Protected branch 'main'

'main' ブランチへの直接プッシュは禁止されています。

Pull Request を作成してマージしてください:
1. 作業ブランチをプッシュ:
   git push origin your-feature-branch
2. Pull Request を作成:
   gh pr create --base main --head your-feature-branch
```

---

## Claude Code Hooks (.claude/hooks/)

Claude Code がツールを実行する前後に自動で走るシェルスクリプト。`.claude/settings.json` で定義されている。

### 設定 (settings.json の hooks セクション)

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "command": ".claude/hooks/pre-bash.sh", "timeout": 5000 },
      { "matcher": "Write|Edit", "command": ".claude/hooks/pre-edit.sh", "timeout": 5000 }
    ],
    "PostToolUse": [
      { "matcher": "Write|Edit", "command": ".claude/hooks/post-edit.sh", "timeout": 30000 }
    ]
  }
}
```

### .claude/hooks/pre-bash.sh

**トリガー:** Claude Code が Bash コマンドを実行する前

**処理内容:** 危険なコマンドをブロックする (Layer B セキュリティガードレール)。

| ブロック対象 | 具体例 |
|-------------|--------|
| 保護ブランチ操作 | `git push origin main`, `git checkout main` |
| フォースプッシュ | `git push --force`, `git push -f` |
| 破壊的操作 | `git reset --hard`, `rm -rf /` |
| 権限昇格 | `sudo`, パイプ先の sudo |
| サプライチェーン攻撃 | `curl ... \| bash`, `wget ... \| python` |
| シークレット流出 | `echo $API_KEY`, `printenv \| grep TOKEN` |
| 機密ファイルアクセス | `cat .env`, `cat secrets/` |
| パッケージマネージャ | `pnpm install`, `npm run` (audit/outdated 以外) |

**動作:** ブロック時は exit code 2 で拒否。stderr にエラーメッセージを出力。

### .claude/hooks/pre-edit.sh

**トリガー:** Claude Code が Write/Edit ツールでファイルを編集する前

**処理内容:** `/generated/` ディレクトリ内のファイルへの直接編集をブロックする。

**ブロック時の案内:**

| 生成元 | 対処方法 |
|--------|---------|
| OpenAPI 生成コード | `openapi.yaml` を編集 → `./tools/contract openapi-generate` |
| Prisma 生成コード | `schema.prisma` を編集 → `./tools/contract migrate` |
| その他 | 該当する生成コマンドを実行 |

### .claude/hooks/post-edit.sh

**トリガー:** Claude Code が Write/Edit ツールでファイルを編集した後

**処理内容:** TypeScript/JavaScript ファイル (.ts, .tsx, .js, .jsx, .mts, .mjs, .cts, .cjs) に対して自動フォーマットを実行する。

```sh
./tools/contract format <ファイルパス>
```

フォーマット失敗時もブロックしない (非ブロッキング)。

---

## Commitlint (commitlint.config.js)

コミットメッセージの形式を強制する。Husky の `commit-msg` フックから呼び出される。

### 設定ファイル

ルートディレクトリの `commitlint.config.js`:

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // 新機能
      'fix',      // バグ修正
      'docs',     // ドキュメントのみ
      'style',    // コードスタイル (ロジック変更なし)
      'refactor', // リファクタリング
      'perf',     // パフォーマンス改善
      'test',     // テスト
      'build',    // ビルドシステム / 依存関係
      'ci',       // CI 設定
      'chore',    // その他
      'revert',   // コミット取り消し
    ]],
    'scope-empty': [0, 'never'],          // スコープは任意
    'subject-case': [2, 'never', [        // 件名の禁止ケース
      'sentence-case', 'start-case',
      'pascal-case', 'upper-case'
    ]],
    'subject-empty': [2, 'never'],        // 件名は必須
    'subject-full-stop': [2, 'never', '.'], // 末尾ピリオド禁止
    'header-max-length': [2, 'always', 100], // ヘッダー100文字以内
  },
};
```

### 正しいコミットメッセージの例

```
feat(auth): add JWT token refresh endpoint
fix(ui): prevent double submission on payment form
docs: update API reference for v2 endpoints
chore(deps): bump next.js to 15.1.0
```

### 拒否されるコミットメッセージの例

```
Added new feature           # type がない
feat: Add new feature       # 大文字始まり (sentence-case)
feat(auth): fix login bug.  # 末尾ピリオド
```

---

## lint-staged (projects/package.json)

ステージングされたファイルに対して自動修正を実行する。Husky の `pre-commit` フックから呼び出される。

### 設定

`projects/package.json` 内:

```json
{
  "lint-staged": {
    "packages/api-contract/openapi.yaml": [
      "pnpm openapi:generate",
      "prettier --write packages/api-contract/src/generated",
      "git add packages/api-contract/src/generated"
    ],
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{js,jsx,json,md,yml}": [
      "prettier --write"
    ]
  }
}
```

### 動作

| 対象ファイル | 実行される処理 |
|-------------|---------------|
| `openapi.yaml` | 型生成 → Prettier → 生成ファイルをステージング |
| `*.ts`, `*.tsx` | ESLint 自動修正 → Prettier フォーマット |
| `*.js`, `*.jsx`, `*.json`, `*.md`, `*.yml` | Prettier フォーマット |

OpenAPI スペック変更時は、lint-staged が自動で TypeScript 型を再生成してステージングに追加する。手動で `openapi:generate` を実行する必要はない。

---

## フック間の関係図

```
git commit 実行
│
├─ [.husky/pre-commit] ─────────────────────────────────
│   │
│   ├─ (1) シークレット検出
│   │   └─ AWS Key / GitHub Token / 秘密鍵 / JWT 検出 → ブロック
│   │
│   ├─ (2) lint-staged 実行
│   │   └─ [projects/package.json の lint-staged 設定]
│   │       ├─ openapi.yaml → 型生成 + フォーマット + git add
│   │       ├─ *.ts, *.tsx  → ESLint fix + Prettier
│   │       └─ *.js 等     → Prettier
│   │
│   ├─ (3) OpenAPI 同期チェック (警告のみ)
│   │
│   └─ (4) ロックファイル同期チェック (警告のみ)
│
├─ [.husky/commit-msg] ─────────────────────────────────
│   └─ commitlint で Conventional Commits 形式を検証
│       └─ 違反時 → ブロック
│
└─ コミット完了


git push 実行
│
└─ (現在フックなし。.git-hooks/pre-push は未有効)


Claude Code ツール実行
│
├─ Bash 実行前 → [.claude/hooks/pre-bash.sh]
│   └─ 危険コマンド検出 → ブロック
│
├─ Write/Edit 実行前 → [.claude/hooks/pre-edit.sh]
│   └─ generated/ 編集検出 → ブロック
│
└─ Write/Edit 実行後 → [.claude/hooks/post-edit.sh]
    └─ TS/JS ファイル自動フォーマット
```

---

## 注意事項

### .git-hooks/ が未有効である件

`.git-hooks/` の pre-commit (ブランチ保護) と pre-push (プッシュ保護) は有用だが、`core.hooksPath` が未設定のため動作していない。

**対処案:**
1. `.husky/pre-commit` の先頭に `.git-hooks/pre-commit` の呼び出しを追加する
2. `.husky/pre-push` を新規作成し `.git-hooks/pre-push` の内容を移植する

### --no-verify の使用

`git commit --no-verify` で全フックをスキップできるが、シークレット検出や commitlint もスキップされるため非推奨。

### DevContainer 内での動作

DevContainer 内では `npx` や `pnpm` が利用可能であることが前提。コンテナイメージに Node.js がインストールされていない場合、lint-staged と commitlint が動作しない。
