# プロジェクト管理ガイド

このドキュメントは、Kodama Funds リポジトリにおける GitHub Project ボードの運用方針と
週次マイルストーン（スプリント）の運用ルールを定義します。

---

## 1. 単一ボードポリシー

### 基本方針

**すべての開発作業は単一の GitHub Project ボードで管理する。**

| 項目     | ルール                                                               |
| -------- | -------------------------------------------------------------------- |
| ボード数 | **1 つのみ**（複数ボードは禁止）                                     |
| ボード名 | `Kodama Funds`                                                       |
| 対象     | バックエンド・フロントエンド・インフラ・ドキュメントを問わず全 Issue |
| オーナー | `CoDaMa-LDH-Funs` Organization                                       |

### 理由

- 進捗の一元把握が可能になる
- Issue の優先度を横断的に比較できる
- スプリントのキャパシティ管理が容易になる
- ステータスの重複管理による認知コストを削減できる

### ボードのカラム構成

| カラム          | 意味                           | 遷移条件                                   |
| --------------- | ------------------------------ | ------------------------------------------ |
| **Backlog**     | 未着手・優先度未確定の Issue   | Issue 作成時のデフォルト                   |
| **Sprint**      | 今スプリントで着手予定の Issue | スプリント計画でマイルストーンを割り当て時 |
| **In Progress** | 実装中の Issue                 | ブランチ作成・PR Draft 作成時              |
| **In Review**   | PR レビュー待ち                | PR を `Ready for Review` に変更時          |
| **Done**        | 完了（PR マージ済み）          | PR マージ時に自動遷移                      |

### ボードへの Issue 追加ルール

- 新規 Issue は自動的にボードに追加されることが望ましい（Auto-add workflow を設定する）
- 手動追加が必要な場合は Issue 作成直後に追加する
- ボードに登録されていない Issue は存在しないものとして扱う

---

## 2. 週次マイルストーン（スプリント）命名規則

### フォーマット

```
Sprint N
```

| 項目   | ルール                         | 例            |
| ------ | ------------------------------ | ------------- |
| 接頭辞 | `Sprint` （固定）              | `Sprint`      |
| 番号   | プロジェクト開始からの通し番号 | `1`, `2`, `3` |

**起算ルール**: 2026年3月第1週（ISO W10）= Sprint 1。以降、週ごとに +1。

**計算式**: `Sprint N = ISO Week Number - 9`

例:

- `Sprint 1`（ISO W10: 2026-03-02 〜 2026-03-08）
- `Sprint 2`（ISO W11: 2026-03-09 〜 2026-03-15）
- `Sprint 3`（ISO W12: 2026-03-16 〜 2026-03-22）
- `Sprint 4`（ISO W13: 2026-03-23 〜 2026-03-29）

### 週の定義

- 週の開始: **月曜日**
- 週の終了: **日曜日**
- デューデート（`due_on`）: 日曜日 23:59:59 UTC

### 現在設定済みのマイルストーン

| マイルストーン | 期間                     | ISO Week | デューデート |
| -------------- | ------------------------ | -------- | ------------ |
| `Sprint 1`     | 2026-03-02 〜 2026-03-08 | W10      | 2026-03-08   |
| `Sprint 2`     | 2026-03-09 〜 2026-03-15 | W11      | 2026-03-15   |
| `Sprint 3`     | 2026-03-16 〜 2026-03-22 | W12      | 2026-03-22   |
| `Sprint 4`     | 2026-03-23 〜 2026-03-29 | W13      | 2026-03-29   |

---

## 3. スプリント-マイルストーン同期運用

### スプリント = マイルストーン

1 スプリント = 1 週間（月〜日）= 1 GitHub マイルストーン。
Linear Cycle と GitHub Milestone を 1:1 で対応させる（Linear を使用する場合）。

### スプリント開始時の手順（毎週月曜日）

```bash
# 1. 次のスプリントのマイルストーンを作成する（2週先まで常に存在させることを推奨）
gh api repos/CoDaMa-LDH-Funs/codama-ldh/milestones --method POST \
  -f title="Sprint N" \
  -f due_on="YYYY-MM-DDT23:59:59Z" \
  -f description="Week NN: YYYY-MM-DD 〜 YYYY-MM-DD"

# 2. スプリント計画: Sprint カラムの Issue にマイルストーンを割り当てる
gh issue edit <issue-number> --milestone "Sprint N"

# 3. ボードの Sprint カラムに今週の Issue が並んでいることを確認する
```

### スプリント終了時の手順（毎週日曜日または月曜日頭）

```bash
# 1. 完了した Issue の確認（マイルストーンのクローズは不要、自動クローズを使用）
gh api repos/CoDaMa-LDH-Funs/codama-ldh/milestones/<milestone-number> \
  2>&1 | python3 -c "import sys,json; d=json.load(sys.stdin); \
  print(f'Open: {d[\"open_issues\"]}, Closed: {d[\"closed_issues\"]}')"

# 2. 未完了 Issue は次スプリントへキャリーオーバーする
gh issue edit <issue-number> --milestone "Sprint N+1"

# 3. 現スプリントマイルストーンをクローズする（全 Issue がクローズされていれば自動）
gh api repos/CoDaMa-LDH-Funs/codama-ldh/milestones/<milestone-number> \
  --method PATCH -f state="closed"
```

### マイルストーン先行作成ポリシー

- 常に **直近 2 週分以上**のマイルストーンを事前作成しておく
- スプリント計画会議の前日（日曜日）までに翌週のマイルストーンを作成する

---

## 4. Issue 作成時のマイルストーン割り当てルール

### 基本ルール

| 状況                     | マイルストーン割り当て                                |
| ------------------------ | ----------------------------------------------------- |
| 今スプリントで着手する   | 現在のスプリントマイルストーン（例: `Sprint 1`）      |
| 次スプリントで着手予定   | 次のスプリントマイルストーン（例: `Sprint 2`）        |
| 優先度は高いが時期未定   | 割り当てなし（Backlog として管理）                    |
| バックログ（いつか対応） | 割り当てなし                                          |
| バージョンリリース向け   | バージョンマイルストーン（例: `v1.0 - MVP リリース`） |

### 判断フロー

```
Issue 作成時
    ↓
今スプリントで作業できる（キャパシティあり）?
    ├─ Yes → 今週のスプリントマイルストーンを割り当てる
    └─ No
        ↓
        次スプリントに組み込む予定?
            ├─ Yes → 次週のスプリントマイルストーンを割り当てる
            └─ No → マイルストーンなし（Backlog のまま）
```

### スプリント計画での割り当て

スプリント計画（毎週月曜日の冒頭）で Backlog の Issue を確認し、
今スプリントで着手するものにマイルストーンを割り当てる:

```bash
# Issue にマイルストーンを割り当てる
gh issue edit <issue-number> --milestone "Sprint 1"

# 複数 Issue を一括確認
gh issue list --milestone "" --label "priority:must" \
  --json number,title,labels
```

---

## 5. GitHub Project ボードの操作手順

### ボードの確認

```bash
# プロジェクト一覧（read:project スコープが必要）
gh project list --owner CoDaMa-LDH-Funs
```

> **注意**: `read:project` スコープが GitHub Personal Access Token に含まれていない場合、
> 上記コマンドは失敗します。その場合は `gh auth refresh -s read:project` でスコープを追加してください。

### Issue をボードに追加する

```bash
# Issue をプロジェクトに追加（project-number はボードの番号）
gh project item-add <project-number> \
  --owner CoDaMa-LDH-Funs \
  --url "https://github.com/CoDaMa-LDH-Funs/codama-ldh/issues/<issue-number>"
```

### ステータスを更新する

ボード上のステータス（カラム）は GitHub Project UI または CLI で更新する:

```bash
# Issue のプロジェクトフィールドを更新（project-id, item-id, field-id が必要）
gh project item-edit --project-id <project-id> \
  --id <item-id> \
  --field-id <field-id> \
  --single-select-option-id <option-id>
```

実際の ID は UI から取得するか、GraphQL API で確認する:

```bash
gh api graphql -f query='
{
  organization(login: "CoDaMa-LDH-Funs") {
    projectsV2(first: 10) {
      nodes { id title number }
    }
  }
}'
```

---

## 6. 既存運用との差分（移行メモ）

### マイルストーン命名の統一

`issue-operation-rules.md` では `Sprint N - YYYY-MM-DD` 形式が定義されていましたが、
本ガイドでは **`Sprint N` 形式に統一** します。

| 旧形式（非推奨）        | 新形式（採用） |
| ----------------------- | -------------- |
| `Sprint 1 - 2026-01-13` | `Sprint 1`     |
| `Sprint 2026-W10`       | `Sprint 1`     |

**起算ルール**: 2026年3月第1週（ISO W10）= Sprint 1。`Sprint N = ISO Week - 9`。

`issue-operation-rules.md` のスプリント節は本ドキュメントが上書きします。

---

## 7. FAQ

### Q: マイルストーンを付け忘れた場合は?

スプリント計画時に一括で割り当てる。日常的な漏れは許容し、週次レビューで補正する。

### Q: Issue が複数スプリントにまたがる場合は?

1 スプリントで完了できるよう Issue を分割することを推奨する。
やむを得ずまたがる場合は、現スプリントのマイルストーンを維持し、終了時に次へキャリーオーバーする。

### Q: ホットフィックスはどのマイルストーンに割り当てるか?

現在進行中のスプリントマイルストーンに割り当てる。
リリース依存の修正は対応するバージョンマイルストーンに割り当てる。

### Q: GitHub Project の `read:project` スコープがない場合は?

マイルストーンの作成・割り当ては `repo` スコープのみで可能。
GitHub Project のボード操作には `read:project` / `project` スコープが必要。

スコープを追加する:

```bash
gh auth refresh -s read:project
```

---

## 関連ドキュメント

| ファイル                                   | 説明                                                   |
| ------------------------------------------ | ------------------------------------------------------ |
| `docs/00_process/issue-operation-rules.md` | Issue タイトル・ラベル・マイルストーン命名規則（SSOT） |
| `docs/00_process/git_and_pr_governance.md` | Git/PR 運用ルール                                      |
| `docs/00_process/process.md`               | 開発プロセス定義                                       |
| `AGENTS.md`                                | エージェント向け規約（canonical）                      |
