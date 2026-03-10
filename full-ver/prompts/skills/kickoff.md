# Skill: Kickoff Development Workflow

## Trigger

- 新しい開発タスクを開始するとき
- `/kickoff` コマンド実行時
- `/kickoff <タスク説明>` でタスク説明付きで実行

## Purpose

開発を開始する前に必須のワークフローを実行し、正しい環境・手順で作業を開始する。
**このスキルは環境構築を自動実行する。ユーザーへの確認は行わない。**

---

## 実行モード

このスキルは 2 つのモードをサポート:

| モード | 説明 | ユースケース |
|--------|------|-------------|
| **IDE モード** | VS Code DevContainer 内で Claude を実行 | VS Code ユーザー |
| **CLI モード** | ホストから Claude CLI を実行し、コマンドは DevContainer 内で実行 | ターミナル派、Vim/Emacs ユーザー |

**CLI モードの仕組み:**
- ファイル編集: ホストから直接（ボリュームマウントで同期）
- コマンド実行: `./tools/contract` 経由で自動的に DevContainer 内で実行
- DevContainer 未起動時は自動起動

---

## Automated Flow

### Step 1: 環境チェック

```bash
# 並列で実行
git worktree list && pwd
[[ -f "/.dockerenv" ]] || [[ -n "$REMOTE_CONTAINERS" ]] && echo "DEVCONTAINER: true" || echo "DEVCONTAINER: false"
```

**判定マトリクス:**

| Worktree       | DevContainer | Action                                            |
| -------------- | ------------ | ------------------------------------------------- |
| ❌ main にいる | ❌ 外        | → Step 2 を実行、Step 3 で選択肢を提示            |
| ✅ worktree    | ❌ 外        | → Step 3 で選択肢を提示                           |
| ❌ main にいる | ✅ 内        | → Step 2 を実行（異常系：main の DevContainer）   |
| ✅ worktree    | ✅ 内        | → Step 4 へ（準備完了）                           |

### Step 2: Worktree 自動作成

**ブランチ名の自動生成:**

1. タスク説明からブランチ名を生成
2. 命名規則: `<type>/<slug>`

| タスク種別キーワード       | type       |
| -------------------------- | ---------- |
| 機能, 追加, 実装, 開発     | `feat`     |
| 修正, バグ, fix            | `fix`      |
| ドキュメント, 文書, docs   | `docs`     |
| リファクタ, 整理           | `refactor` |
| その他                     | `chore`    |

**slug 生成ルール:**

- タスク説明から主要キーワードを抽出
- 英語に変換（ログイン → login, 認証 → auth）
- ケバブケースで連結（例: `add-login`, `user-auth`）

**実行コマンド:**

```bash
./tools/worktree/spawn.sh implementer <generated-branch-name>
```

### Step 3: 実行モード選択（DevContainer 外の場合）

DevContainer 外で実行された場合、以下の選択肢を提示:

**選択肢 A: CLI モード（推奨）**
- このセッションを継続
- DevContainer を起動（未起動の場合）
- `./tools/contract` 経由でコマンドを DevContainer 内で実行

**選択肢 B: IDE モード**
- VS Code DevContainer を起動
- 新しいウィンドウで `/kickoff` を再実行

```bash
# CLI モード: DevContainer を起動
cd <worktree-path>
./scripts/init-environment.sh

# IDE モード: VS Code DevContainer を起動
WORKTREE_PATH="/path/to/worktrees/<branch>"
code --folder-uri "vscode-remote://dev-container+$(echo -n "$WORKTREE_PATH" | xxd -p | tr -d '\n')/workspace"
```

### Step 4: Contract 読み込みと DocDD 成果物特定

1. **AGENTS.md を読み込む**
2. **タスク種別を判定**
3. **必要な DocDD 成果物を特定**

| タスク種別   | 必要な成果物                                           |
| ------------ | ------------------------------------------------------ |
| 新機能       | Spec + Plan + **OpenAPI/Tests (先)** + Tasks + Impl    |
| アーキ変更   | ADR + Impact Analysis + Migration Plan                 |
| UI 変更      | UI Requirements + AC update                            |
| バグ修正     | Issue link + **Tests (先)** + Fix                      |

**テストファースト原則**: ユニットテストなき実装は正解がわからない

---

## Decision Tree (Agent が従うフロー)

```text
START
  │
  ├─ [Check] 現在 main か worktree か？
  │    │
  │    ├─ main → [Action] Worktree を自動作成
  │    │           ↓
  │    │         [Check] 作成成功？
  │    │           ├─ Yes → 続行
  │    │           └─ No → エラー出力して終了
  │    │
  │    └─ worktree → 続行
  │
  ├─ [Check] DevContainer 内か？
  │    │
  │    ├─ No → [Ask] CLI モード or IDE モード？
  │    │         │
  │    │         ├─ CLI モード
  │    │         │    ↓
  │    │         │  [Action] DevContainer 起動（docker compose up）
  │    │         │    ↓
  │    │         │  [Output] 「CLI モードで準備完了」
  │    │         │    ↓
  │    │         │  続行 → Step 4
  │    │         │
  │    │         └─ IDE モード
  │    │              ↓
  │    │            [Action] VS Code DevContainer を起動
  │    │              ↓
  │    │            [Output] 「DevContainer で再度 /kickoff を実行してください」
  │    │              ↓
  │    │            END (このセッションは終了)
  │    │
  │    └─ Yes → 続行
  │
  ├─ [Action] AGENTS.md を読み込む
  │
  ├─ [Action] タスク種別を判定
  │
  ├─ [Output] 開発準備状況を出力
  │
  └─ END (準備完了)
```

---

## Output Format

### CLI モード準備完了

```markdown
## Kickoff 完了: <タスク説明>

### 環境 ✅
| 項目 | 状態 |
|------|------|
| Worktree | ✅ `feat/add-login` |
| 実行モード | 🖥️ CLI モード |
| DevContainer | ✅ 起動中 (`feat-add-login-dev`) |

### 動作
- ファイル編集: ホストから直接
- コマンド実行: `./tools/contract` → DevContainer 内で自動実行

### 制約 (AGENTS.md)
- DocDD: Spec/Plan/AC なしで実装しない
- Golden Commands: `./tools/contract` 経由で実行

### このタスクで必要な DocDD 成果物
- [ ] Spec (`.specify/specs/<id>/spec.md`)
- [ ] Plan (`.specify/specs/<id>/plan.md`)
- [ ] OpenAPI 仕様 (`docs/02_architecture/api/`) ← API がある場合
- [ ] Tests (実装前に作成)

### 次のステップ
1. Spec を作成: `Skill.DocDD_Spec_First` を実行
2. API 設計: `Skill.OpenAPI_Contract_First` を実行（API がある場合）
3. テスト作成: ユニットテストを先に書く
```

### IDE モード（DevContainer 起動案内）

```markdown
## Kickoff: <タスク説明>

### 環境構築
- [x] ブランチ名生成: `feat/add-login`
- [x] Worktree 作成: `worktrees/feat-add-login`
- [x] DevContainer 起動中...

DevContainer が起動したら、そのウィンドウで再度実行:
`/kickoff <タスク説明>`
```

### 準備完了（DevContainer 内で実行時）

```markdown
## Kickoff 完了: <タスク説明>

### 環境 ✅
| 項目 | 状態 |
|------|------|
| Worktree | ✅ `feat/add-login` |
| 実行モード | 🐳 IDE モード (DevContainer 内) |

### 制約 (AGENTS.md)
- DocDD: Spec/Plan/AC なしで実装しない
- Golden Commands: `./tools/contract` 経由で実行

### このタスクで必要な DocDD 成果物
- [ ] Spec (`.specify/specs/<id>/spec.md`)
- [ ] Plan (`.specify/specs/<id>/plan.md`)
- [ ] OpenAPI 仕様 (`docs/02_architecture/api/`) ← API がある場合
- [ ] Tests (実装前に作成)

### 次のステップ
1. Spec を作成: `Skill.DocDD_Spec_First` を実行
2. API 設計: `Skill.OpenAPI_Contract_First` を実行（API がある場合）
3. テスト作成: ユニットテストを先に書く
```

---

## Error Handling

### spawn.sh 失敗時

```bash
# リトライ or 手動案内
log_error "Worktree 作成に失敗しました"
echo "手動で実行: ./tools/worktree/spawn.sh implementer <branch-name>"
```

### VS Code 起動失敗時

```bash
# code コマンドが見つからない場合
echo "VS Code を手動で開いてください:"
echo "  1. VS Code で worktrees/<branch> を開く"
echo "  2. Cmd+Shift+P → 'Dev Containers: Reopen in Container'"
```

---

## Related Skills

- `Skill.Read_Contract_First`: 制約の詳細把握
- `Skill.Ensure_Worktree_Context`: Worktree コンテキスト確認
- `Skill.DocDD_Spec_First`: Spec/Plan 作成

## Prompt Reference

`prompts/skills/kickoff.md`
