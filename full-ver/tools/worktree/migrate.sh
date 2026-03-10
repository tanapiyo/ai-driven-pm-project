#!/usr/bin/env bash
# tools/worktree/migrate.sh
# 既存の worktree を ./worktrees/ 配下に移行する
#
# Usage:
#   ./tools/worktree/migrate.sh [--dry-run]

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

DRY_RUN=false

if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
    log_warn "Dry run mode - no changes will be made"
fi

# Get list of worktrees (excluding main repo)
get_external_worktrees() {
    git -C "${REPO_ROOT}" worktree list --porcelain | \
        grep "^worktree " | \
        sed 's/^worktree //' | \
        grep -v "^${REPO_ROOT}$" || true
}

migrate_worktree() {
    local old_path="$1"
    local branch
    branch=$(git -C "$old_path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    local safe_branch
    safe_branch=$(echo "$branch" | sed 's/\//-/g')
    local new_path="${WORKTREES_DIR}/${safe_branch}"

    log_info "Migrating: $old_path"
    log_info "  Branch: $branch"
    log_info "  New path: $new_path"

    if [[ "$DRY_RUN" == true ]]; then
        return 0
    fi

    # Create worktrees directory
    mkdir -p "${WORKTREES_DIR}"

    # Check if new path already exists
    if [[ -d "$new_path" ]]; then
        log_warn "Target path already exists: $new_path"
        return 1
    fi

    # Move the worktree using git worktree move
    if git -C "${REPO_ROOT}" worktree move "$old_path" "$new_path"; then
        log_success "Migrated to: $new_path"

        # Update state file if exists
        local old_name
        old_name=$(basename "$old_path")
        local state_file="${STATE_DIR}/${old_name}.yaml"
        if [[ -f "$state_file" ]]; then
            local new_state_file="${STATE_DIR}/${safe_branch}.yaml"
            sed -i.bak "s|worktree_path:.*|worktree_path: \"${new_path}\"|" "$state_file"
            mv "$state_file" "$new_state_file"
            rm -f "${state_file}.bak"
            log_success "Updated state file: $new_state_file"
        fi
    else
        log_error "Failed to move worktree"
        return 1
    fi
}

main() {
    log_info "=== Worktree Migration ==="
    log_info "Target directory: ${WORKTREES_DIR}"
    echo ""

    local worktrees
    worktrees=$(get_external_worktrees)

    if [[ -z "$worktrees" ]]; then
        log_info "No external worktrees found to migrate"
        exit 0
    fi

    log_info "Found worktrees to migrate:"
    echo "$worktrees" | while read -r wt; do
        echo "  - $wt"
    done
    echo ""

    if [[ "$DRY_RUN" == false ]]; then
        read -rp "Proceed with migration? [y/N] " answer
        if [[ ! "$answer" =~ ^[Yy]$ ]]; then
            log_warn "Aborted"
            exit 0
        fi
    fi

    local success=0
    local failed=0

    echo "$worktrees" | while read -r wt; do
        if migrate_worktree "$wt"; then
            ((success++)) || true
        else
            ((failed++)) || true
        fi
        echo ""
    done

    log_info "=== Migration Complete ==="
    log_info "Run 'git worktree list' to verify"
}

main "$@"
