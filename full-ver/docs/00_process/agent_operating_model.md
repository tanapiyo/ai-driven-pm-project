# Agent Operating Model

AI エージェント（GitHub Copilot, Claude Code 等）がこのリポジトリで自走するための運用モデル。

---

## Canonical Reference

**AGENTS.md** がすべてのエージェントの正史（canonical）です。
他のファイル（CLAUDE.md, .github/copilot-instructions.md）と矛盾がある場合は AGENTS.md に従ってください。

---

## Getting Started (エージェント向け)

新しいタスクを開始する際は、以下の順序で進めてください：

### 1. Read Contract First

```bash
# まず AGENTS.md を読む
cat AGENTS.md

# プロセス定義を確認
cat docs/00_process/process.md
```

### 2. Understand the Task

- タスクの種類を判断（新機能 / バグ修正 / アーキ変更 / UI 変更）
- 必要な成果物を確認（Required Artifacts per Change Type）

### 3. DocDD Workflow

```
Spec → Plan → Tasks → Implement → QA → Release
```

**重要**: Spec/Plan なしで Implement に進まない。

---

## Agent Roles

| ID | Purpose | Key Outputs | Gate |
|----|---------|-------------|------|
| `Orchestrator` | リクエストをルーティング、worktree管理 | routing decision, worktree context | 適切なエージェントに割り当て |
| `ProductIdentity_PdM` | プロダクト意図・Spec作成 | identity.md, prd.md, spec.md | AC/NFRが存在 |
| `ProductDesigner` | UX/IA/UI要件整備 | ux_flows.md, ui_requirements.md | ACとUI要件の整合 |
| `DesignSystem` | デザイン契約を固定 | tokens.json, overview.md | 命名規則が文書化 |
| `Architect` | ADR/Planを作成 | adr/*.md, plan.md | 代替案/トレードオフ記載 |
| `QA` | テスト設計と検証 | test-plan/*.md, evidence/* | ACカバレッジ |
| `Implementer` | 最小差分で実装 | code + tests + docs | contract 成功, docs drift なし |
| `Reviewer` | Staff視点でレビュー | review comments | DocDDリンク完備 |

詳細なプロンプトは `prompts/agents/` を参照。

### Claude Code Sub-Agents（並列実行）

Claude Code 使用時は、以下のサブエージェントが **並列実行** で自動的に利用可能になります。

**設定場所**: `.claude/agents/*.md`

| Agent | Purpose | Tools | Mode |
|-------|---------|-------|------|
| `repo-explorer` | コードベース探索 | Read, Grep, Glob | read-only, 並列 |
| `security-auditor` | セキュリティ監査 | Read, Grep, Glob | read-only, 並列 |
| `test-runner` | テスト/lint 実行 | Bash, Read | 自動実行 |
| `e2e-runner` | E2E テスト実行・失敗分析 | Bash, Read, Grep, Glob | オンデマンド |
| `code-reviewer` | コードレビュー | Read, Grep, Glob | read-only, 並列 |
| `issue-project-manager` | Epic/Project ライフサイクル状態管理 | Bash, Read, Grep, Glob | オンデマンド |
| `implementer` | 最小差分実装 | All | メイン作業 |

**並列実行フロー**:

```text
User: "認証機能を追加"
  ├─ repo-explorer: 関連コード探索 (背景)
  ├─ security-auditor: 認証のセキュリティ確認 (背景)
  └─ code-reviewer: 既存認証コードの品質確認 (背景)
      ↓ (結果統合)
  implementer: 実装
      ↓
  test-runner: テスト実行
```

**詳細**: [ADR-0005](../02_architecture/adr/0005_claude_code_subagents.md) を参照

### Frontend Operation Flow (kickoff → implement → pr-check)

フロントエンド変更時の標準運用フロー:

```text
1. /kickoff #<issue>
   ├─ Step 1: SDD Artifact Check
   │   ├─ Issue DoD 確認
   │   ├─ Screen Spec 参照 (docs/01_product/screens/)
   │   └─ AC 抽出 + UI State AC 追加
   │       ├─ Loading / Empty / Error / PermissionDenied
   │       └─ Dark Mode / Responsive
   ├─ Step 2: Parallel Exploration
   │   ├─ repo-explorer: FSD構造・既存コンポーネント探索
   │   ├─ security-auditor: 入力バリデーション・XSS確認
   │   └─ code-reviewer: Design system・Dark mode準拠確認
   └─ Step 5: 実装計画 + Evidence Plan 策定

2. implement
   ├─ FSD slice 構造作成 (ui/ model/ api/ index.ts)
   ├─ Dark mode 対応 (neutral-*, dark: variants)
   ├─ UI states 実装 (Loading/Empty/Error)
   └─ Quality gates: format → lint → typecheck → test

3. /pr-check
   ├─ Step 0: Issue Link + Frontend Change Detection
   ├─ Step 1: Parallel Checks
   │   ├─ test-runner: lint → typecheck → test → build
   │   ├─ security-auditor: secrets, auth, deps
   │   └─ code-reviewer: DocDD + Frontend Quality
   │       ├─ Dark mode compliance
   │       ├─ Design system compliance
   │       ├─ FSD boundary check
   │       └─ UI state coverage
   ├─ Step 2: Frontend Evidence Check
   │   └─ BLOCK if: screenshots/E2E evidence missing
   └─ Verdict: Ready to merge / Needs fixes
```

---

## Skills (再利用可能な技能)

エージェントが適用すべきスキル。詳細は `docs/00_process/skills_catalog.md` および `prompts/skills/` を参照。

| ID | Trigger | Purpose |
|----|---------|---------|
| `Skill.Read_Contract_First` | 新タスク開始時 | 制約を把握 |
| `Skill.DocDD_Spec_First` | 機能/アーキ変更時 | Spec/Plan を先に作成 |
| `Skill.Minimize_Diff` | CI失敗/レビュー指摘時 | 最小差分に収束 |
| `Skill.Fix_CI_Fast` | contract failing | 3ループで原因を記録 |
| `Skill.Policy_Docs_Drift` | コード変更時 | Docs更新漏れをチェック |
| `Skill.Review_As_Staff` | Reviewer起動時 | Staff視点でレビュー |
| `Skill.DevContainer_Safe_Mode` | firewall/permission問題時 | 安全な復旧 |

---

## Autonomy Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `risk_profile` | `safe` | 危険操作は必ず確認を求める |
| `allow_auto_commit` | `true` | 自動コミット許可 |
| `allow_auto_pr` | `true` | 自動PR作成許可 |
| `dangerously_skip_permissions` | `false` | 危険なpermission skip禁止 |

### safe モードで禁止される操作

以下は明示的な承認が必要：

- force push
- main/master への直接 push
- 既存ファイルの削除
- セキュリティ設定の変更

### YOLO モード（DevContainer headless 実行）

DevContainer 内での完全無人実行を有効にするモード。

| Setting | Value | Description |
|---------|-------|-------------|
| `dangerously_skip_permissions` | `true` | 全ての権限チェックをバイパス |
| `max_turns` | `30`（デフォルト） | エージェントループの最大ターン数 |
| `environment` | `DEVCONTAINER=true` | 自動検出トリガー |

**有効化条件（いずれか）:**
- `/autopilot --yolo #123` フラグ指定
- `DEVCONTAINER=true` 環境変数が設定されている場合（自動有効化）

**安全ガード:**
- DevContainer ファイアウォール（deny-by-default allowlist）
- `--max-turns` によるコスト制限
- worktree 隔離（main ブランチ直接編集不可）
- 品質ゲートは YOLO モードでも省略不可

**前提条件:**
- `claude setup-token` でホスト上で OAuth トークンを生成済み
- `CLAUDE_CODE_OAUTH_TOKEN` が `.devcontainer/.env.devcontainer` に設定済み
- Codex CLI: `codex login` でホスト上で認証済み（任意）

---

## Golden Commands

すべて `./tools/contract` 経由で実行：

```bash
./tools/contract format      # フォーマット
./tools/contract lint        # 静的解析
./tools/contract typecheck   # 型チェック
./tools/contract test        # ユニットテスト
./tools/contract build       # ビルド
./tools/contract e2e         # E2E テスト
./tools/contract migrate     # DB マイグレーション
./tools/contract deploy-dryrun # デプロイのドライラン
```

**重要**: 直接 `pnpm lint` や `cargo test` を叩かない。

---

## Policy Checks

CI で実行されるポリシーチェック：

```bash
./tools/policy/check_docdd_minimum.sh        # 必須成果物の存在確認
./tools/policy/check_instruction_consistency.sh  # instructions の整合性確認
./tools/policy/check_pr_contract.sh          # PR テンプレの記入確認
./tools/policy/check_required_artifacts.sh   # 変更タイプごとの成果物確認
```

---

## Failure Recovery

### CI が失敗した場合

1. `Skill.Fix_CI_Fast` を適用
2. 依存 → 設定 → 環境の順で切り分け
3. format → lint → typecheck → test → build の順で修正
4. 3ループで直らなければ原因を `docs/03_quality/` に記録して止める

### レビューで指摘を受けた場合

1. `Skill.Minimize_Diff` を適用
2. 原因を1つに絞る
3. 変更を分割（docs-only / code-only / refactor）
4. 不要な変更を revert

---

## Related Documents

- Canonical Instructions: `AGENTS.md`
- Process Definition: `docs/00_process/process.md`
- Skills Catalog: `docs/00_process/skills_catalog.md`
- Agent Prompts: `prompts/agents/`
- Skill Prompts: `prompts/skills/`
