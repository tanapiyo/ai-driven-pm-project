# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

**Canonical instructions are in `AGENTS.md`.**

If anything conflicts, follow `AGENTS.md`.

---

## Commands

すべてのコマンドは `./tools/contract` 経由で実行する（`pnpm lint` 等を直接叩かない）。

```bash
./tools/contract format       # Prettier（自動修正）
./tools/contract lint         # ESLint
./tools/contract typecheck    # TypeScript 型チェック
./tools/contract test         # ユニットテスト（全パッケージ）
./tools/contract build        # プロダクションビルド
./tools/contract dev          # 開発サーバー起動（docker-compose）
./tools/contract dev:stop     # 開発サーバー停止
./tools/contract dev:logs     # 開発サーバーログ表示
./tools/contract audit        # 依存パッケージ脆弱性チェック
./tools/contract outdated     # 依存パッケージ更新確認
```

単一テストの実行:

```bash
cd projects && pnpm --filter @YOUR_PROJECT/api test -- --reporter=verbose path/to/test.ts
cd projects && pnpm --filter @YOUR_PROJECT/web test -- --reporter=verbose path/to/test.ts
```

---

## Architecture

### Monorepo 構成

```
projects/
├── apps/
│   ├── api/    # Backend: Hono, Clean Architecture + DDD
│   └── web/    # Frontend: Next.js, Feature-Sliced Design
└── packages/
    └── shared/ # 共通型・ユーティリティ
```

### Backend: Clean Architecture

```
presentation → usecase → domain ← infrastructure
```

- `src/domain/` — 純粋なビジネスロジック（フレームワーク依存なし）
- `src/usecase/` — ユースケースを orchestrate
- `src/infrastructure/` — DB、外部サービスの実装
- `src/presentation/` — HTTP コントローラー

### Frontend: Feature-Sliced Design

```
app → widgets → features → entities → shared
```

---

## Key Constraints

- **SDD（Spec-Driven）**: Spec/Plan/AC なしで実装開始しない。`.specify/specs/<id>/` に配置。
- **Golden Commands**: `./tools/contract` 経由でのみ実行。
- **PR には `Closes #<issue>` 必須**。
- **テストなし PR は禁止**。

## Always-Applied Rules

`.claude/rules/` から自動ロード:

| File | Purpose |
|------|---------|
| `01-core.md` | 絶対ルール、コミット形式 |
| `02-backend.md` | Clean Architecture、API ルール |
| `03-frontend.md` | FSD、ダークモード |
| `05-quality.md` | Golden Commands、修正順序 |
