# Git履歴から進捗レポート自動生成プロンプト

## 目的

Git リポジトリのコミット履歴を分析し、週次進捗報告書のセクション2「今週の実績（自動生成）」を自動生成する。

---

## 前提条件

### 入力情報

以下の情報を提供してください：

1. **報告期間**: YYYY/MM/DD 〜 YYYY/MM/DD
2. **Git コミット履歴**: 以下のコマンドで取得
   ```bash
   # 指定期間のコミット履歴（詳細版）
   git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --pretty=format:"%h|%an|%ad|%s" --date=short --numstat

   # または簡易版
   git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --oneline --stat
   ```

3. **ブランチ情報**:
   ```bash
   # マージされたブランチ一覧
   git branch --merged main --format="%(refname:short)|%(authorname)|%(committerdate:short)"
   ```

4. **（オプション）Issue/タスク管理情報**: GitHub Issues、Jira、Linear などのタスク情報

---

## プロンプト本文

```
あなたはITプロジェクトのPMアシスタントです。
以下のGitコミット履歴を分析し、顧客向け週次進捗報告書の「今週の実績」セクションを生成してください。

# 報告期間
{開始日} 〜 {終了日}

# Gitコミット履歴
{ここにgit logの出力をペースト}

# タスク管理情報（オプション）
{GitHub IssuesやJiraのタスク情報をペースト}

---

## 生成要件

### 1. 開発活動サマリー（セクション2.1）

以下の統計情報を算出してください：
- **総コミット数**: コミットの総数
- **変更ファイル数**: 変更されたユニークなファイル数
- **追加行数/削除行数**: `git log --numstat`から算出
- **主要な貢献者**: コミット数TOP3の開発者

### 2. 実装完了機能（セクション2.2）

コミットメッセージを分析し、以下の基準で「実装完了機能」を抽出してください：

**抽出基準**:
- コミットメッセージに「feat:」「feature:」「add:」「implement:」「完了」「実装」などのキーワードが含まれる
- または複数のコミットが同じ機能に関連している（例: "ログイン機能"関連が5件など）
- mainブランチにマージされたブランチ（feature/xxx）

**出力形式**（表形式）:
| 機能名 | 担当者 | コミット数 | 完了日 | 主な変更内容 |
|--------|--------|-----------|--------|-------------|
| {機能名} | {担当者} | X件 | YYYY/MM/DD | {要約} |

**注意点**:
- 機能名は顧客にわかりやすい日本語で記載（技術用語を避ける）
- 「主な変更内容」は1行で簡潔に（30文字以内）
- コミットメッセージから機能の完了を推測できない場合は「作業中」として次のセクションに分類

### 3. 修正・改善項目（セクション2.3）

以下の種別に分類してください：

**抽出基準**:
- **バグ修正**: コミットメッセージに「fix:」「bug:」「修正」「エラー」「不具合」などが含まれる
- **リファクタリング**: 「refactor:」「cleanup:」「整理」「改善」などが含まれる
- **ドキュメント更新**: 「docs:」「README」「コメント追加」などが含まれる
- **テスト追加**: 「test:」「テスト追加」などが含まれる
- **パフォーマンス改善**: 「perf:」「performance:」「最適化」などが含まれる

**出力形式**（表形式）:
| 項目 | 種別 | 担当者 | コミット数 | 完了日 | 説明 |
|------|------|--------|-----------|--------|------|
| {項目名} | バグ修正/リファクタ/ドキュメント/テスト/パフォーマンス | {担当者} | X件 | YYYY/MM/DD | {要約} |

### 4. 作業中の項目（セクション2.4）

以下を「作業中」として抽出してください：

**抽出基準**:
- mainブランチにマージされていないfeatureブランチ
- 「WIP:」「作業中」「進行中」などのコミットメッセージ
- 最終更新が報告期間内だが完了していない機能

**出力形式**（表形式）:
| 機能名 | 担当者 | 進捗率 | 最終更新日 | 完了予定日 | 備考 |
|--------|--------|--------|-----------|-----------|------|
| {機能名} | {担当者} | XX% | YYYY/MM/DD | {推定日} | {状況} |

**進捗率の推定方法**:
- コミット数やブランチの状況から推定（例: 初期実装のみ→20%、レビュー待ち→80%）
- 推定が困難な場合は「-」または「調査中」と記載

---

## 出力形式

以下のMarkdown形式で出力してください：

\`\`\`markdown
## 2. 今週の実績（自動生成）

> **注記:** 本セクションはGitコミット履歴から自動生成されます

### 2.1 開発活動サマリー

**期間:** YYYY/MM/DD 〜 YYYY/MM/DD
**総コミット数:** XX件
**変更ファイル数:** XX件
**追加行数:** +XXX / **削除行数:** -XXX
**主要貢献者:** 開発者A(XX件)、開発者B(XX件)、開発者C(XX件)

### 2.2 実装完了機能

| 機能名 | 担当者 | コミット数 | 完了日 | 主な変更内容 |
|--------|--------|-----------|--------|-------------|
| ... | ... | ...件 | YYYY/MM/DD | ... |

### 2.3 修正・改善項目

| 項目 | 種別 | 担当者 | コミット数 | 完了日 | 説明 |
|------|------|--------|-----------|--------|------|
| ... | ... | ... | ...件 | YYYY/MM/DD | ... |

### 2.4 作業中の項目

| 機能名 | 担当者 | 進捗率 | 最終更新日 | 完了予定日 | 備考 |
|--------|--------|--------|-----------|-----------|------|
| ... | ... | XX% | YYYY/MM/DD | YYYY/MM/DD | ... |
\`\`\`

---

## 補足指示

1. **顧客向けの表現**:
   - 技術用語は避け、ビジネス価値に焦点を当てる
   - 例: ❌「Reactコンポーネントのリファクタ」 → ✅「画面表示速度の改善」
   - 例: ❌「APIエンドポイント追加」 → ✅「データ連携機能の実装」

2. **コミットメッセージが不明瞭な場合**:
   - 変更ファイル名から推測（例: `login.tsx`の変更 → ログイン機能関連）
   - 複数の小さなコミットは1つの機能にまとめる

3. **データが不足している場合**:
   - 「進捗率」や「完了予定日」が不明な場合は「要確認」と記載
   - 担当者が不明な場合はコミッターを記載

4. **機密情報の除外**:
   - APIキー、パスワード、内部システム名などは除外
   - 顧客に見せられない内部タスクは除外

5. **トーン**:
   - ポジティブで建設的な表現を使用
   - 問題点は「課題」ではなく「改善項目」として記載
```

---

## 使用例

### 入力例

**報告期間**: 2025/10/18 〜 2025/10/25

**Gitコミット履歴**:
```
abc123|田中太郎|2025-10-18|feat: ログイン画面UI実装
def456|鈴木花子|2025-10-19|fix: ログインエラー修正
ghi789|田中太郎|2025-10-20|feat: ログイン認証API連携
jkl012|佐藤次郎|2025-10-21|refactor: コード整理
mno345|鈴木花子|2025-10-22|docs: README更新
pqr678|田中太郎|2025-10-23|test: ログイン機能テスト追加
stu901|佐藤次郎|2025-10-24|feat: ダッシュボード画面実装（WIP）
```

### 出力例

```markdown
## 2. 今週の実績（自動生成）

> **注記:** 本セクションはGitコミット履歴から自動生成されます

### 2.1 開発活動サマリー

**期間:** 2025/10/18 〜 2025/10/25
**総コミット数:** 7件
**変更ファイル数:** 12件
**追加行数:** +456 / **削除行数:** -123
**主要貢献者:** 田中太郎(3件)、鈴木花子(2件)、佐藤次郎(2件)

### 2.2 実装完了機能

| 機能名 | 担当者 | コミット数 | 完了日 | 主な変更内容 |
|--------|--------|-----------|--------|-------------|
| ログイン機能 | 田中太郎 | 3件 | 2025/10/23 | 画面UI、認証API連携、テスト完了 |

### 2.3 修正・改善項目

| 項目 | 種別 | 担当者 | コミット数 | 完了日 | 説明 |
|------|------|--------|-----------|--------|------|
| ログインエラー修正 | バグ修正 | 鈴木花子 | 1件 | 2025/10/19 | 認証失敗時のエラー処理改善 |
| コード品質改善 | リファクタリング | 佐藤次郎 | 1件 | 2025/10/21 | 可読性向上のための整理 |
| ドキュメント整備 | ドキュメント | 鈴木花子 | 1件 | 2025/10/22 | セットアップ手順を追加 |

### 2.4 作業中の項目

| 機能名 | 担当者 | 進捗率 | 最終更新日 | 完了予定日 | 備考 |
|--------|--------|--------|-----------|-----------|------|
| ダッシュボード画面 | 佐藤次郎 | 30% | 2025/10/24 | 2025/10/28 | 初期実装中、レイアウト調整が必要 |
```

---

## Git履歴取得コマンド集

### 基本的なコマンド

```bash
# 1週間分のコミット履歴（詳細版）
git log --since="7 days ago" --pretty=format:"%h|%an|%ad|%s" --date=short --numstat

# 特定期間のコミット履歴
git log --since="2025-10-18" --until="2025-10-25" --pretty=format:"%h|%an|%ad|%s" --date=short

# 統計情報付き
git log --since="7 days ago" --stat --oneline

# 開発者別のコミット数
git shortlog --since="7 days ago" -s -n

# 変更行数の集計
git log --since="7 days ago" --numstat --pretty="%H" | awk 'NF==3 {plus+=$1; minus+=$2} END {printf("+%d -%d\n", plus, minus)}'

# ブランチ一覧（マージ済み）
git branch --merged main --format="%(refname:short)|%(authorname)|%(committerdate:short)"

# ブランチ一覧（未マージ = 作業中）
git branch --no-merged main --format="%(refname:short)|%(authorname)|%(committerdate:short)"
```

### 高度なコマンド

```bash
# 機能別にグループ化（feat, fix, refactorなど）
git log --since="7 days ago" --oneline | grep -E "^[a-f0-9]+ (feat|fix|refactor|docs|test|perf):"

# ファイル変更の多い順
git log --since="7 days ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -10

# 最も活発なディレクトリ
git log --since="7 days ago" --name-only --pretty=format: | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn | head -10

# Pull Request情報（GitHub）
gh pr list --state merged --search "merged:>=2025-10-18" --json number,title,author,mergedAt

# コミットメッセージの分類
git log --since="7 days ago" --pretty=format:"%s" | grep -E "^(feat|fix|refactor|docs|test|perf):" | cut -d: -f1 | sort | uniq -c
```

---

## Tips: Conventional Commitsの推奨

チームで以下のコミットメッセージ規約を採用すると、自動生成の精度が向上します：

```
<type>(<scope>): <subject>

type:
  - feat: 新機能
  - fix: バグ修正
  - refactor: リファクタリング
  - docs: ドキュメント
  - test: テスト追加
  - perf: パフォーマンス改善
  - chore: ビルド・設定変更

例:
  feat(login): ログイン画面UI実装
  fix(auth): 認証エラー修正
  refactor(api): APIクライアント整理
```

参考: https://www.conventionalcommits.org/

---

## 自動化スクリプト（オプション）

### Bashスクリプト例

```bash
#!/bin/bash
# generate_progress_report.sh

# 期間設定
START_DATE=${1:-"7 days ago"}
END_DATE=${2:-"now"}

echo "# Git Progress Report"
echo ""
echo "## Period: $(date -d "$START_DATE" +%Y/%m/%d) - $(date -d "$END_DATE" +%Y/%m/%d)"
echo ""

# 統計情報
echo "### Summary"
echo "- Total commits: $(git log --since="$START_DATE" --until="$END_DATE" --oneline | wc -l)"
echo "- Contributors: $(git shortlog --since="$START_DATE" --until="$END_DATE" -s -n | wc -l)"
echo "- Files changed: $(git log --since="$START_DATE" --until="$END_DATE" --name-only --pretty=format: | sort -u | wc -l)"

# コミット履歴
echo ""
echo "### Commit History"
git log --since="$START_DATE" --until="$END_DATE" --pretty=format:"%h|%an|%ad|%s" --date=short

# ブランチ情報
echo ""
echo "### Merged Branches"
git branch --merged main --format="%(refname:short)|%(authorname)|%(committerdate:short)"

echo ""
echo "### Active Branches (Not Merged)"
git branch --no-merged main --format="%(refname:short)|%(authorname)|%(committerdate:short)"
```

**使用方法**:
```bash
# 過去7日間のレポート生成
./generate_progress_report.sh "7 days ago" "now" > git_report.txt

# 特定期間のレポート生成
./generate_progress_report.sh "2025-10-18" "2025-10-25" > git_report.txt

# AIプロンプトに渡す
cat git_report.txt | pbcopy  # macOS
cat git_report.txt | xclip -selection clipboard  # Linux
```

---

## まとめ

このプロンプトを使用することで：

1. ✅ **手作業を削減**: Git履歴から自動的に進捗をまとめる
2. ✅ **客観性**: 主観に頼らず、コミット履歴という事実ベースで報告
3. ✅ **顧客向けの表現**: 技術用語を避け、ビジネス価値を強調
4. ✅ **一貫性**: 毎週同じフォーマットで報告可能

**次のステップ**:
- チームでConventional Commitsを採用
- 自動化スクリプトをCI/CDに組み込む
- GitHub ActionsやGitLab CIで週次レポートを自動生成
