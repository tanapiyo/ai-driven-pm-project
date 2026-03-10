# 進捗報告自動化スクリプト

このディレクトリには、週次進捗報告書作成を効率化するスクリプトが含まれています。

## 📁 スクリプト一覧

| スクリプト名 | 用途 | 所要時間 |
|------------|------|---------|
| [collect_weekly_data.sh](#collect_weekly_datash) | Git履歴とプロジェクトデータを収集 | 〜1分 |
| [generate_git_report.sh](#generate_git_reportsh) | Git履歴から詳細レポートを生成 | 〜1分 |
| [weekly_report_workflow.sh](#weekly_report_workflowsh) | 全自動ワークフロー（対話形式） | 〜3分 |

## 🚀 クイックスタート

### 初回のみ: 実行権限を付与

```bash
chmod +x 05_進捗報告/scripts/*.sh
```

### 基本的な使い方

```bash
# outputディレクトリへ移動
cd 05_進捗報告

# 全自動ワークフローを実行（推奨）
./scripts/weekly_report_workflow.sh
```

これだけで、週次進捗報告書作成に必要なデータが全て収集されます。

## 📋 スクリプト詳細

### collect_weekly_data.sh

**用途**: Git履歴データを収集し、進捗報告書のインプットデータを準備

**実行方法**:
```bash
# 過去7日間のデータを収集（デフォルト）
./scripts/collect_weekly_data.sh

# 過去14日間のデータを収集
./scripts/collect_weekly_data.sh 14

# ファイルに保存
./scripts/collect_weekly_data.sh > output/weekly_data.txt
```

**出力内容**:
1. Git履歴詳細（コミットハッシュ、作成者、日付、メッセージ）
2. コミット統計（作成者別コミット数）
3. ブランチ情報（マージ済みブランチ）
4. ファイル変更統計（変更頻度Top 10）
5. コード変更量（追加・削除行数）
6. リリース情報（タグ）
7. サマリー（総コミット数、参加者数など）

**次のステップ**:
- 出力を `output/weekly_data.txt` に保存
- プロンプト「Git履歴から進捗レポート自動生成.md」と一緒にAIツールへ入力

---

### generate_git_report.sh

**用途**: Git履歴から詳細な進捗レポートを生成（Conventional Commits対応）

**実行方法**:
```bash
# 過去7日間のレポート生成
./scripts/generate_git_report.sh "7 days ago" "now"

# 特定期間のレポート生成
./scripts/generate_git_report.sh "2025-10-19" "2025-10-26"

# ファイルに保存
./scripts/generate_git_report.sh > output/git_report.txt
```

**出力内容**:
1. コミット分類（feat/fix/docs/refactor/test）
2. 主要なコミット一覧（新機能、バグ修正）
3. ファイル別変更統計（Top 10）
4. 日別アクティビティ
5. 作成者別統計
6. AI入力用フォーマット済みデータ

**Conventional Commits対応**:
- `feat:` → 新機能
- `fix:` → バグ修正
- `docs:` → ドキュメント
- `refactor:` → リファクタリング
- `test:` → テスト

**次のステップ**:
- AI入力用データをプロンプトと一緒に使用

---

### weekly_report_workflow.sh

**用途**: 週次進捗報告書作成の全プロセスを自動化（対話形式）

**実行方法**:
```bash
./scripts/weekly_report_workflow.sh
```

**実行内容**:
1. プロジェクト情報の入力（対話形式）
   - プロジェクト名
   - 報告期間
   - データ収集期間

2. Gitリポジトリチェック

3. Git履歴データ収集
   - `collect_weekly_data.sh` を自動実行
   - `output/weekly_data.txt` に保存

4. AI入力用ファイルの準備
   - `output/project_info.txt` を生成
   - セクション別ファイルの雛形を作成

5. 次のステップを案内

**生成されるファイル**:
```
output/
├── weekly_data.txt           # Git履歴データ
├── project_info.txt          # プロジェクト情報と次のステップ
├── section2_実績.md          # AIで生成（実績）
├── section4_スケジュール.md   # AIで生成（スケジュール）
├── section6-7_課題リスク.md  # AIで生成（課題・リスク）
└── section10_次週計画.md     # AIで生成（次週計画）
```

**次のステップ**:
1. 各プロンプトファイルをAIツールで実行
2. 生成結果を対応するsectionファイルに保存
3. 最終統合プロンプトで週次進捗報告書を完成

---

## 🎯 推奨ワークフロー

### 毎週金曜日の作業

```bash
# ステップ1: 全自動ワークフローを実行
cd 05_進捗報告
./scripts/weekly_report_workflow.sh

# ステップ2: AIツール（ChatGPT/Claude等）で各セクションを生成
# 以下を順番にAIツールへ入力:

# 2-1. 実績レポート生成
# プロンプト: プロンプト/Git履歴から進捗レポート自動生成.md
# データ: output/weekly_data.txt
# → 結果を output/section2_実績.md に保存

# 2-2. スケジュール分析
# プロンプト: プロンプト/遅延リスク判定.md
# データ: WBS、残タスク情報
# → 結果を output/section4_スケジュール.md に保存

# 2-3. 課題・リスク分析
# プロンプト: プロンプト/課題リスク分析.md
# データ: 課題管理表、リスク管理表
# → 結果を output/section6-7_課題リスク.md に保存

# 2-4. 次週計画生成
# プロンプト: プロンプト/次週計画生成.md
# データ: WBS、今週の進捗
# → 結果を output/section10_次週計画.md に保存

# ステップ3: 最終統合
# プロンプト: プロンプト/進捗報告書自動生成.md
# データ: 上記4つのsectionファイル + その他情報
# → 結果を output/週次進捗報告書_2025-WXX.md に保存
```

**所要時間: 約30-45分**

---

## 💡 Tips

### 1. データ収集の期間をカスタマイズ

```bash
# 2週間分のデータを収集
./scripts/collect_weekly_data.sh 14

# 1ヶ月分のデータを収集
./scripts/collect_weekly_data.sh 30
```

### 2. 複数のレポート形式を生成

```bash
# 簡易版
./scripts/collect_weekly_data.sh 7 > output/weekly_data.txt

# 詳細版
./scripts/generate_git_report.sh "7 days ago" "now" > output/git_report_detail.txt
```

### 3. スクリプトをプロジェクトに合わせてカスタマイズ

各スクリプトは編集可能です。プロジェクト固有の要件に合わせて調整してください。

例:
- Gitコマンドのフォーマット変更
- 追加のデータソース連携（Jira、Redmine等）
- レポートフォーマットのカスタマイズ

---

## ❓ トラブルシューティング

### Q1: スクリプトが実行できない

```bash
# 実行権限を確認
ls -l scripts/*.sh

# 実行権限を付与
chmod +x scripts/*.sh
```

### Q2: Gitデータが取得できない

```bash
# Gitリポジトリ内で実行しているか確認
git status

# リモートから最新を取得
git fetch origin
git pull origin main
```

### Q3: 出力ファイルが空

```bash
# 対象期間にコミットがあるか確認
git log --since="7 days ago" --oneline

# デバッグモードで実行
bash -x scripts/collect_weekly_data.sh
```

### Q4: macOSとLinuxでコマンドが異なる

一部のコマンド（特にdate）はmacOSとLinuxで動作が異なります。
スクリプト内で両方に対応していますが、エラーが出る場合はOSに合わせて調整してください。

---

## 📚 関連ドキュメント

- [../README.md](../README.md) - 進捗報告全体の概要
- [../プロンプト/](../プロンプト/) - AIプロンプト集
- [../テンプレート/](../テンプレート/) - 週次進捗報告書テンプレート

---

**最終更新**: 2025-10-26
