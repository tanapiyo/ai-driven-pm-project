#!/usr/bin/env bash
# validate-adr.sh — ADR 必須セクション存在チェック
#
# 使い方:
#   ./tools/policy/validate-adr.sh            # docs/02_architecture/adr/ 内の全 ADR を検証
#   ./tools/policy/validate-adr.sh --file <path>  # 特定ファイルのみ検証
#
# 終了コード:
#   0 — 全 ADR 有効（または指定ファイルが有効）
#   1 — 必須セクション不足の ADR を検出（警告。CI をブロックしない設計）
#   2 — スクリプトエラー（引数不正、ファイルが存在しない等）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${REPO_ROOT:-$(cd "${SCRIPT_DIR}/../.." && pwd)}"
ADR_DIR="${REPO_ROOT}/docs/02_architecture/adr"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --------------------------------------------------------------------------
# 引数パース
# --------------------------------------------------------------------------
FILE_MODE=false
TARGET_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      if [[ -z "${2:-}" ]]; then
        echo "ERROR: --file requires a file path argument" >&2
        exit 2
      fi
      FILE_MODE=true
      TARGET_FILE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--file <path>]"
      echo ""
      echo "  (no args)       docs/02_architecture/adr/ 内の全 ADR を検証"
      echo "  --file <path>   指定ファイルのみを検証"
      echo ""
      echo "Exit codes:"
      echo "  0  全 ADR 有効"
      echo "  1  必須セクション不足（警告）"
      echo "  2  スクリプトエラー"
      exit 0
      ;;
    *)
      echo "ERROR: Unknown argument: $1" >&2
      echo "Run '$0 --help' for usage." >&2
      exit 2
      ;;
  esac
done

# --------------------------------------------------------------------------
# 単一ファイルのセクションチェック
#
# 必須セクション（日本語 / 英語 / 混在に対応）:
#   1. タイトル行:      ^# ADR-[0-9]+
#   2. ステータス:      ^## ステータス  または  ^## Status
#   3. 背景:           ^## 背景  または  ^## Context  または  ^## Background
#   4. 決定内容:       ^## 決定内容  または  ^## 決定事項  または  ^## Decision
#   5. 結果:           ^## 結果  または  ^## Consequences  または  ^## Result
#   6. 検討した代替案:  ^## 検討した代替案  または  ^## Alternatives
# --------------------------------------------------------------------------
check_adr_file() {
  local file="$1"
  local errors=0

  if [[ ! -f "$file" ]]; then
    echo -e "${RED}✗${NC} ファイルが存在しません: $file" >&2
    return 1
  fi

  local basename
  basename="$(basename "$file")"

  # TEMPLATE.md はスキップ
  if [[ "$basename" == "TEMPLATE.md" ]]; then
    echo -e "${YELLOW}⚠${NC}  ${basename}: テンプレートファイルのためスキップ"
    return 0
  fi

  local missing_sections=()

  # 1. タイトル行 (^# ADR-)
  if ! grep -qE '^# ADR-[0-9]' "$file"; then
    missing_sections+=("タイトル行 (# ADR-NNNN: ...)")
  fi

  # 2. ステータスセクション
  if ! grep -qiE '^## (ステータス|Status)' "$file"; then
    missing_sections+=("ステータス / Status")
  fi

  # 3. 背景セクション
  if ! grep -qiE '^## (背景|Context|Background)' "$file"; then
    missing_sections+=("背景 / Context / Background")
  fi

  # 4. 決定内容セクション
  if ! grep -qiE '^## (決定内容|決定事項|Decision)' "$file"; then
    missing_sections+=("決定内容 / 決定事項 / Decision")
  fi

  # 5. 結果セクション
  if ! grep -qiE '^## (結果|Consequences|Result)' "$file"; then
    missing_sections+=("結果 / Consequences / Result")
  fi

  # 6. 検討した代替案セクション
  if ! grep -qiE '^## (検討した代替案|Alternatives)' "$file"; then
    missing_sections+=("検討した代替案 / Alternatives Considered")
  fi

  if [[ ${#missing_sections[@]} -eq 0 ]]; then
    echo -e "${GREEN}✓${NC}  ${basename}"
    return 0
  else
    echo -e "${RED}✗${NC}  ${basename} — 必須セクションが不足しています:"
    for section in "${missing_sections[@]}"; do
      echo "       - ${section}"
    done
    return 1
  fi
}

# --------------------------------------------------------------------------
# メイン処理
# --------------------------------------------------------------------------
if [[ "$FILE_MODE" == "true" ]]; then
  # --- 単一ファイルモード ---
  # ファイルの存在チェックを先行実施（スクリプトエラーとして扱う）
  if [[ ! -f "$TARGET_FILE" ]]; then
    echo "ERROR: ファイルが存在しません: ${TARGET_FILE}" >&2
    exit 2
  fi
  echo "=== ADR バリデーション: ${TARGET_FILE} ==="
  echo ""
  if check_adr_file "$TARGET_FILE"; then
    echo ""
    echo -e "${GREEN}PASSED${NC}"
    exit 0
  else
    echo ""
    echo -e "${YELLOW}WARNING${NC}: 必須セクション不足を検出しました（非ブロッキング）"
    exit 1
  fi
fi

# --- ディレクトリモード (デフォルト) ---
echo "=== ADR バリデーション: ${ADR_DIR} ==="
echo ""

if [[ ! -d "$ADR_DIR" ]]; then
  echo "ERROR: ADR ディレクトリが存在しません: ${ADR_DIR}" >&2
  exit 2
fi

# *.md ファイルを収集
adr_files=()
while IFS= read -r -d '' f; do
  adr_files+=("$f")
done < <(find "$ADR_DIR" -maxdepth 1 -name "*.md" -print0 | sort -z)

if [[ ${#adr_files[@]} -eq 0 ]]; then
  echo -e "${YELLOW}⚠${NC}  ADR ファイルが見つかりません（${ADR_DIR}）"
  echo ""
  echo "PASSED (ADR なし)"
  exit 0
fi

invalid_count=0
valid_count=0
skipped_count=0

for adr_file in "${adr_files[@]}"; do
  basename="$(basename "$adr_file")"
  if [[ "$basename" == "TEMPLATE.md" ]]; then
    skipped_count=$((skipped_count + 1))
    check_adr_file "$adr_file"
    continue
  fi

  if check_adr_file "$adr_file"; then
    valid_count=$((valid_count + 1))
  else
    invalid_count=$((invalid_count + 1))
  fi
done

echo ""
echo "=== サマリー ==="
echo "  有効: ${valid_count}"
echo "  無効: ${invalid_count}"
echo "  スキップ: ${skipped_count}"
echo ""

if [[ "$invalid_count" -gt 0 ]]; then
  echo -e "${YELLOW}WARNING${NC}: ${invalid_count} 件の ADR に必須セクション不足があります（非ブロッキング）"
  echo "  新規 ADR を作成する際は TEMPLATE.md に従ってください:"
  echo "  docs/02_architecture/adr/TEMPLATE.md"
  exit 1
fi

echo -e "${GREEN}PASSED${NC}: 全 ADR が有効です"
exit 0
