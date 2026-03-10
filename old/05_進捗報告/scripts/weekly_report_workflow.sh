#!/bin/bash

##############################################################################
# 週次進捗報告ワークフロー自動化スクリプト
# 用途: 週次進捗報告書作成に必要なデータを一括で収集・整理
# 実行: ./weekly_report_workflow.sh
##############################################################################

set -e  # エラーで停止

# スクリプトのディレクトリ
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="${SCRIPT_DIR}/../output"
PROMPT_DIR="${SCRIPT_DIR}/../プロンプト"

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 出力ディレクトリ作成
mkdir -p "$OUTPUT_DIR"

##############################################################################
# ヘッダー
##############################################################################

clear
echo -e "${CYAN}=========================================="
echo "週次進捗報告ワークフロー"
echo "=========================================="
echo -e "${NC}"
echo "このスクリプトは以下を実行します:"
echo "1. プロジェクト情報の入力"
echo "2. Git履歴データの収集"
echo "3. AI入力用ファイルの準備"
echo ""
read -p "続行しますか？ (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "中止しました。"
    exit 0
fi

##############################################################################
# プロジェクト情報の入力
##############################################################################

echo ""
echo -e "${BLUE}=========================================="
echo "ステップ1: プロジェクト情報入力"
echo -e "==========================================${NC}"
echo ""

read -p "プロジェクト名: " PROJECT_NAME
read -p "報告期間（例: 2025年10月第4週）: " REPORT_PERIOD
read -p "データ収集期間（日数、デフォルト: 7）: " DAYS
DAYS=${DAYS:-7}

# 週番号を取得（ISO 8601形式）
WEEK_NUMBER=$(date +"%Y-W%V")

echo ""
echo "入力内容:"
echo "- プロジェクト名: ${PROJECT_NAME}"
echo "- 報告期間: ${REPORT_PERIOD}"
echo "- データ収集: 過去${DAYS}日間"
echo "- 週番号: ${WEEK_NUMBER}"
echo ""

##############################################################################
# Gitリポジトリチェック
##############################################################################

echo -e "${BLUE}=========================================="
echo "ステップ2: Gitリポジトリチェック"
echo -e "==========================================${NC}"
echo ""

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}エラー: Gitリポジトリが見つかりません${NC}"
    echo "このスクリプトはGitリポジトリ内で実行してください。"
    exit 1
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
echo -e "${GREEN}✓ リポジトリを確認: ${REPO_ROOT}${NC}"

# リポジトリルートに移動
cd "$REPO_ROOT"
echo ""

##############################################################################
# Git履歴データ収集
##############################################################################

echo -e "${BLUE}=========================================="
echo "ステップ3: Git履歴データ収集"
echo -e "==========================================${NC}"
echo ""

echo "データ収集中..."

# collect_weekly_data.shを実行
if [ -f "${SCRIPT_DIR}/collect_weekly_data.sh" ]; then
    bash "${SCRIPT_DIR}/collect_weekly_data.sh" "$DAYS" > "${OUTPUT_DIR}/weekly_data.txt" 2>&1
    echo -e "${GREEN}✓ Git履歴データを収集: ${OUTPUT_DIR}/weekly_data.txt${NC}"
else
    echo -e "${YELLOW}警告: collect_weekly_data.sh が見つかりません${NC}"
fi

echo ""

##############################################################################
# AI入力用ファイルの準備
##############################################################################

echo -e "${BLUE}=========================================="
echo "ステップ4: AI入力用ファイル準備"
echo -e "==========================================${NC}"
echo ""

# プロジェクト情報ファイル
PROJECT_INFO_FILE="${OUTPUT_DIR}/project_info.txt"

cat > "$PROJECT_INFO_FILE" << EOF
# プロジェクト情報

## 基本情報
- プロジェクト名: ${PROJECT_NAME}
- 報告期間: ${REPORT_PERIOD}
- 週番号: ${WEEK_NUMBER}
- データ収集期間: 過去${DAYS}日間

## 次のステップ

### セクション別レポート生成

#### 1. Git履歴から実績レポート生成
- プロンプト: ${PROMPT_DIR}/Git履歴から進捗レポート自動生成.md
- データ: ${OUTPUT_DIR}/weekly_data.txt
- 出力先: ${OUTPUT_DIR}/section2_実績.md

#### 2. スケジュール分析（遅延リスク判定）
- プロンプト: ${PROMPT_DIR}/遅延リスク判定.md
- 必要データ: 残タスク数、残期間、過去の完了タスク数
- 出力先: ${OUTPUT_DIR}/section4_スケジュール.md

#### 3. 課題・リスク分析
- プロンプト: ${PROMPT_DIR}/課題リスク分析.md
- 必要データ: 課題管理表、リスク管理表
- 出力先: ${OUTPUT_DIR}/section6-7_課題リスク.md

#### 4. 次週計画生成
- プロンプト: ${PROMPT_DIR}/次週計画生成.md
- 必要データ: WBS、今週の進捗、メンバー稼働状況
- 出力先: ${OUTPUT_DIR}/section10_次週計画.md

#### 5. 最終統合
- プロンプト: ${PROMPT_DIR}/進捗報告書自動生成.md
- 必要データ: 上記4つのセクション + その他情報
- 出力先: ${OUTPUT_DIR}/週次進捗報告書_${WEEK_NUMBER}.md

## 手動で準備が必要な情報

以下の情報は手動で準備してください:
- [ ] 予算状況（予算消化率、予算超過リスク）
- [ ] 品質状況（レビュー実施状況、不具合状況）
- [ ] 変更管理（変更要求、承認済み変更）
- [ ] その他特記事項

EOF

echo -e "${GREEN}✓ プロジェクト情報: ${PROJECT_INFO_FILE}${NC}"

##############################################################################
# ディレクトリ構造作成
##############################################################################

# セクション別の出力ファイル雛形を作成
touch "${OUTPUT_DIR}/section2_実績.md"
touch "${OUTPUT_DIR}/section4_スケジュール.md"
touch "${OUTPUT_DIR}/section6-7_課題リスク.md"
touch "${OUTPUT_DIR}/section10_次週計画.md"

echo -e "${GREEN}✓ セクション別ファイルを作成${NC}"

##############################################################################
# サマリー表示
##############################################################################

echo ""
echo -e "${CYAN}=========================================="
echo "完了！"
echo -e "==========================================${NC}"
echo ""
echo "生成されたファイル:"
echo ""
echo "1. Git履歴データ:"
echo "   ${OUTPUT_DIR}/weekly_data.txt"
echo ""
echo "2. プロジェクト情報:"
echo "   ${OUTPUT_DIR}/project_info.txt"
echo ""
echo "3. セクション別ファイル（AIで生成）:"
echo "   ${OUTPUT_DIR}/section2_実績.md"
echo "   ${OUTPUT_DIR}/section4_スケジュール.md"
echo "   ${OUTPUT_DIR}/section6-7_課題リスク.md"
echo "   ${OUTPUT_DIR}/section10_次週計画.md"
echo ""
echo -e "${YELLOW}次のアクション:${NC}"
echo ""
echo "1. プロンプトファイルを開く:"
echo "   open ${PROMPT_DIR}/"
echo ""
echo "2. AIツール（ChatGPT/Claude等）で各セクションを生成"
echo ""
echo "3. 生成結果を対応するsectionファイルに保存"
echo ""
echo "4. 最終統合プロンプトで週次進捗報告書を完成"
echo ""
echo -e "${GREEN}週次進捗報告書作成を開始できます！${NC}"
echo ""

# project_info.txtを自動で開く（オプション）
read -p "プロジェクト情報ファイルを開きますか？ (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v code &> /dev/null; then
        code "$PROJECT_INFO_FILE"
    elif command -v open &> /dev/null; then
        open "$PROJECT_INFO_FILE"
    else
        cat "$PROJECT_INFO_FILE"
    fi
fi

echo ""
echo "終了しました。"
