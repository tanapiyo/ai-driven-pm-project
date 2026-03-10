#!/bin/bash

##############################################################################
# 週次データ収集スクリプト
# 用途: Git履歴とプロジェクトデータを収集し、進捗報告書作成の準備をする
# 実行: ./collect_weekly_data.sh [期間(日数)]
# 例:   ./collect_weekly_data.sh 7
##############################################################################

# デフォルト期間（日数）
DAYS=${1:-7}

# 出力ファイル
OUTPUT_DIR="$(dirname "$0")/../output"
mkdir -p "$OUTPUT_DIR"

# カラー出力用
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "週次データ収集スクリプト"
echo "対象期間: 過去${DAYS}日間"
echo "実行日時: $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="
echo ""

##############################################################################
# 1. Gitリポジトリチェック
##############################################################################

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}エラー: Gitリポジトリではありません${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Gitリポジトリを確認${NC}"
echo ""

##############################################################################
# 2. Git履歴データ収集
##############################################################################

echo "=========================================="
echo "## 1. Git履歴詳細"
echo "=========================================="
echo ""

# コミット履歴（ハッシュ、作成者、日付、メッセージ、変更ファイル統計）
echo "### コミット履歴"
echo ""
git log --since="${DAYS} days ago" \
    --pretty=format:"%h|%an|%ad|%s" \
    --date=short \
    --numstat 2>/dev/null || echo "履歴なし"

echo ""
echo ""

##############################################################################
# 3. コミット統計
##############################################################################

echo "=========================================="
echo "## 2. コミット統計"
echo "=========================================="
echo ""

echo "### 作成者別コミット数"
echo ""
git shortlog --since="${DAYS} days ago" -s -n 2>/dev/null || echo "統計なし"

echo ""
echo ""

##############################################################################
# 4. ブランチ情報
##############################################################################

echo "=========================================="
echo "## 3. ブランチ情報"
echo "=========================================="
echo ""

# デフォルトブランチを取得（main or master）
DEFAULT_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')
if [ -z "$DEFAULT_BRANCH" ]; then
    DEFAULT_BRANCH="main"
fi

echo "### マージ済みブランチ（過去${DAYS}日間）"
echo ""
git for-each-ref --sort=-committerdate refs/heads/ \
    --format='%(refname:short)|%(authorname)|%(committerdate:short)' \
    --merged="${DEFAULT_BRANCH}" 2>/dev/null | \
    while IFS='|' read -r branch author date; do
        # 過去N日以内のブランチのみ表示
        if [[ $(date -j -f "%Y-%m-%d" "$date" "+%s" 2>/dev/null || date -d "$date" "+%s" 2>/dev/null) -ge $(date -v-${DAYS}d "+%s" 2>/dev/null || date -d "${DAYS} days ago" "+%s" 2>/dev/null) ]]; then
            echo "- $branch (by $author, merged: $date)"
        fi
    done

echo ""
echo ""

##############################################################################
# 5. ファイル変更統計
##############################################################################

echo "=========================================="
echo "## 4. ファイル変更統計"
echo "=========================================="
echo ""

echo "### 変更されたファイルTop 10"
echo ""
git log --since="${DAYS} days ago" --name-only --pretty=format: | \
    sort | uniq -c | sort -rn | head -10 | \
    awk '{print "- " $2 " (" $1 "回変更)"}'

echo ""
echo ""

##############################################################################
# 6. 追加・削除行数統計
##############################################################################

echo "=========================================="
echo "## 5. コード変更量"
echo "=========================================="
echo ""

STATS=$(git log --since="${DAYS} days ago" --numstat --pretty=tformat: --numstat | \
    awk '{add+=$1; del+=$2} END {print add, del}')

ADD_LINES=$(echo "$STATS" | awk '{print $1}')
DEL_LINES=$(echo "$STATS" | awk '{print $2}')

if [ -z "$ADD_LINES" ]; then
    ADD_LINES=0
fi
if [ -z "$DEL_LINES" ]; then
    DEL_LINES=0
fi

echo "- 追加行数: ${ADD_LINES}行"
echo "- 削除行数: ${DEL_LINES}行"
echo "- 純変更: $((ADD_LINES - DEL_LINES))行"

echo ""
echo ""

##############################################################################
# 7. タグ情報（リリース情報）
##############################################################################

echo "=========================================="
echo "## 6. リリース情報（タグ）"
echo "=========================================="
echo ""

TAGS=$(git tag -l --sort=-creatordate --format='%(refname:short)|%(creatordate:short)' 2>/dev/null | head -5)

if [ -z "$TAGS" ]; then
    echo "- タグなし"
else
    echo "### 最近のタグ（最新5件）"
    echo ""
    echo "$TAGS" | while IFS='|' read -r tag date; do
        echo "- $tag ($date)"
    done
fi

echo ""
echo ""

##############################################################################
# 8. サマリー
##############################################################################

echo "=========================================="
echo "## 7. サマリー"
echo "=========================================="
echo ""

COMMIT_COUNT=$(git rev-list --since="${DAYS} days ago" --count HEAD 2>/dev/null || echo 0)
AUTHOR_COUNT=$(git shortlog --since="${DAYS} days ago" -s -n | wc -l | tr -d ' ')

echo "- 対象期間: 過去${DAYS}日間"
echo "- 総コミット数: ${COMMIT_COUNT}件"
echo "- 参加者数: ${AUTHOR_COUNT}名"
echo "- 追加行数: ${ADD_LINES}行"
echo "- 削除行数: ${DEL_LINES}行"

echo ""
echo "=========================================="
echo -e "${GREEN}データ収集完了！${NC}"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "1. このデータを output/weekly_data.txt に保存"
echo "   例: ./collect_weekly_data.sh > output/weekly_data.txt"
echo ""
echo "2. プロンプトファイルと合わせてAIツールに入力"
echo "   - プロンプト: 05_進捗報告/プロンプト/Git履歴から進捗レポート自動生成.md"
echo "   - データ: output/weekly_data.txt"
echo ""
