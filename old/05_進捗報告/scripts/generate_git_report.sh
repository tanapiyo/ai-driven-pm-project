#!/bin/bash

##############################################################################
# Git履歴レポート生成スクリプト
# 用途: Git履歴から進捗レポート用のデータを生成
# 実行: ./generate_git_report.sh [開始日] [終了日]
# 例:   ./generate_git_report.sh "7 days ago" "now"
#       ./generate_git_report.sh "2025-10-19" "2025-10-26"
##############################################################################

# 引数
START_DATE=${1:-"7 days ago"}
END_DATE=${2:-"now"}

# 出力ディレクトリ
OUTPUT_DIR="$(dirname "$0")/../output"
mkdir -p "$OUTPUT_DIR"

# カラー出力用
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "Git履歴レポート生成"
echo "期間: ${START_DATE} 〜 ${END_DATE}"
echo "=========================================="
echo ""

##############################################################################
# 1. コミットメッセージ分類（Conventional Commits対応）
##############################################################################

echo "## コミット分類"
echo ""

# feat: 新機能
FEAT_COMMITS=$(git log --since="${START_DATE}" --until="${END_DATE}" --oneline | grep -i "^[a-f0-9]* feat" | wc -l | tr -d ' ')
# fix: バグ修正
FIX_COMMITS=$(git log --since="${START_DATE}" --until="${END_DATE}" --oneline | grep -i "^[a-f0-9]* fix" | wc -l | tr -d ' ')
# docs: ドキュメント
DOCS_COMMITS=$(git log --since="${START_DATE}" --until="${END_DATE}" --oneline | grep -i "^[a-f0-9]* docs" | wc -l | tr -d ' ')
# refactor: リファクタリング
REFACTOR_COMMITS=$(git log --since="${START_DATE}" --until="${END_DATE}" --oneline | grep -i "^[a-f0-9]* refactor" | wc -l | tr -d ' ')
# test: テスト
TEST_COMMITS=$(git log --since="${START_DATE}" --until="${END_DATE}" --oneline | grep -i "^[a-f0-9]* test" | wc -l | tr -d ' ')
# その他
TOTAL_COMMITS=$(git rev-list --since="${START_DATE}" --until="${END_DATE}" --count HEAD 2>/dev/null || echo 0)
OTHER_COMMITS=$((TOTAL_COMMITS - FEAT_COMMITS - FIX_COMMITS - DOCS_COMMITS - REFACTOR_COMMITS - TEST_COMMITS))

echo "| カテゴリ | コミット数 |"
echo "|---------|-----------|"
echo "| 新機能 (feat) | ${FEAT_COMMITS} |"
echo "| バグ修正 (fix) | ${FIX_COMMITS} |"
echo "| ドキュメント (docs) | ${DOCS_COMMITS} |"
echo "| リファクタリング (refactor) | ${REFACTOR_COMMITS} |"
echo "| テスト (test) | ${TEST_COMMITS} |"
echo "| その他 | ${OTHER_COMMITS} |"
echo "| **合計** | **${TOTAL_COMMITS}** |"

echo ""
echo ""

##############################################################################
# 2. 主要なコミット一覧
##############################################################################

echo "## 主要なコミット"
echo ""

echo "### 新機能 (feat)"
echo ""
git log --since="${START_DATE}" --until="${END_DATE}" --oneline | grep -i "^[a-f0-9]* feat" | sed 's/^/- /' || echo "- なし"

echo ""
echo "### バグ修正 (fix)"
echo ""
git log --since="${START_DATE}" --until="${END_DATE}" --oneline | grep -i "^[a-f0-9]* fix" | sed 's/^/- /' || echo "- なし"

echo ""
echo ""

##############################################################################
# 3. ファイル別変更統計
##############################################################################

echo "## ファイル別変更統計（Top 10）"
echo ""

echo "| ファイル名 | 追加 | 削除 |"
echo "|----------|-----|-----|"

git log --since="${START_DATE}" --until="${END_DATE}" --numstat --pretty=format: | \
    awk '{files[$3]+=$1+$2; add[$3]+=$1; del[$3]+=$2}
         END {for (file in files) print file, add[file], del[file], files[file]}' | \
    sort -k4 -rn | head -10 | \
    awk '{printf "| %s | +%d | -%d |\n", $1, $2, $3}'

echo ""
echo ""

##############################################################################
# 4. 日別アクティビティ
##############################################################################

echo "## 日別コミット数"
echo ""

echo "| 日付 | コミット数 |"
echo "|------|-----------|"

git log --since="${START_DATE}" --until="${END_DATE}" --date=short --pretty=format:"%ad" | \
    sort | uniq -c | awk '{printf "| %s | %d |\n", $2, $1}'

echo ""
echo ""

##############################################################################
# 5. 作成者別統計
##############################################################################

echo "## 作成者別統計"
echo ""

echo "| 作成者 | コミット数 | 追加行 | 削除行 |"
echo "|-------|-----------|-------|-------|"

git log --since="${START_DATE}" --until="${END_DATE}" --format='%aN' --numstat | \
    awk '
        NF==3 {add[$1]+=$1; del[$1]+=$2; next}
        NF==1 {author=$0}
        END {for (a in add) print a, add[a], del[a]}
    ' | \
    while read -r author add del; do
        commits=$(git shortlog --since="${START_DATE}" --until="${END_DATE}" -s -n --author="$author" | awk '{print $1}')
        echo "| $author | $commits | +$add | -$del |"
    done

echo ""
echo ""

##############################################################################
# 6. AI用フォーマット済みデータ
##############################################################################

echo "=========================================="
echo "## AI入力用データ（プロンプトと一緒に使用）"
echo "=========================================="
echo ""

cat << EOF
### 期間
- 開始: ${START_DATE}
- 終了: ${END_DATE}

### 総括
- 総コミット数: ${TOTAL_COMMITS}
- 新機能: ${FEAT_COMMITS}
- バグ修正: ${FIX_COMMITS}
- ドキュメント: ${DOCS_COMMITS}

### 主な変更内容
EOF

# 新機能トップ3
echo ""
echo "**新機能:**"
git log --since="${START_DATE}" --until="${END_DATE}" --oneline | grep -i "^[a-f0-9]* feat" | head -3 | sed 's/^/- /'

# バグ修正トップ3
echo ""
echo "**バグ修正:**"
git log --since="${START_DATE}" --until="${END_DATE}" --oneline | grep -i "^[a-f0-9]* fix" | head -3 | sed 's/^/- /'

echo ""
echo ""
echo -e "${GREEN}レポート生成完了！${NC}"
echo ""
echo "次のステップ:"
echo "1. このレポートを保存"
echo "   例: ./generate_git_report.sh > output/git_report.txt"
echo ""
echo "2. プロンプトと一緒にAIツールへ入力"
echo "   プロンプト: 05_進捗報告/プロンプト/Git履歴から進捗レポート自動生成.md"
echo ""
