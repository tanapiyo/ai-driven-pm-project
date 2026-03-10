# Git / PR Governance

このドキュメントは、リポジトリにおける Git 運用・ブランチ戦略・PR ルールを定義します。

---

## レビューポリシー（AC レビュー中心）

このリポジトリでは **コードの書き方のレビューは行いません**。
代わりに、**AC（受け入れ条件）が満たされているかどうかのレビュー**に集中します。

| 旧パラダイム | 新パラダイム |
|------------|------------|
| 人間がコードを読みレビューする | 人間は「正しく動いている状態」の定義と検証に集中する |
| コードの書き方を議論する | AC が満たされているかを検証する |
| Pull Request のコードを精査する | PR 内の AC とその証跡を確認する |

**理由**: AI エージェント時代では、コードスタイル・フォーマット・静的解析は自動化されます。
人間は「何が正しい動作か」の定義（AC）と、それが達成されているかの検証、
および AI では判断できない観点（ビジネス要件の妥当性、セキュリティ設計の意図、ロールバック安全性）に集中します。

### レビュアーが確認すべき手順

1. **AC Verification テーブルを確認する** — PR body に全 AC が列挙されているか
2. **各 AC の証跡を確認する** — テスト/スクリーンショット/CI ログが示されているか
3. **AC の正しさを評価する** — 以下の観点で AC 自体の妥当性を問う:
   - 各 AC は Given/When/Then 形式か、またはそれに準ずるか
   - AC の前提条件は正しいか（ビジネス要件の妥当性）
   - AC がエラーパス・境界条件を網羅しているか
   - AC が正しく定義されていない場合、追加説明またはリテイクを求める

詳細は [CONTRIBUTING.md#pr-での-ac-定義検証フロー](../../CONTRIBUTING.md#pr-での-ac-定義検証フロー) を参照してください。

---

## ブランチ戦略

### Branching Model

| 項目 | 設定 |
|------|------|
| Model | trunk-based |
| Default branch | `main` |
| Merge strategy | squash |
| Linear history | 推奨 |
| Merge queue | 推奨（大規模時） |

### ブランチ命名規則

| Pattern | 用途 | 例 |
|---------|------|-----|
| `feat/<issue-or-topic>-<slug>` | 新機能 | `feat/GH-123-auth-token-rotation` |
| `fix/<issue-or-topic>-<slug>` | バグ修正 | `fix/login-null-pointer` |
| `docs/<topic>-<slug>` | ドキュメント | `docs/api-reference-update` |
| `chore/<topic>-<slug>` | メンテナンス | `chore/update-dependencies` |
| `refactor/<topic>-<slug>` | リファクタ | `refactor/auth-module` |

**命名の原則:**
- 短く、grep しやすい
- Issue 番号があれば含める（`GH-123`）
- スペースやアンダースコアは使わない（ハイフンを使う）

---

## コミット規約

### Conventional Commits

本リポジトリでは [Conventional Commits](https://www.conventionalcommits.org/) を採用します。

**フォーマット:**

```
<type>(<scope>): <subject>

[body]

[footer]
```

**Type 一覧:**

| Type | 説明 |
|------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | コードの意味に影響しない変更（空白、フォーマット等） |
| `refactor` | バグ修正でも機能追加でもないコード変更 |
| `perf` | パフォーマンス改善 |
| `test` | テストの追加・修正 |
| `build` | ビルドシステム・外部依存の変更 |
| `ci` | CI 設定の変更 |
| `chore` | その他の変更 |
| `revert` | コミットの取り消し |

**ルール:**
- `scope` は任意（省略可）
- `subject` は命令形（例: add, fix, update）
- `subject` の末尾にピリオド不要
- 50-72 文字目安

**例:**

```
feat(auth): add token rotation support

Implements automatic token rotation with configurable intervals.

Refs: GH-123
```

### ローカル強制

commitlint + git hooks で自動チェックします。

```bash
# セットアップ（DevContainer では自動実行）
./tools/git-hooks/install.sh

# コミット時に自動チェック
git commit -m "feat: add new feature"
```

### Protected Branch Enforcement

main/master ブランチへの直接コミット・プッシュはローカル git hooks でブロックされます。

```bash
# hooks のインストール（DevContainer では自動）
./tools/git-hooks/install.sh

# 作業開始時の確認
./tools/worktree/ensure-worktree.sh
```

**DevContainer 起動時の自動チェック:**
- `postCreateCommand`: git hooks を自動インストール
- `postStartCommand`: worktree 環境チェックを実行

**ブロックされる操作:**
- main/master/develop への直接コミット（pre-commit hook）
- main/master/develop への直接プッシュ（pre-push hook）

**推奨ワークフロー:**
1. worktree でブランチを作成: `./tools/worktree/spawn.sh implementer feat/GH-123-feature`
2. 作業ブランチで開発・コミット
3. PR を作成してマージ

### CI 強制

PR の全コミット、または PR タイトルを CI でチェックします。

> **Note**: `merge_strategy=squash` の場合、PR タイトルが最終コミットメッセージになるため、PR タイトルも Conventional Commits 形式で書いてください。

---

## PR ルール

### DocDD (Document-Driven Development)

PR は必ず以下のリンクを含むこと：

| 項目 | 必須 | パス例 |
|------|------|--------|
| Spec | ○（新機能） | `.specify/specs/<id>/spec.md` |
| Plan | ○（新機能） | `.specify/specs/<id>/plan.md` |
| ADR | △（アーキ変更時） | `docs/02_architecture/adr/<id>.md` |
| Impact | △（破壊的変更時） | `docs/02_architecture/impact_analysis/<id>.md` |
| AC/Test | △（機能変更時） | `docs/03_quality/*` |
| Release | △（リリース時） | `docs/04_delivery/*` |

### PR テンプレート

4種類の PR テンプレートを用意しています：

| テンプレート | 用途 |
|-------------|------|
| [01_spec.md](../../.github/PULL_REQUEST_TEMPLATE/01_spec.md) | Spec 追加・更新 |
| [02_plan.md](../../.github/PULL_REQUEST_TEMPLATE/02_plan.md) | 実装計画 |
| [03_implement.md](../../.github/PULL_REQUEST_TEMPLATE/03_implement.md) | 実装 |
| [04_release.md](../../.github/PULL_REQUEST_TEMPLATE/04_release.md) | リリース |

新規 PR 作成時は URL パラメータでテンプレートを指定：

```
https://github.com/<owner>/<repo>/compare/<branch>?template=03_implement.md
```

### PR タイトル

Conventional Commits 形式で記述（squash merge 時の最終コミットになる）：

```
feat(auth): add token rotation support
fix: resolve null pointer in login flow
docs: update API reference
```

#### Linear Issue キーの付与

GitHub Issue body に `### 🔗 Linear` セクションがあり Linear Issue キー（例: `COD-7`）が記載されている場合、
PR タイトルの subject 先頭に `[COD-XX]` を付与する：

```
feat(auth): [COD-7] add token rotation support
fix: [COD-42] resolve null pointer in login flow
docs: [COD-15] update API reference
```

- `[COD-XX]` は Conventional Commits の subject 部分に含まれるため、commitlint の設定変更は不要
- Linear Issue がない場合は省略してよい（`feat(auth): add token rotation support`）
- autopilot 経由の PR では自動的に付与される（→ `.claude/commands/autopilot.md` Phase 5）

### 最小レビュー要件

- **レビュアー**: 1名以上
- **CODEOWNERS**: 必須（該当パスがある場合）
- **CI**: 全 required checks がパス
- **レビュアーの主要責務**: AC Verification テーブルの確認と AC の正しさの評価
  (コードスタイル・静的解析は自動化済みのため人間レビューは不要)

---

## Pre-PR 品質ゲート（自動）

### 概要

PR 作成前に自動品質ゲートを実行し、PR 後の手戻りを削減します。
**AI エージェントがコードの形式的な正しさを確認し、人間は AC の正しさを確認します。**

```
format → lint → typecheck → test → build → ★ AC review (human) → PR 作成 → /pr-check
```

### 自動実行内容（AI）

1. **Claude code-reviewer**: アーキテクチャ、DocDD 準拠、テストカバレッジ、ロールバック安全性
2. **Codex MCP (GPT)**: セキュリティ、アーキテクチャ、コード品質の別視点レビュー

### 人間レビュアーの確認内容（PR 作成後）

1. AC Verification テーブルが存在し、全 AC が列挙されているか
2. 各 AC に証跡（テスト/スクリーンショット/CI ログ）が示されているか
3. AC 自体がビジネス要件として正しく定義されているか

### `/pr-check` との使い分け

| 観点 | Pre-PR レビュー | `/pr-check` |
|------|----------------|-------------|
| タイミング | PR 作成前 | PR 作成後 |
| スコープ | コードレビューのみ | Issue link、セキュリティ、テスト、フロントエンド品質、レビューの包括チェック |
| 目的 | 早期に問題検出し手戻り削減 | マージ前の最終ゲート |
| 実行者 | code-reviewer + Codex MCP | code-reviewer + security-auditor + test-runner + Codex MCP |

### レビュー結果の扱い

| 重要度 | 対応 | 例 |
|--------|------|-----|
| P0 (Blocker) | **修正必須** — PR 作成前に対応 | セキュリティ脆弱性、契約違反、テスト未実装 |
| P1 (Important) | **推奨** — PR 作成前の対応を推奨 | 命名、エッジケース未考慮、ドキュメント不足 |
| P2 (Suggestion) | **任意** — 著者判断 | スタイル提案、軽微な最適化 |

### 詳細

→ `.claude/skills/quality-gates/SKILL.md#review-step-pre-pr`

---

## クロスモデル PR レビュー

### 概要

`/pr-check` では、Claude サブエージェント（code-reviewer, security-auditor, test-runner）に加えて、Codex MCP（GPT ベース）による追加レビューを実施します。異なる LLM の視点を組み合わせることで、レビュー品質を向上させます。

### 役割分担

| Reviewer | 役割 | ブロッキング |
|----------|------|-------------|
| Claude code-reviewer | アーキテクチャ、DocDD 準拠、テストカバレッジ | Yes |
| Claude security-auditor | セキュリティ、脆弱性、依存関係 | Yes |
| Claude test-runner | lint, typecheck, test, build | Yes |
| Codex MCP (GPT) | セキュリティ、アーキテクチャ、コード品質の別視点レビュー | No (advisory) |
| **Human Reviewer** | **AC の正しさ（ビジネス要件の妥当性）、AC Verification 証跡の確認** | **Yes** |

### フォールバック動作

Codex MCP が利用不可（タイムアウト、接続エラー等）の場合:

1. PR チェックプロセスは**ブロックしない**
2. 警告を出力: `"Codex MCP review unavailable. Continuing with Claude-only review."`
3. エラー詳細は露出しない
4. Claude のレビュー結果のみで続行

### Codex レビュー結果の扱い

- Codex の指摘は **advisory（助言）** であり、デフォルトではブロッキングではない
- P0 指摘がある場合、Claude のレビュー結果と照合して判断する
- 最終的なマージ判定は Claude のレビュー結果に基づく

### セキュリティ考慮事項

- diff 送信前にセンシティブファイル（`.env*`, `secrets/`, `*.pem`, `*.key`）を除外
- プロンプトテンプレートで diff を明示的に区切り（`<diff>...</diff>`）、構造化して渡す
- diff サイズ制限なし（Codex MCP は大きな diff も処理可能）
- Codex MCP は stdio トランスポート経由（ローカル実行）

---

## Branch Protection (GitHub Settings)

以下は GitHub の GUI で設定が必要です。

### main ブランチ保護

| 設定 | 推奨値 | 説明 |
|------|--------|------|
| Require pull request | ✓ | 直接 push 禁止 |
| Required approvals | 1 | 最小レビュアー数 |
| Dismiss stale reviews | ✓ | 変更後は再レビュー |
| Require status checks | ✓ | CI 必須 |
| Required checks | `policy`, `commitlint` | 必須ジョブ |
| Require linear history | ✓ | リベースまたは squash のみ |
| Include administrators | △ | 管理者も同じルールに |

### Merge Queue（大規模リポジトリ向け）

| 設定 | 推奨値 |
|------|--------|
| Enable | ✓ |
| Merge method | Squash |
| Maximum size | 5 |
| Minimum size | 1 |
| Wait time | 5 minutes |

### Rulesets 設定手順

1. **Settings** → **Rules** → **Rulesets** → **New ruleset**
2. Ruleset name: `main-protection`
3. Target branches: `main`
4. Rules:
   - Restrict deletions
   - Require linear history
   - Require a pull request
   - Require status checks to pass
   - Block force pushes

---

## 緊急対応（Emergency Procedure）

緊急 fix が必要な場合の例外手順：

### 条件

- 本番障害で即時対応が必要
- 通常のレビュープロセスを待てない

### 手順

1. **Issue を作成**（後追いでもよい）
2. **ブランチ**: `hotfix/<issue>-<slug>` で作成
3. **PR を作成**:
   - タイトル: `fix!: [HOTFIX] <description>`
   - 本文に障害内容と影響を記載
4. **レビュー**: 可能な限り 1 名以上
5. **マージ**: Admin override を使用（管理者のみ）
6. **後処理**:
   - 根本原因分析（RCA）を Issue にまとめる
   - 必要に応じて Spec / ADR を更新
   - Release Note に明記

### 記録

緊急対応は必ず以下を残す：

- Issue（障害内容、影響、原因）
- PR（対応内容、レビュー記録）
- Release Note（リリース時に明記）

---

## 関連ファイル

| ファイル | 説明 |
|----------|------|
| [AGENTS.md](../../AGENTS.md) | エージェント向け規約（canonical） |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | コントリビュータ向けガイド（AC レビューポリシー SSOT） |
| [.github/CODEOWNERS](../../.github/CODEOWNERS) | コードオーナー定義 |
| [tools/policy/check_pr_contract.sh](../../tools/policy/check_pr_contract.sh) | DocDD ポリシーチェック |
| [.claude/skills/pr-review-governance/SKILL.md](../../.claude/skills/pr-review-governance/SKILL.md) | AC レビュー観点スキル |

---

## 参考

- [Conventional Commits](https://www.conventionalcommits.org/)
- [trunk-based development](https://trunkbaseddevelopment.com/)
- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
