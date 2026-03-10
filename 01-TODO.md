# MVP 実装チェックリスト

## 使い方

1. `template/` を新プロジェクトのルートにコピー
2. `YOUR_PROJECT` を実際のプロジェクト名に置換
3. 各チェックボックスを上から順に実施

---

## Phase 1: プロジェクト骨格

- [ ] ルート `package.json` を配置（husky + commitlint 設定）
- [ ] `commitlint.config.js` を配置
- [ ] `.gitignore` を配置
- [ ] `.prettierrc` を配置
- [ ] `projects/package.json` を配置（pnpm workspace ルート）
- [ ] `projects/pnpm-workspace.yaml` を配置
- [ ] `projects/tsconfig.base.json` を配置
- [ ] `projects/apps/api/package.json` を配置
- [ ] `projects/apps/api/tsconfig.json` を配置
- [ ] `projects/apps/web/package.json` を配置
- [ ] `projects/apps/web/tsconfig.json` を配置
- [ ] `projects/packages/shared/package.json` を配置
- [ ] `projects/packages/shared/tsconfig.json` を配置
- [ ] `pnpm install` が通ること

## Phase 2: Golden Commands (tools/contract)

- [ ] `tools/contract` を配置（実行権限付き: `chmod +x`）
- [ ] `tools/_contract/contract` を配置
- [ ] `tools/_contract/stack/format` を配置（実行権限付き）
- [ ] `tools/_contract/stack/lint` を配置（実行権限付き）
- [ ] `tools/_contract/stack/typecheck` を配置（実行権限付き）
- [ ] `tools/_contract/stack/test` を配置（実行権限付き）
- [ ] `tools/_contract/stack/build` を配置（実行権限付き）
- [ ] `./tools/contract format` が実行できること

## Phase 3: Docker 開発環境

- [ ] `projects/docker-compose.yaml` を配置
- [ ] `projects/apps/api/Dockerfile.dev` を配置
- [ ] `projects/apps/web/Dockerfile.dev` を配置
- [ ] `./tools/contract dev` でコンテナが起動すること

## Phase 4: Claude Code 設定

- [ ] `CLAUDE.md` を配置（MVP 向け内容、codama-ldh 固有の参照なし）
- [ ] `AGENTS.md` を配置（MVP 向け内容）
- [ ] `.claude/settings.json` を配置（最小 allow/deny）
- [ ] `.claude/rules/01-core.md` を配置
- [ ] `.claude/rules/02-backend.md` を配置
- [ ] `.claude/rules/03-frontend.md` を配置
- [ ] `.claude/rules/05-quality.md` を配置
- [ ] `.claude/agents/implementer.md` を配置
- [ ] `.claude/agents/test-runner.md` を配置
- [ ] `.claude/agents/code-reviewer.md` を配置

## Phase 5: docs 骨格

- [ ] `docs/00_process/process.md` を配置
- [ ] `docs/01_product/prd.md` を配置
- [ ] `docs/02_architecture/adr/TEMPLATE.md` を配置

## Phase 6: Git Hooks

- [ ] `.husky/commit-msg` を配置
- [ ] `.husky/pre-commit` を配置
- [ ] `pnpm prepare` (husky install) が通ること
- [ ] コミットメッセージ違反でフックが動作すること

## Phase 7: CI

- [ ] `.github/workflows/ci.yml` を配置
- [ ] PR で format → lint → typecheck → test → build が実行されること

## Phase 8: Spec テンプレート

- [ ] `.specify/templates/spec.md` を配置
- [ ] `.specify/templates/plan.md` を配置

## Phase 9: PR テンプレート

- [ ] `.github/PULL_REQUEST_TEMPLATE/default.md` を配置

## Phase 10: Makefile

- [ ] `Makefile` を配置（contract へのショートカット）
- [ ] `make format` が動作すること

---

## 検証チェックリスト（完了確認）

- [ ] `template/` を空ディレクトリにコピーし `pnpm install` が通る
- [ ] `./tools/contract format` が実行できる
- [ ] `./tools/contract lint` が実行できる
- [ ] `./tools/contract typecheck` が実行できる
- [ ] `./tools/contract test` が実行できる
- [ ] `./tools/contract build` が実行できる
- [ ] CLAUDE.md / AGENTS.md が MVP 向け内容（codama-ldh 固有の参照なし）
- [ ] CI workflow が format → lint → typecheck → test → build の順で実行される
- [ ] コミットメッセージ lint が動作する（`fix: bad commit.` が拒否される）
- [ ] シークレット検出 hooks が動作する

---

## Growth 拡張 TODO（MVP 完了後）

- [ ] `.devcontainer/` 追加（Node.js + pnpm DevContainer）
- [ ] `packages/api-contract/` 追加（OpenAPI + orval）
- [ ] `.claude/rules/04-security.md` + hooks 追加
- [ ] `tools/_contract/stack/e2e` 追加（Playwright）
- [ ] `.claude/commands/kickoff.md`, `pr-check.md` 追加
- [ ] Codex MCP 設定追加
