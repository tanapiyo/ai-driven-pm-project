# ADR-0010: Epic Autopilot — Epic 実装オーケストレーション

## Status

Amended — 2026-03 (Issue #72): チームベース並列実行からシリアル実行へ変更

元の Decision は下部「元の Decision（チームベース）」セクションに保持。現在の Decision は「改定 Decision」セクションを参照。

---

## 改定 Decision（2026-03, Issue #72）

### 変更の背景

チームベース並列実行（TeamCreate/TeamDelete/SendMessage）には以下の問題があった：

- **ファイル競合リスク**: 同一ファイルへの同時変更がコンフリクトを引き起こす
- **管理オーバーヘッド**: チーム構成・タスク割当・送受信メッセージの追跡が複雑
- **デバッグ困難**: 複数エージェントの並列実行は状況把握が難しい
- **実態**: 大半の Epic でシリアル実行で十分であり、並列化のメリットが小さい

### 変更後のアーキテクチャ

`/epic-autopilot` をメインセッションで子 Issue をシリアルに実行するシンプルな方式に変更：

```
/epic-autopilot #<epic-number>
│
├─ Phase 0: Pre-flight (変更なし)
│   ├─ Epic 存在確認
│   ├─ 子 Issue 取得 (Sub-Issues API)
│   └─ 依存関係解析 (Mermaid / Issue 番号順)
│
├─ Phase 1: Execution Planning (簡素化)
│   ├─ 各 Issue のファイルスコープ推定
│   ├─ トポロジカルソートのみ（並列安全マトリクス廃止）
│   └─ 実装計画を Epic Body にメモ
│
├─ Phase 2: Serial Execution Loop (各 Issue を順番に実行)
│   ├─ Human Review Gate Check (変更なし)
│   ├─ implementer サブエージェントで /autopilot パイプライン実行
│   ├─ PR URL 収集
│   ├─ 次 Issue とのファイル重複チェック
│   │   └─ 重複あり → AskUserQuestion でマージ待ち確認
│   └─ Progress Update (Epic Body)
│
└─ Phase 3: Final Report (変更なし)
```

### 廃止されたもの

| 廃止 | 理由 |
|------|------|
| `TeamCreate` / `TeamDelete` | チームベース実行を廃止 |
| `SendMessage` | エージェント間通信不要 |
| 並列安全マトリクス | シリアル実行なので不要 |
| implementer-2 以降のスポーン | メインセッション + 1 implementer のみ |
| reviewer サブエージェント | /autopilot の Phase 6 に統合済み |

### PR マージ待ちゲート

シリアル実行においてファイル競合リスクを防ぐ新しいゲート：

- 各 Issue の PR 作成後、次 Issue とのファイルスコープを比較
- 重複ファイルがある場合 → `AskUserQuestion` で人間に PR マージを依頼
- 人間が確認後 → `git fetch origin main` して次 Issue の実装を開始
- 重複なしの場合 → 自動で次 Issue に進む

### 影響範囲

| 成果物 | 変更内容 |
|--------|----------|
| `.claude/commands/epic-autopilot.md` | TeamCreate/TeamDelete/SendMessage 削除、シリアルループに書き換え |
| `.claude/skills/epic-team-orchestration/SKILL.md` | DEPRECATED 化、チーム関連セクション削除、有用なパターンのみ保持 |
| `CLAUDE.md` | スキルテーブルの説明更新 |
| `docs/00_process/ai-development-governance.md` | 参照のみ（変更不要）|

### Positive Consequences（改定後）

- ファイル競合・コンフリクトのリスクを根本的に排除
- 実装フローがシンプルになり、デバッグ・状況把握が容易
- チーム管理オーバーヘッドの完全な排除
- `/autopilot` の品質ゲートをそのまま流用できる

### Negative Consequences（改定後）

- 並列実行による高速化を犠牲にする（大規模 Epic では遅くなる）
- PR マージ待ちでブロックする場合がある（人間のアクションが必要）

### References（改定）

- Issue #72: epic-autopilot シリアル実行変更
- `.claude/commands/epic-autopilot.md` — 現在のコマンド実装

---

## 元の Decision（チームベース）— 参照用

> 以下は ADR-0010 の元の Decision（Spike #678）。廃止済みだが、設計判断の経緯として保持する。

**元の Status:** Accepted (Spike #678)

## Context

現行の `/autopilot` は単一 Issue → PR パイプライン。Epic（複数 Issue の親子関係）を一括実装するには以下が不足：

- チーム構築（TeamCreate API）によるロール分担
- Opus + Codex CLI 両刀によるクロスモデル品質保証
- 並列実装時のファイル競合管理
- コンテキスト永続化（エージェント間共有）
- 上流工程（設計/要件定義）の人間レビューゲート

## Decision

### 成果物構成

| 成果物 | パス | 形態 |
|--------|------|------|
| `/epic-autopilot` コマンド | `.claude/commands/epic-autopilot.md` | Slash Command |
| `epic-team-orchestration` スキル | `.claude/skills/epic-team-orchestration/SKILL.md` | Knowledge Skill |

### 全体フロー

```
/epic-autopilot #<epic-number>
│
├─ Phase 0: Pre-flight
│   ├─ Epic 存在確認 (gh api)
│   ├─ 子 Issue 取得 (Sub-Issues API)
│   └─ 依存関係解析 (Mermaid パース or Issue 番号順)
│
├─ Phase 1: Execution Planning
│   ├─ 各 Issue のファイルスコープ推定
│   ├─ 並列安全マトリクス生成
│   ├─ 実装順決定 (トポロジカルソート)
│   └─ 実装計画を Epic Body にメモ (gh api PATCH)
│
├─ Phase 2: Team Construction
│   ├─ TeamCreate("epic-<N>")
│   ├─ TaskList にタスク登録
│   └─ チームメンバー spawning
│
├─ Phase 3: Execution Loop (各 Issue)
│   ├─ Human Review Gate Check
│   │   ├─ [spike/architecture] → 設計実施 → AskUserQuestion
│   │   └─ [else] → 自動続行
│   ├─ Implementation
│   │   ├─ worktree 作成
│   │   ├─ implementer に Task 割当
│   │   ├─ Quality Gates 実行
│   │   └─ PR 作成
│   ├─ Cross-Model Review
│   │   ├─ Codex MCP (main session) or CLI (subagent)
│   │   └─ code-reviewer (Claude)
│   └─ Progress Update
│       └─ Epic Body 更新 (完了 Issue マーク)
│
├─ Phase 4: Team Shutdown
│   ├─ 全メンバーに shutdown_request
│   └─ TeamDelete
│
└─ Phase 5: Final Report
    ├─ 全 Issue の実装状況
    ├─ PR URL 一覧
    ├─ レビュー結果サマリ
    └─ Epic Body 最終更新
```

### チーム構成

```
TeamCreate("epic-<N>")
├─ team-lead (main session, Opus)
│   ├─ オーケストレーション (Epic パース、実装順決定)
│   ├─ ファイルスコープ分析・競合検出
│   ├─ Codex MCP レビュー (MCP 利用可, xhigh)
│   ├─ 人間レビューゲート制御 (AskUserQuestion)
│   └─ Epic Body 更新 (gh api PATCH)
│
├─ implementer-1 (general-purpose, Opus)
│   ├─ Issue 実装 (worktree → code → test → PR)
│   ├─ Quality Gates 実行 (./tools/contract)
│   └─ Codex CLI レビュー (codex exec via Bash, xhigh)
│
├─ implementer-2 (general-purpose, Opus) [optional]
│   └─ 並列安全な Issue のみ担当
│       (ファイルスコープが重複しない場合のみ起動)
│
└─ reviewer (code-reviewer, Opus, read-only)
    └─ 各 PR のアーキテクチャ/DocDD レビュー
```

**モデル選択ポリシー:**
- **デフォルト: Opus** — 全エージェントは原則 Opus を使用
- **Codex: xhigh reasoning effort** — `model_reasoning_effort: "xhigh"` を必ず指定
- **Sonnet 許可条件**: 以下の単純作業のみ Sonnet にダウングレード可
  - フォーマット・lint の自動修正
  - テンプレートベースのファイル生成
  - 単純なファイルコピー・移動操作
- **判断不能な場合は Opus** (安全側フォールバック)

**スケーリングルール:**
- 子 Issue ≤ 3: implementer-1 のみ (逐次)
- 子 Issue 4-8: implementer-1 + implementer-2 (並列安全な場合)
- 子 Issue 9+: 段階的に実行 (同時最大 2 implementer)

### Opus / Codex ルーティング

**原則: 最も賢いモデルをデフォルトで使用する。**

| タスク | 実行者 | Claude モデル | Codex 利用 |
|--------|--------|--------------|-----------|
| Epic パース・実装順決定 | team-lead | **Opus** | - |
| ファイルスコープ分析 | team-lead | **Opus** | - |
| 設計 (Spike) | team-lead | **Opus** | - |
| 実装 | implementer | **Opus** | Codex CLI (レビュー, xhigh) |
| コードレビュー | reviewer | **Opus** | - |
| クロスモデルレビュー | team-lead | **Opus** | Codex MCP (xhigh) |
| 人間レビューゲート | team-lead | **Opus** | - |
| 単純作業 (format, 生成) | implementer | Sonnet (許可) | - |

**Codex 呼び出しパターン:**

| Context | Method | Primary Model | Fallback | Reasoning Effort |
|---------|--------|--------------|----------|-----------------|
| Main (team-lead) | `mcp__codex__codex` | **gpt-5.3-codex-spark** | gpt-5.3-codex → skip | **xhigh** |
| Subagent (implementer) | `codex exec` (Bash) | **gpt-5.3-codex-spark** | gpt-5.3-codex → skip | **xhigh** |
| Read-only (reviewer) | N/A | Codex 不可 | - | - |

**Codex モデル選択ルール (MUST):**
- **常に `gpt-5.3-codex-spark` を最優先で使用する**
- spark がレートリミットの場合のみ `gpt-5.3-codex` にフォールバック
- 両方レートリミットの場合は Codex をスキップ (ワークフローはブロックしない)
- `model_reasoning_effort` は必ず `"xhigh"` を指定

**Sonnet ダウングレード条件 (明示的許可がある場合のみ):**
- フォーマット自動修正 (`./tools/contract format`)
- テンプレートからの定型ファイル生成
- 設計判断を伴わない機械的操作

### ファイル競合管理

**Phase 1 で並列安全マトリクスを生成:**

```
Issue #A: src/features/auth/  → Group A
Issue #B: src/features/search/ → Group B  (並列可)
Issue #C: src/shared/ui/       → Group C  (A, B と並列可)
Issue #D: prisma/schema.prisma → Sequential (共有ファイル)
```

**判定ロジック (優先順):**

1. `.specify/specs/<id>/tasks.md` の `files:` メタデータ (最も正確)
2. Issue Body の影響範囲 (Impact Points) チェックリスト
3. Issue タイトル・ラベルからの推定 (フォールバック)
4. 必要に応じて repo-explorer で対象ファイルを特定
5. スコープ重複がある Issue ペアは逐次実行にフォールバック
6. 共有ファイル (index.ts, container.ts 等) は team-lead が逐次処理
7. **判定不能な場合は逐次実行** (安全側フォールバック)

**状態永続化 (ワークスペース内):**
```
.claude/autopilot/epic-<N>/
├── execution-plan.json    # 実装順、並列グループ、状態
├── file-scope-matrix.json # Issue → ファイルスコープ
├── progress.json          # 完了 Issue、PR URL、状態遷移
└── reviews/               # Codex/Claude レビュー結果
    ├── issue-<M>-codex.md
    └── issue-<M>-claude.md
```

**注意**: `.gitignore` に `.claude/autopilot/` を追加する。
実行状態はローカルのみで管理し、リポジトリにはコミットしない。

### 人間レビューゲート

**判定ルール (優先順):**

| 条件 | アクション | タイミング |
|------|-----------|-----------|
| Issue ラベルに `spike` 含む | 🚨 人間レビュー | 実施後 |
| Issue タイトルに `[Spike]` or `[設計]` | 🚨 人間レビュー | 実施後 |
| Issue ラベルに `architecture` 含む | 🚨 人間レビュー | 設計後 |
| Issue ラベルに `security` or `auth` 含む | 🚨 人間レビュー | 実装後 |
| Issue が DB マイグレーション変更を含む | 🚨 人間レビュー | 実装前 |
| Issue が API 破壊的変更を含む | 🚨 人間レビュー | 実装前 |
| `execution-plan.json` に `human-review: true` | 🚨 人間レビュー | 指定時 |
| 上記以外 | ✅ 自動続行 | - |

**ゲート実装:**
```
team-lead:
  1. Issue の設計/実装を実施
  2. 結果を表示
  3. AskUserQuestion:
     - "承認して次に進む"
     - "修正指示を出す"
     - "スキップして次に進む"
  4. ユーザー応答に基づき続行/修正/スキップ
```

### コンテキスト永続化

| 方式 | 用途 | 更新タイミング |
|------|------|---------------|
| Epic Body (gh api PATCH) | 実装順・進捗・完了 Issue | Phase 1, 各 Issue 完了時 |
| `.claude/autopilot/epic-<N>/` | ファイルスコープ・レビュー結果 | Phase 1, 各レビュー完了時 |
| TaskList (TeamCreate) | エージェント間タスク管理 | Phase 2, 各タスク状態変更時 |
| SendMessage | エージェント間即時通信 | 必要時 |

**Epic Body メモフォーマット (Phase 1 で追記):**
```markdown
---
### 🤖 Autopilot Execution Log

**実行開始**: 2026-02-17T05:00:00Z
**実装順序**:
1. ✅ #678 [Spike] 設計 → PR #xxx
2. 🔄 #679 [Feature] スキル作成 → In Progress
3. ⏳ #680 [Feature] コマンド作成
4. ⏳ #682 [Doc] ドキュメント更新

**並列グループ**: なし (逐次実行)
**ファイル競合**: なし
```

### Issue 状態遷移 (Finality States)

```
pending → in_progress → completed
                     → failed (3回リトライ後)
                     → human_blocked (レビュー待ち)
                     → skipped (ユーザー指示)
```

**Fail-Fast ポリシー:**
- 同一 Epic 内で **連続 2 Issue が `failed`** → 実行停止、ユーザーに報告
- `human_blocked` は停止ではなくキューイング (次の独立 Issue に進める)

### エラーハンドリング

| エラー | 対処 | 停止条件 |
|--------|------|---------|
| Issue 実装失敗 (QG 不合格) | 3回リトライ → Draft PR → `failed` | 連続 2 件で停止 |
| Codex レートリミット | spark → codex → skip | 非ブロッキング |
| TeamCreate 失敗 | チームなしモード (逐次) | 非ブロッキング |
| Epic Body PATCH 失敗 | 手動更新案内 → 続行 | 非ブロッキング |
| implementer クラッシュ | team-lead がリカバリ | 3回で停止 |
| 並列 git 競合 | 逐次に切替 | 非ブロッキング |

### 既存コマンドとの関係

| コマンド | 関係 |
|---------|------|
| `/autopilot` | `/epic-autopilot` の内部で各 Issue 実装時に参照 (ルート選択ロジック) |
| `/parallel-implement` | ファイルスコープ管理パターンを流用 |
| `/kickoff` | Pre-flight チェックパターンを流用 |
| `/pr-check` | Codex レビュー統合パターンを流用 |

## Consequences

### Positive

- Epic 単位での自動実装が可能になる
- チーム構成により並列実装の効率化
- Codex クロスモデルレビューで品質向上
- 人間レビューゲートで上流工程の品質担保
- コンテキスト永続化でエージェント間の情報共有

### Negative

- コマンドの複雑度が高い (autopilot の上位)
- TeamCreate API への依存 (安定性リスク)
- コンテキストウィンドウ消費が大きい (大規模 Epic)
- Epic Body の文字数制限に到達する可能性

### Risks

- 大規模 Epic (10+ Issues) でのパフォーマンス未検証
- Codex CLI のレートリミット頻度 (並列レビュー時)
- git 競合解決の自動化品質
- team-lead のコンテキストウィンドウ枯渇時のフォールバック

## References

- ADR-0005: Claude Code サブエージェント統合
- ADR-0008: 並列 Implementer アーキテクチャ
- `.claude/commands/autopilot.md` — 単一 Issue→PR パイプライン
- `.claude/commands/parallel-implement.md` — 並列実装コーディネーター
- `.claude/skills/codex-mcp-model/SKILL.md` — Codex モデル選択
- `.claude/skills/codex-review/SKILL.md` — Codex レビューテンプレート
- Epic #677: Epic Autopilot Issue
