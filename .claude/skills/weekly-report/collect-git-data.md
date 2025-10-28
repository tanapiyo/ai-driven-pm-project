# Skill: Git履歴データ収集

## 概要
週次進捗報告書作成のための第一ステップ。Git履歴から必要なデータを自動収集します。

## 実行内容

1. **outputディレクトリの準備**
   - `05_進捗報告/output/` ディレクトリが存在しない場合は作成

2. **Git履歴データの収集**
   - `05_進捗報告/scripts/collect_weekly_data.sh` を実行
   - 過去7日間のコミット履歴、統計、ブランチ情報を収集
   - 結果を `05_進捗報告/output/weekly_data.txt` に保存

3. **プロジェクト情報ファイルの生成**
   - 現在日時、週番号を取得
   - `05_進捗報告/output/project_info.txt` に以下を記録:
     - 収集日時
     - 対象期間
     - 次のステップの案内

4. **結果の確認と表示**
   - 収集されたデータの概要を表示
   - 次に実行すべきスキルを案内

## 実装手順

```bash
# 1. outputディレクトリ作成
mkdir -p 05_進捗報告/output

# 2. スクリプトに実行権限があるか確認
if [ ! -x 05_進捗報告/scripts/collect_weekly_data.sh ]; then
  chmod +x 05_進捗報告/scripts/collect_weekly_data.sh
fi

# 3. Git履歴データ収集を実行
cd 05_進捗報告
./scripts/collect_weekly_data.sh > output/weekly_data.txt

# 4. プロジェクト情報ファイルの生成
date=$(date +"%Y-%m-%d")
week=$(date +"%Y-W%V")

cat > output/project_info.txt << EOF
# プロジェクト情報

**収集日時**: $date
**報告期間**: $week
**データ収集期間**: 過去7日間

## 収集完了データ

- Git履歴: output/weekly_data.txt

## 次のステップ

以下のスキルを順次実行してください:

1. generate-progress (実績レポート生成)
2. analyze-schedule (スケジュール分析)
3. analyze-risks (課題・リスク分析)
4. plan-next-week (次週計画生成)
5. weekly-report (最終統合)
EOF

# 5. 結果の表示
echo "✅ Git履歴データを収集しました"
echo ""
echo "📁 生成ファイル:"
echo "  - 05_進捗報告/output/weekly_data.txt"
echo "  - 05_進捗報告/output/project_info.txt"
echo ""
echo "📊 収集データ概要:"
head -20 output/weekly_data.txt
echo ""
echo "💡 次のステップ: generate-progress スキルを実行してください"
```

## 出力ファイル

- `05_進捗報告/output/weekly_data.txt`: Git履歴データ
- `05_進捗報告/output/project_info.txt`: プロジェクト情報と次のステップ

## 想定所要時間

約1分
