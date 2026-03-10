#!/usr/bin/env bash
# tools/worktree/ensure-worktree.sh
# 作業開始時にworktree環境での作業を強制する
#
# このスクリプトは以下を確認・実行する:
# 1. 現在のディレクトリがworktree内かルートリポジトリかをチェック
# 2. ルートリポジトリでの作業をブロック
# 3. worktree内でのみ作業を許可

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# MAIN_REPO_ROOT is the main repository (where spawn.sh lives)
MAIN_REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
# CURRENT_ROOT is the git root of the CURRENT working directory
CURRENT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# 現在のブランチを取得
get_current_branch() {
    git -C "${CURRENT_ROOT}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo ""
}

# Protected branches
PROTECTED_BRANCHES=("main" "master" "develop")

is_protected_branch() {
    local branch="$1"
    for protected in "${PROTECTED_BRANCHES[@]}"; do
        if [[ "$branch" == "$protected" ]]; then
            return 0
        fi
    done
    return 1
}

# worktree context の確認
check_worktree_context() {
    if [[ -f "${CURRENT_ROOT}/.worktree-context.yaml" ]]; then
        return 0
    fi
    return 1
}

# Check if we are in a worktree (not root repo)
is_in_worktree() {
    # In a worktree, .git is a FILE (not a directory) pointing to the main repo
    # In the main repo, .git is a DIRECTORY
    if [[ -f "${CURRENT_ROOT}/.git" ]]; then
        return 0  # We are in a worktree
    fi
    return 1  # We are in the main repo (root)
}

main() {
    local current_branch
    current_branch=$(get_current_branch)

    if [[ -z "$current_branch" ]]; then
        log_error "Git リポジトリではありません"
        exit 1
    fi

    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║          Worktree Environment Check                        ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # CRITICAL: Check if we are in the root repository (NOT a worktree)
    if ! is_in_worktree; then
        log_error "❌ BLOCKED: ルートリポジトリでの作業は禁止されています"
        echo ""
        echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  ROOT REPOSITORY WORK IS FORBIDDEN                         ║${NC}"
        echo -e "${RED}║  ルートリポジトリでの作業は禁止されています                 ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}すべての開発作業は worktree ディレクトリで行う必要があります。${NC}"
        echo -e "${YELLOW}Worktree は必ずリモートの main ブランチ HEAD から作成されます。${NC}"
        echo ""
        echo "使用方法:"
        echo -e "  ${GREEN}./tools/worktree/spawn.sh <agent-type> <branch-name>${NC}"
        echo ""
        echo "例 (メインリポジトリのルートから実行):"
        echo -e "  ${CYAN}cd ${MAIN_REPO_ROOT}${NC}"
        echo -e "  ${CYAN}./tools/worktree/spawn.sh implementer feat/GH-123-new-feature${NC}"
        echo -e "  ${CYAN}./tools/worktree/spawn.sh architect feat/GH-456-design${NC}"
        echo ""
        echo -e "${RED}手動でのブランチ切り替え (git checkout -b) は許可されていません。${NC}"
        echo -e "${RED}必ず spawn.sh を使用して worktree を作成してください。${NC}"
        echo ""
        return 1
    fi

    # Protected branch check (additional safety)
    if is_protected_branch "$current_branch"; then
        log_error "❌ BLOCKED: protected ブランチ '${current_branch}' での作業は禁止されています"
        echo ""
        echo -e "${RED}Worktree 内でも protected ブランチでの作業は禁止です。${NC}"
        echo -e "${RED}新しい feature ブランチで worktree を作成してください。${NC}"
        echo ""
        return 1
    fi

    # Worktree context check
    if check_worktree_context; then
        log_success "✅ Worktree 環境で作業中: ${current_branch}"
        echo ""
        echo -e "Context file: ${GREEN}${CURRENT_ROOT}/.worktree-context.yaml${NC}"
    else
        log_success "✅ Worktree 環境で作業中: ${current_branch}"
        echo ""
        echo -e "${YELLOW}ヒント: .worktree-context.yaml が見つかりません${NC}"
        echo -e "${YELLOW}spawn.sh で作成された worktree では自動生成されます。${NC}"
    fi

    echo ""
    return 0
}

main "$@"
