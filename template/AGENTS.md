# Canonical Agent Instructions (Repository Contract)

このファイルが **唯一の正** です。他のファイルと矛盾がある場合は、本ファイルに従ってください。

---

## Non-negotiables (絶対ルール)

1. **SDD（ドキュメント駆動）を守る**
   - Spec / Plan / AC なしで実装を開始しない
   - 変更時は関連 Docs も必ず更新する

2. **Golden Commands は Contract 経由で実行**
   - 直接 `pnpm lint` や `npm test` を叩かない
   - 必ず `./tools/contract <cmd>` を使う

3. **破壊的変更の禁止**
   - 既存ファイルを無断で上書きしない

4. **CI / Contract が壊れた状態で完了宣言しない**

5. **PR Body に `Closes #<issue-number>` を含める（必須）**

---

## Golden Commands

| Command | Purpose |
|---------|---------|
| `./tools/contract format` | フォーマット（自動修正） |
| `./tools/contract lint` | 静的解析 |
| `./tools/contract typecheck` | 型チェック |
| `./tools/contract test` | ユニットテスト |
| `./tools/contract build` | ビルド |
| `./tools/contract dev` | 開発サーバー起動 |
| `./tools/contract audit` | 依存パッケージ脆弱性チェック |

---

## Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Package Manager**: pnpm (workspace)
- **Backend**: Hono（または Express）
- **Frontend**: Next.js（App Router）
- **Test**: Vitest
- **Application Code**: `projects/` に配置

---

## Git / Branch / Commit Rules

### ブランチ命名

| Pattern | 例 |
|---------|-----|
| `feat/<issue>-<slug>` | `feat/GH-123-auth-token` |
| `fix/<issue>-<slug>` | `fix/login-null-pointer` |
| `docs/<slug>` | `docs/api-reference` |
| `chore/<slug>` | `chore/update-deps` |

### Conventional Commits（必須）

```
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `style`, `perf`, `revert`

---

## PR Rules

1. PR テンプレの項目を埋める
2. PR タイトルは Conventional Commits 形式
3. `Closes #<issue-number>` を PR body に含める
4. CI が落ちている状態で完了扱いにしない
5. ユニットテストなしで PR を作らない

---

## Directory Structure

```
.
├── .github/          # GitHub 設定（CI, PR テンプレ）
├── .specify/         # Spec 定義
│   └── specs/        # 機能別 Spec
├── projects/         # アプリケーションコード
│   ├── apps/
│   │   ├── api/      # Backend
│   │   └── web/      # Frontend
│   └── packages/
│       └── shared/   # 共通型・ユーティリティ
├── docs/
│   ├── 00_process/   # プロセス定義
│   ├── 01_product/   # プロダクト要件
│   └── 02_architecture/
│       └── adr/      # ADR
└── tools/
    ├── contract      # Golden Commands ラッパー
    └── _contract/    # Golden Commands 実装
```

---

## Definition of Done

### 全変更共通（MUST）

| 項目 | 検証 |
|------|------|
| ユニットテストが追加・更新 | `./tools/contract test` |
| lint エラーなし | `./tools/contract lint` |
| 型エラーなし | `./tools/contract typecheck` |

### 新機能

| 項目 | 検証 |
|------|------|
| Spec / Plan / Tasks が存在 | `.specify/specs/<id>/` |
| すべての AC が実装・テストで確認済み | `./tools/contract test` |
| ビルドが通る | `./tools/contract build` |

---

## Language Policy

AI が生成するすべての自然言語コンテンツは **日本語** で出力すること。

コード識別子、Conventional Commits の type/scope、技術用語は英語を維持。

---

## Agents

| Agent | Purpose |
|-------|---------|
| `implementer` | 最小差分実装 + ユニットテストを書く（TDD: RED→GREEN→REFACTOR） |
| `test-runner` | テスト・lint を**実行するだけ**（テストコードは書かない） |
| `code-reviewer` | コードレビュー |

エージェント間の責任分担:

| 責務 | 担当 |
|------|------|
| ユニットテストを書く | implementer |
| テストを実行・結果報告 | test-runner |
| コードの品質・設計をレビュー | code-reviewer |
