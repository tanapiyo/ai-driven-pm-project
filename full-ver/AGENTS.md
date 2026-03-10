# Canonical Agent Instructions (Repository Contract)

このファイルが **唯一の正** です。他のファイル（CLAUDE.md, .github/copilot-instructions.md 等）と矛盾がある場合は、本ファイルに従ってください。

---

## Non-negotiables (絶対ルール)

1. **Worktree + DevContainer で作業する（main 直接編集禁止）**
   - すべての変更は専用ブランチ + worktree で行う（main/master への直接 push 禁止）
   - **作業開始時の必須手順:**
     1. `./tools/worktree/spawn.sh <branch-name>` で worktree を作成
     2. 作成された worktree ディレクトリで **DevContainer を起動**してから作業開始
     3. DevContainer 内で `./tools/contract` コマンドを実行
   - 作業完了後は `./tools/worktree/cleanup.sh` でクリーンアップ
   - 並列作業時は必ず別 worktree を使用（コンフリクト防止）
     - **例外**: `/parallel-implement` によるサブエージェント並列実行は、コーディネーターがファイルスコープ排他制御を行うため同一 worktree 内で許可される（→ `docs/02_architecture/adr/0008_parallel_implementer.md`）
   - **DevContainer 外での実装作業は禁止**（環境差異によるCI失敗を防止）

2. **DocDD（ドキュメント駆動）を守る**
   - Spec / Plan / AC 無しで実装を開始しない
   - 変更時は関連 Docs（Spec / ADR / Impact / AC / TestPlan）も必ず更新する

3. **Golden Commands は Contract 経由で実行**
   - 直接 `pnpm lint` や `cargo test` を叩かない
   - 必ず `./tools/contract <cmd>` を使う

4. **破壊的変更の禁止**
   - 既存ファイルを無断で上書きしない（差分・追記・移動で対応）

5. **CI / DevContainer / Contract が壊れた状態で完了宣言しない**

6. **HTTP API は OpenAPI 仕様を先に定義する**
   - 手書きで HTTP クライアント/サーバーを実装しない
   - `docs/02_architecture/api/*.yaml` に仕様を配置
   - コード生成ツールでクライアント/スタブを生成

---

## Golden Commands

すべて `./tools/contract` 経由で実行可能。

| Command | Purpose |
|---------|---------|
| `./tools/contract format` | フォーマット（自動修正） |
| `./tools/contract lint` | 静的解析（警告を落とす） |
| `./tools/contract typecheck` | 型チェック（ある場合） |
| `./tools/contract test` | ユニットテスト |
| `./tools/contract build` | ビルド（成果物生成） |
| `./tools/contract e2e` | E2E（WebUI がある場合） |
| `./tools/contract migrate` | DB マイグレーション |
| `./tools/contract audit` | 依存パッケージの脆弱性チェック |
| `./tools/contract outdated` | 依存パッケージの更新確認 |
| `./tools/contract deploy-dryrun` | デプロイのドライラン |
| `./tools/contract dev` | 開発サーバー起動（docker-compose） |
| `./tools/contract dev:stop` | 開発サーバー停止 |
| `./tools/contract dev:logs` | 開発サーバーログ表示 |
| `./tools/contract up` | DevContainer + フルスタック環境起動（Traefik ルーティング） |
| `./tools/contract up:stop` | フルスタック環境停止 |
| `./tools/contract up:logs` | フルスタック環境ログ表示 |
| `./tools/contract up:status` | コンテナステータス表示 |

---

## Golden Outputs (必須成果物)

以下が存在し、変更時に更新されていること。

| Path | Description |
|------|-------------|
| `docs/00_process/process.md` | 開発プロセス定義 |
| `docs/01_product/identity.md` | プロダクトアイデンティティ |
| `docs/01_product/prd.md` | PRD（要件定義） |
| `docs/02_architecture/adr/*` | Architecture Decision Records |
| `docs/03_quality/*` | 品質基準・テスト計画 |
| `docs/04_delivery/*` | リリースプロセス |

---

## Technology Stack

このリポジトリは **Node.js + TypeScript + React** に特化しています。

- **Runtime**: Node.js
- **Language**: TypeScript
- **Package Manager**: pnpm (workspace)
- **Backend**: Hono
- **Frontend**: React
- **Contract Scripts**: `tools/_contract/stack/` に配置
- **Application Code**: `projects/` に配置
  - `projects/apps/` - アプリケーション（api, web 等）
  - `projects/packages/` - 共有パッケージ

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

[optional body]

[optional footer(s)]
```

| Type | 用途 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみ |
| `refactor` | リファクタリング |
| `test` | テスト追加・修正 |
| `chore` | その他 |
| `build` | ビルド・依存関係 |
| `ci` | CI 設定 |
| `style` | コードスタイル（ロジック変更なし） |
| `perf` | パフォーマンス改善 |
| `revert` | コミット取り消し |

**commitlint ルール（CI で検証）:**

| Rule | Level | Value | Description |
|------|-------|-------|-------------|
| `type-enum` | error | 上記 Type のみ | Type は必ず上記のいずれか |
| `scope-empty` | off | - | Scope は任意 |
| `subject-case` | error | 禁止形式の否定 | sentence-case, start-case, pascal-case, upper-case は禁止 |
| `subject-empty` | error | - | Subject は必須 |
| `subject-full-stop` | error | `.` 禁止 | Subject の末尾にピリオド不要 |
| `header-max-length` | error | 100 | Header（type + scope + subject）は 100 文字以内 |
| `body-max-line-length` | error | 100 | Body の各行は 100 文字以内（`@commitlint/config-conventional` から継承） |
| `footer-max-line-length` | error | 100 | Footer の各行は 100 文字以内（`@commitlint/config-conventional` から継承） |

**コミット作成時の注意:**
- Header（1行目）は 100 文字以内
- Body と Footer の各行も 100 文字以内に改行
- `Co-Authored-By:` は Footer として扱われる
- commitlint 違反で CI が失敗した場合、force push は `.claude/hooks/pre-bash.sh` でブロックされる

---

## PR Rules

1. **PR テンプレの該当項目を埋める**
   - Spec / Plan / Impact / AC / Test / Release

2. **PR タイトルは Conventional Commits 形式**
   - squash merge で最終コミットになる
   - 例: `feat(auth): add token rotation`

3. **DocDD リンクを含める**
   - Spec: `.specify/specs/<id>/spec.md`
   - Plan: `.specify/specs/<id>/plan.md`
   - ADR: `docs/02_architecture/adr/<id>.md`

4. **CI が落ちている状態で完了扱いにしない**

5. **PR Body に `Closes #<issue-number>` を含める（必須）**
   - `.worktree-context.yaml` の `issue_number` または branch 名から Issue 番号を取得
   - `Closes #xxx` を PR body に必ず含める（GitHub の auto-close を有効にする）
   - **例外**: Hotfix/Trivial で Issue がない場合は `Exception: <type> — <reason>` を記載

---

## Directory Structure

```
.
├── .devcontainer/            # DevContainer 設定
├── .github/                  # GitHub 設定（CI, PR/Issue テンプレ）
├── .specify/                 # Spec 定義
│   └── specs/                # 機能別 Spec
├── projects/                 # アプリケーションコード
│   ├── apps/                 # アプリケーション
│   │   └── api/              # Backend API
│   └── packages/             # 共有パッケージ
│       ├── shared/           # 共通ドメイン・ユーティリティ
│       └── guardrails/       # アーキテクチャガードレール
├── docs/
│   ├── 00_process/           # プロセス定義
│   ├── 01_product/           # プロダクト要件
│   │   ├── design/           # UX/UI 設計
│   │   └── design_system/    # デザインシステム
│   ├── 02_architecture/      # アーキテクチャ
│   │   └── adr/              # ADR
│   ├── 03_quality/           # 品質・テスト
│   └── 04_delivery/          # リリース
├── design/
│   └── tokens/               # デザイントークン
├── prompts/
│   └── skills/               # 再利用可能スキル（詳細ワークフロー）
└── tools/
    ├── contract              # Golden Commands ラッパー
    ├── _contract/            # Golden Commands 実装
    │   ├── contract          # メインスクリプト
    │   ├── lib/              # ヘルパースクリプト
    │   └── stack/            # 各コマンドの実装
    ├── orchestrate/          # Agent Orchestration
    ├── policy/               # ポリシーチェック
    └── worktree/             # Worktree 管理
```

---

## Definition of Done (per Change Type)

各変更種別の完了定義（DoD）・成果物・機械的検証の3列トレーサビリティ表。

### 全変更種別共通 DoD（MUST）

以下は変更の種別に関わらず **すべての PR で必須** とする。テストなしの PR はマージしない。

| DoD 項目 | 成果物 | 機械的検証 |
|----------|--------|-----------|
| **ユニットテストが追加・更新されている（MUST）** | `projects/**/tests/` のユニットテスト | `./tools/contract test` |
| lint エラーがない | - | `./tools/contract lint` |
| 型エラーがない | - | `./tools/contract typecheck` |

> **テストなし PR の扱い**: 新規コード・修正コードに対応するユニットテストが存在しない PR は、レビュアーがマージを拒否する。
> ドキュメントのみの変更（`docs/` 内のみ変更）は除外する。

### 新機能

| DoD 項目 | 成果物 | 機械的検証 |
|----------|--------|-----------|
| Spec / Plan / Tasks が存在する | `.specify/specs/<id>/spec.md`, `plan.md`, `tasks.md` | `./.specify/scripts/validate-spec.sh` |
| すべての AC が実装されテストで確認できる | `projects/**/tests/` のユニットテスト | `./tools/contract test` |
| 型エラーがない | - | `./tools/contract typecheck` |
| lint エラーがない | - | `./tools/contract lint` |
| ビルドが通る | 生成成果物 | `./tools/contract build` |
| API がある場合は OpenAPI 仕様が先に定義済み | `docs/02_architecture/api/*.yaml` | `./tools/contract guardrail`（openapi-check 含む） |
| アーキテクチャガードレールが通る | - | `./tools/contract guardrail` |

### アーキ変更

<!-- ADR 運用ガイドライン: docs/00_process/adr_guidelines.md -->

| DoD 項目 | 成果物 | 機械的検証 |
|----------|--------|-----------|
| ADR が作成・承認されている | `docs/02_architecture/adr/NNNN[-_]*.md` ([ADR ガイドライン](docs/00_process/adr_guidelines.md)) | `./tools/contract adr-validate` |
| 影響範囲が文書化されている | Impact Analysis（Plan に記載） | 手動確認 |
| マイグレーション計画がある（DB変更時） | Migration Plan + `./tools/contract migrate` 実行 | `./tools/contract migrate` |
| 既存テストが全て通る | - | `./tools/contract test` |
| lint エラーがない | - | `./tools/contract lint` |
| 型エラーがない | - | `./tools/contract typecheck` |
| アーキテクチャガードレールが通る | - | `./tools/contract guardrail` |
| ビルドが通る | - | `./tools/contract build` |

### UI 変更

| DoD 項目 | 成果物 | 機械的検証 |
|----------|--------|-----------|
| Screen Spec / AC が更新されている | `.specify/specs/<id>/spec.md`（UI Components 節） | `./.specify/scripts/validate-spec.sh` |
| デザインシステム準拠（dark mode 含む） | Design system update（必要時） | 手動確認（WCAG AA 4.5:1） |
| ライト / ダーク両モードのスクリーンショットがある | Screenshots（PR に添付） | `./tools/contract e2e` |
| UI states が全て実装・確認済み | E2E テスト or スクリーンショット | `./tools/contract e2e` |
| lint エラーがない | - | `./tools/contract lint` |
| 型エラーがない | - | `./tools/contract typecheck` |
| アーキテクチャガードレールが通る | - | `./tools/contract guardrail` |
| ビルドが通る | - | `./tools/contract build` |
| React Doctor スコア 75 以上 | - | `./tools/react-doctor/run.sh` |

### バグ修正

| DoD 項目 | 成果物 | 機械的検証 |
|----------|--------|-----------|
| Issue にリンクされている | PR body に `Closes #<issue>` | 手動確認（PR テンプレ） |
| バグを再現するテストが追加されている（リグレッション防止） | `projects/**/tests/` | `./tools/contract test` |
| 挙動変更を伴う場合は Spec が更新されている | `.specify/specs/<id>/spec.md`（該当時） | `./.specify/scripts/validate-spec.sh` |
| lint エラーがない | - | `./tools/contract lint` |
| 型エラーがない | - | `./tools/contract typecheck` |
| アーキテクチャガードレールが通る | - | `./tools/contract guardrail` |
| ビルドが通る | - | `./tools/contract build` |

### リファクタリング

| DoD 項目 | 成果物 | 機械的検証 |
|----------|--------|-----------|
| ADR が作成されている（なぜリファクタするか） | `docs/02_architecture/adr/NNNN[-_]*.md` ([ADR ガイドライン](docs/00_process/adr_guidelines.md)) | `./tools/contract adr-validate` |
| 既存テストが全て通る（振る舞い変更なし） | - | `./tools/contract test` |
| 型エラーがない | - | `./tools/contract typecheck` |
| lint エラーがない | - | `./tools/contract lint` |
| アーキテクチャガードレールが通る | - | `./tools/contract guardrail` |
| ビルドが通る | - | `./tools/contract build` |

### 依存更新

| DoD 項目 | 成果物 | 機械的検証 |
|----------|--------|-----------|
| Changelog が確認されている | Changelog review（PR body に記載） | 手動確認 |
| 脆弱性監査が通る | - | `./tools/contract audit` |
| 既存テストが全て通る | - | `./tools/contract test` |
| 型エラーがない | - | `./tools/contract typecheck` |
| lint エラーがない | - | `./tools/contract lint` |
| アーキテクチャガードレールが通る | - | `./tools/contract guardrail` |
| ビルドが通る | - | `./tools/contract build` |

---

## Failure Patterns to Avoid

| ID | Symptom | Prevention |
|----|---------|------------|
| FP01 | Docs が更新されず PR レビュー不能 | PR テンプレに Docs 更新チェック必須 |
| FP02 | 実行コマンドの呼び方がバラバラ | `tools/contract` 経由に統一 |
| FP03 | DevContainer では動くが CI で落ちる | Contract smoke を CI 必須に |
| FP04 | AGENTS.md と他の instructions が矛盾 | AGENTS.md を canonical に |
| FP05 | main で直接作業して worktree 未使用 | 作業開始時に必ず worktree 作成 |
| FP06 | DevContainer 外で作業して環境差異発生 | DevContainer 起動を必須化 |
| FP07 | OpenAPI 生成物が CI で out of sync | pre-commit + lint-staged で自動同期 |
| FP08 | ユニットテストなしで PR がマージされる | DoD にテスト必須を明記、レビュアーが AC Verification テーブルで証跡を確認 |

---

## Pre-commit Hooks (CI Prevention)

コミット前に CI で検査される項目を事前にチェック・修正する。

### 自動実行される検査

| Hook | 検査内容 | CI Job |
|------|----------|--------|
| secrets detection | AWS Key, GitHub Token, JWT, Private Key | secrets-scan |
| lint-staged | ESLint + Prettier | lint-and-typecheck |
| OpenAPI sync check | 生成物の同期確認 | openapi-check |
| commitlint | Conventional Commits 準拠チェック | pr-governance |

### OpenAPI 自動同期 (lint-staged)

`openapi.yaml` を変更してコミットすると、自動的に:

1. `./tools/contract openapi-generate` でコード生成
2. `./tools/contract format` でフォーマット
3. 生成物をステージに追加

```json
// projects/package.json の lint-staged 設定
// NOTE: lint-staged は DevContainer 内の git hook で実行されるため raw pnpm を使用（known exception）
// バックエンドは express-openapi-validator によるランタイムバリデーションのためコード生成不要 (ADR-0013)
"packages/api-contract/openapi.yaml": [
  "pnpm openapi:generate",
  "prettier --write packages/api-contract/src/generated",
  "git add packages/api-contract/src/generated"
]
```

### 手動での OpenAPI 同期

lint-staged が動作しない場合（DevContainer 外など）:

```bash
./tools/contract openapi-generate    # コード生成（DevContainer 内で実行）
./tools/contract format              # フォーマット（DevContainer 内で実行）
git add projects/packages/api-contract/src/generated
```

---

## Agents (役割定義)

エージェントは **並列実行がデフォルト**。read-only エージェントは背景で自動起動。

### Claude Code Sub-Agents（推奨）

Claude Code 使用時は `.claude/agents/` のサブエージェントが自動的に利用されます。

| ID | Purpose | Tools | Mode |
|----|---------|-------|------|
| `repo-explorer` | コードベース探索 | Read, Grep, Glob | read-only, 並列 |
| `security-auditor` | セキュリティ監査 | Read, Grep, Glob | read-only, 並列 |
| `test-runner` | テスト/lint実行 | Bash, Read | 自動実行 |
| `e2e-runner` | E2E テスト実行・失敗分析 | Bash, Read, Grep, Glob | オンデマンド |
| `code-reviewer` | コードレビュー | Read, Grep, Glob | read-only, 並列 |
| `designer` | UX/UIデザイン品質監査 | Read, Grep, Glob | read-only, 並列 |
| `qa-planner` | テスト計画・AC検証 | Read, Grep, Glob | read-only, 並列 |
| `architect` | アーキテクチャ設計・ADR | Read, Grep, Glob | read-only, 並列 |
| `issue-project-manager` | Epic/Project ライフサイクル状態管理 | Bash, Read, Grep, Glob | オンデマンド |
| `implementer` | 最小差分実装 | All | メイン作業 |

**並列実行フロー（基本）:**
```
User: "認証機能を追加"
  ├─ repo-explorer: 関連コード探索
  ├─ security-auditor: 認証のセキュリティ確認
  └─ code-reviewer: 既存認証コードの品質確認
      ↓ (結果統合)
  implementer: 実装
      ↓
  test-runner: テスト実行
```

**並列実行フロー（並列 Implementer）:**

独立したタスク群を持つ機能では、`/parallel-implement` で複数 implementer を並列起動可能。

```
User: "/parallel-implement .specify/specs/feature-x/"
  │
  ├─ 1. tasks.md 解析 → 依存グラフ構築
  ├─ 2. 並列グループ特定 + ファイルスコープ割り当て
  │
  ├─ 3. Wave 1（並列）:
  │   ├─ implementer-1: backend-domain (scope: domain/)
  │   └─ implementer-2: frontend-impl (scope: features/)
  │
  ├─ 4. Wave 2（並列、Wave 1 完了後）:
  │   └─ implementer-3: backend-usecase (scope: usecase/)
  │
  ├─ 5. 共有ファイル（コーディネーター逐次処理）
  │
  └─ 6. 整合性チェック:
      ├─ ./tools/contract format
      ├─ ./tools/contract lint
      ├─ ./tools/contract typecheck
      └─ ./tools/contract test
```

**tasks.md 依存メタデータフォーマット:**

```markdown
- [ ] **Task N**: タスク名
  - depends_on: [依存タスクID]     # 前提タスク（空=独立）
  - files: [変更対象ファイルパス]   # 排他スコープ
  - parallel_group: グループ名      # 同一グループ = 同一エージェント
```

**ファイルスコープルール:**
- 各グループは排他的ファイルスコープを持つ（重複禁止）
- 共有ファイル（DI container, barrel exports）はコーディネーターが逐次処理
- スコープ制約はプロンプトベース、事後検証で違反検出
- メタデータなしの tasks.md は逐次実行にフォールバック

→ ADR: `docs/02_architecture/adr/0008_parallel_implementer.md`
## Agent Orchestration

Claude Code の Task ツールで並列実行が可能。手動オーケストレーションは `tools/orchestrate/` を参照。

```bash
# 手動オーケストレーション（オプション）
./tools/orchestrate/orchestrate.sh start "認証機能を追加"
./tools/orchestrate/orchestrate.sh status
```

---

## Skills (再利用可能な技能)

失敗パターンを先回りで潰す共通スキル。詳細は `prompts/skills/` および `docs/00_process/skills_catalog.md` を参照。

| ID | Trigger | Purpose |
|----|---------|---------|
| `Skill.Kickoff` | 開発開始時 | Worktree/DevContainer確認、Contract読み込み、DocDD成果物特定 |
| `Skill.Read_Contract_First` | 新タスク開始時 | AGENTS.md と process.md を読み、制約を把握 |
| `Skill.DocDD_Spec_First` | 機能/アーキ変更時 | Spec/Plan/Tasks を先に作成してから実装 |
| `Skill.Minimize_Diff` | CI失敗/レビュー指摘時 | 原因を1つに絞り最小差分に収束 |
| `Skill.Fix_CI_Fast` | contract failing | 依存→設定→環境の順で切り分け、3ループで止める |
| `Skill.Policy_Docs_Drift` | コード変更時 | 必要なdocs更新を同PRで実施 |
| `Skill.Review_As_Staff` | Reviewer起動時 | DocDDリンク確認、NFR観点、rollback妥当性 |
| `Skill.DevContainer_Safe_Mode` | firewall/permission問題時 | allowlist確認、safeプロファイル維持 |
| `Skill.OpenAPI_Contract_First` | HTTP API設計/実装時 | OpenAPI仕様を先に定義、コード生成活用 |
| `Skill.Horizontal_Guardrails` | 実装/レビュー時 | 横のガードレールでアーキテクチャ維持 |

---

## Language Policy (言語ポリシー)

AI が生成するすべての自然言語コンテンツは **日本語** で出力すること。

### 日本語で出力 MUST（対象）

| 対象                          | 例                                         |
| ----------------------------- | ------------------------------------------ |
| PR 説明文（Summary / Changes） | `gh pr create` の body                    |
| docs/ 内のドキュメント        | 設計書、プロセスドキュメント、ADR 等       |
| AI レビューコメント           | `## 🤖 AI Review (automated)` の本文      |
| Issue コメント・説明文        | `gh issue comment` のボディ                |
| エラーメッセージ・状況説明    | BLOCKED: / WARNING: 等のユーザー向け説明  |

### 英語を維持 MUST NOT 変更（対象外）

| 対象外                                    | 例                                              |
| ----------------------------------------- | ----------------------------------------------- |
| コード中の識別子（変数名・関数名・型名）  | `createUser`, `UserRepository`                  |
| Conventional Commits の type/scope        | `feat(auth):`, `fix(api):`                      |
| 技術用語・固有名詞                        | `TypeScript`, `Prisma`, `OpenAPI`               |
| CLI コマンド・ファイルパス                | `./tools/contract lint`, `src/domain/`          |

詳細は `.claude/rules/11-language.md` を参照。

---

## Autonomy Configuration

エージェントの自律動作に関する設定。

| Setting | Value | Description |
|---------|-------|-------------|
| `risk_profile` | `safe` | 危険操作は必ず確認を求める |
| `allow_auto_commit` | `true` | 自動コミット許可 |
| `allow_auto_pr` | `true` | 自動PR作成許可 |
| `dangerously_skip_permissions` | `false` | 危険なpermission skip禁止 |

**safe モード**: 自動実行はするが、以下は明示承認が必要
- force push
- main/master への直接 push
- 既存ファイルの削除
- セキュリティ設定の変更

---

## Related Documents

- Agent Operating Model: `docs/00_process/agent_operating_model.md`
- Skills Catalog: `docs/00_process/skills_catalog.md`
- Skill Prompts (detailed workflows): `prompts/skills/`
- **Claude Code Configuration**: `.claude/`
  - Sub-Agents: `.claude/agents/`
  - Skills (domain knowledge): `.claude/skills/`
  - Rules (always-applied): `.claude/rules/`
  - Commands (slash commands): `.claude/commands/`

