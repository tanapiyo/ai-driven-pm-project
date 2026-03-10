#!/usr/bin/env bash
# tools/worktree/remove.sh
# Worktree を削除する
#
# Usage:
#   ./tools/worktree/remove.sh <branch-name-or-path>
#   ./tools/worktree/remove.sh --all-external

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKTREES_DIR="${REPO_ROOT}/worktrees"
STATE_DIR="${REPO_ROOT}/.worktree-state"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

show_usage() {
    cat << EOF
Usage: $(basename "$0") <branch-name-or-path> [options]

Arguments:
  branch-name-or-path   Branch name or full path to worktree

Options:
  --all-external   Remove all worktrees outside ./worktrees/
  --force          Force removal even if dirty
  -h, --help       Show this help message

Examples:
  $(basename "$0") feat/login-feature
  $(basename "$0") feat-login-feature
  $(basename "$0") ./worktrees/feat-login-feature
  $(basename "$0") --all-external
EOF
}

find_worktree_path() {
    local identifier="$1"

    # Check if it's already a path
    if [[ -d "$identifier" ]]; then
        echo "$identifier"
        return 0
    fi

    # Try as branch name (with slashes)
    local safe_branch
    safe_branch=$(echo "$identifier" | sed 's/\//-/g')

    # Check in worktrees directory
    if [[ -d "${WORKTREES_DIR}/${safe_branch}" ]]; then
        echo "${WORKTREES_DIR}/${safe_branch}"
        return 0
    fi

    # Check if identifier is already safe branch name
    if [[ -d "${WORKTREES_DIR}/${identifier}" ]]; then
        echo "${WORKTREES_DIR}/${identifier}"
        return 0
    fi

    # Search in git worktree list
    local path
    path=$(git -C "${REPO_ROOT}" worktree list --porcelain | \
        grep -A2 "^worktree " | \
        grep -B1 "branch refs/heads/${identifier}$" | \
        grep "^worktree " | \
        sed 's/^worktree //' | \
        head -1)

    if [[ -n "$path" ]]; then
        echo "$path"
        return 0
    fi

    return 1
}

remove_worktree() {
    local wt_path="$1"
    local force="${2:-false}"

    log_info "Removing worktree: $wt_path"

    # Don't allow removing main repo
    if [[ "$wt_path" == "$REPO_ROOT" ]]; then
        log_error "Cannot remove main repository"
        return 1
    fi

    # Get branch name for state file cleanup
    local branch
    branch=$(git -C "$wt_path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

    # Remove worktree
    local force_flag=""
    if [[ "$force" == true ]]; then
        force_flag="--force"
    fi

    if git -C "${REPO_ROOT}" worktree remove $force_flag "$wt_path"; then
        log_success "Worktree removed"

        # Clean up state file
        if [[ -n "$branch" ]]; then
            local safe_branch
            safe_branch=$(echo "$branch" | sed 's/\//-/g')
            local state_file="${STATE_DIR}/${safe_branch}.yaml"
            if [[ -f "$state_file" ]]; then
                rm -f "$state_file"
                log_success "State file removed: $state_file"
            fi
        fi

        # Also try with basename
        local state_file="${STATE_DIR}/$(basename "$wt_path").yaml"
        if [[ -f "$state_file" ]]; then
            rm -f "$state_file"
            log_success "State file removed: $state_file"
        fi

        return 0
    else
        log_error "Failed to remove worktree"
        return 1
    fi
}

remove_all_external() {
    log_info "Finding external worktrees..."

    local external_worktrees
    external_worktrees=$(git -C "${REPO_ROOT}" worktree list --porcelain | \
        grep "^worktree " | \
        sed 's/^worktree //' | \
        grep -v "^${REPO_ROOT}$" | \
        grep -v "^${WORKTREES_DIR}/" || true)

    if [[ -z "$external_worktrees" ]]; then
        log_info "No external worktrees found"
        return 0
    fi

    log_warn "The following external worktrees will be removed:"
    echo "$external_worktrees" | while read -r wt; do
        echo "  - $wt"
    done

    read -rp "Proceed? [y/N] " answer
    if [[ ! "$answer" =~ ^[Yy]$ ]]; then
        log_warn "Aborted"
        return 0
    fi

    echo "$external_worktrees" | while read -r wt; do
        remove_worktree "$wt" true || true
    done

    git -C "${REPO_ROOT}" worktree prune
    log_success "Worktree list pruned"
}

main() {
    local identifier=""
    local all_external=false
    local force=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            --all-external)
                all_external=true
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            -*)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                identifier="$1"
                shift
                ;;
        esac
    done

    if [[ "$all_external" == true ]]; then
        remove_all_external
        exit 0
    fi

    if [[ -z "$identifier" ]]; then
        log_error "Missing worktree identifier"
        show_usage
        exit 1
    fi

    local wt_path
    if ! wt_path=$(find_worktree_path "$identifier"); then
        log_error "Worktree not found: $identifier"
        exit 1
    fi

    remove_worktree "$wt_path" "$force"
}

main "$@"
