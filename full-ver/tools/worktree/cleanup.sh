#!/usr/bin/env bash
# tools/worktree/cleanup.sh
# Worktree を削除しクリーンアップする
#
# Usage:
#   ./tools/worktree/cleanup.sh <worktree-path>
#   ./tools/worktree/cleanup.sh --merged
#   ./tools/worktree/cleanup.sh --all
#   ./tools/worktree/cleanup.sh --prune

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STATE_DIR="${REPO_ROOT}/.worktree-state"
AUDIT_LOG="${STATE_DIR}/.audit.log"

# Source container health check library
source "${SCRIPT_DIR}/lib/container-health.sh"

# Source naming utilities library
source "${SCRIPT_DIR}/lib/naming.sh"

# Source docker compose utilities library
source "${SCRIPT_DIR}/lib/docker-compose.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Validate state file format (security: prevent malicious YAML)
# Args:
#   $1 - state_file: Path to state file
# Returns:
#   0 - Valid format
#   1 - Invalid format
validate_state_file() {
    local state_file="$1"

    # Check file exists
    if [[ ! -f "$state_file" ]]; then
        log_warn "State file not found: $state_file"
        return 1
    fi

    # Check file size (prevent DoS via large files)
    local file_size
    file_size=$(stat -f%z "$state_file" 2>/dev/null || stat -c%s "$state_file" 2>/dev/null || echo 0)
    if [[ $file_size -gt 10240 ]]; then  # 10KB limit
        log_error "State file too large: $state_file ($file_size bytes)"
        return 1
    fi

    # Check required fields exist
    if ! grep -qE "^worktree_path:" "$state_file"; then
        log_error "Missing worktree_path in state file: $state_file"
        return 1
    fi

    if ! grep -qE "^branch:" "$state_file"; then
        log_error "Missing branch in state file: $state_file"
        return 1
    fi

    # Validate worktree_path format (must be absolute path)
    local wt_path
    wt_path=$(grep -E "^worktree_path:" "$state_file" | sed 's/^[^:]*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//')
    if [[ ! "$wt_path" =~ ^/ ]]; then
        log_error "Invalid worktree_path in state file (not absolute): $wt_path"
        return 1
    fi

    # Validate container_id format (if present)
    if grep -qE "^container_id:" "$state_file"; then
        local container_id
        container_id=$(grep -E "^container_id:" "$state_file" | sed 's/^[^:]*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//')
        if [[ -n "$container_id" && ! "$container_id" =~ ^[a-f0-9]{12,64}$ ]]; then
            log_error "Invalid container_id format in state file: $container_id"
            return 1
        fi
    fi

    return 0
}

# Write audit log entry
# Args:
#   $1 - worktree_path: Path to removed worktree
#   $2 - branch: Branch name
#   $3 - status: "success" or "failed"
#   $4 - reason: Optional reason for failure
write_audit_log() {
    local worktree_path="$1"
    local branch="$2"
    local status="$3"
    local reason="${4:-}"

    # Ensure STATE_DIR exists
    mkdir -p "${STATE_DIR}"

    # Create audit log if not exists
    if [[ ! -f "${AUDIT_LOG}" ]]; then
        touch "${AUDIT_LOG}"
    fi

    # Write log entry (ISO 8601 timestamp)
    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local log_entry="${timestamp} | ${status} | ${branch} | ${worktree_path}"
    if [[ -n "$reason" ]]; then
        log_entry="${log_entry} | ${reason}"
    fi

    echo "$log_entry" >> "${AUDIT_LOG}"
}

show_usage() {
    cat << EOF
Usage: $(basename "$0") [options] [worktree-path]

Arguments:
  worktree-path   Path to worktree to remove

Options:
  --merged        Remove all worktrees whose branches are merged to main
  --all           Remove all worktrees (except main)
  --prune         Only prune orphaned state files and git worktree records
  --force         Force removal without confirmation
  --dry-run       Show what would be done without executing
  -h, --help      Show this help message

Examples:
  $(basename "$0") ../my-repo-feature-a
  $(basename "$0") --merged
  $(basename "$0") --prune
EOF
}

# Stop Docker Compose services and cleanup resources for worktree
stop_devcontainer() {
    local worktree_path="$1"
    local dry_run="${2:-false}"

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_warn "Docker command not found, skipping container cleanup"
        return 0
    fi

    # Check if Docker daemon is running
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        log_error "Please start Docker Desktop or check docker permissions"
        return 1
    fi

    # Stop Docker Compose services
    stop_compose_services "$worktree_path" || {
        log_warn "Failed to stop Docker Compose services, continuing..."
    }

    # Cleanup Docker Compose resources (containers, volumes, networks)
    cleanup_compose_resources "$worktree_path" "$dry_run" || {
        log_warn "Failed to cleanup Docker Compose resources, continuing..."
    }

    return 0
}

# Remove state file for worktree
remove_state_file() {
    local worktree_path="$1"
    local state_file="${STATE_DIR}/$(basename "${worktree_path}").yaml"

    if [[ -f "$state_file" ]]; then
        rm -f "$state_file"
        log_success "Removed state file: $state_file"
    fi
}

# Remove a single worktree
remove_worktree() {
    local worktree_path="$1"
    local force="$2"
    local dry_run="$3"

    # Resolve to absolute path
    worktree_path=$(cd "$worktree_path" 2>/dev/null && pwd || echo "$worktree_path")

    # Security: Validate worktree path is within boundaries
    if ! validate_worktree_path "$worktree_path" "${REPO_ROOT}"; then
        log_error "Path is outside worktrees directory: $worktree_path"
        log_error "Worktrees must be within ${REPO_ROOT}/worktrees/"
        return 1
    fi

    # Don't remove main worktree
    if [[ "$worktree_path" == "${REPO_ROOT}" ]]; then
        log_warn "Cannot remove main worktree: $worktree_path"
        return 1
    fi

    # Check if it's a valid worktree (use grep -F for fixed string matching - security)
    if ! git -C "${REPO_ROOT}" worktree list | grep -F "$worktree_path "; then
        log_warn "Not a valid worktree: $worktree_path"
        write_audit_log "$worktree_path" "unknown" "failed" "not a valid worktree"
        return 1
    fi

    # Get branch name for audit log
    local branch
    branch=$(git -C "${REPO_ROOT}" worktree list | grep -F "$worktree_path" | awk '{print $3}' | sed 's/^\[//' | sed 's/\]$//' || echo "unknown")

    log_info "Removing worktree: $worktree_path"

    if [[ "$dry_run" == true ]]; then
        log_warn "Dry run - would remove: $worktree_path"
        return 0
    fi

    # Confirm if not forced
    if [[ "$force" != true ]]; then
        read -rp "Are you sure you want to remove this worktree? [y/N] " answer
        if [[ ! "$answer" =~ ^[Yy]$ ]]; then
            log_warn "Aborted"
            return 1
        fi
    fi

    # Stop DevContainer
    if ! stop_devcontainer "$worktree_path" "$dry_run"; then
        log_warn "Failed to stop DevContainer, continuing..."
    fi

    # Remove worktree
    if git -C "${REPO_ROOT}" worktree remove --force "$worktree_path" 2>/dev/null; then
        log_success "Worktree removed: $worktree_path"
        write_audit_log "$worktree_path" "$branch" "success"
    else
        # Fall back to manual removal
        log_warn "Git worktree remove failed, trying manual removal..."
        if rm -rf "$worktree_path" && git -C "${REPO_ROOT}" worktree prune; then
            log_success "Worktree removed manually: $worktree_path"
            write_audit_log "$worktree_path" "$branch" "success" "manual removal"
        else
            log_error "Failed to remove worktree: $worktree_path"
            write_audit_log "$worktree_path" "$branch" "failed" "removal failed"
            return 1
        fi
    fi

    # Remove state file
    remove_state_file "$worktree_path"

    return 0
}

# Remove worktrees with merged branches
remove_merged() {
    local force="$1"
    local dry_run="$2"
    local removed=0

    log_info "Looking for worktrees with merged branches..."

    # Get main branch name
    local main_branch
    main_branch=$(git -C "${REPO_ROOT}" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main")

    while IFS= read -r line; do
        local worktree_path branch safe_branch
        worktree_path=$(echo "$line" | awk '{print $1}')
        branch=$(echo "$line" | awk '{print $3}' | sed 's/^\[//' | sed 's/\]$//')

        # Skip main worktree
        if [[ "$worktree_path" == "${REPO_ROOT}" ]]; then
            continue
        fi

        # Sanitize branch name for security
        safe_branch=$(sanitize_branch_name "$branch")

        # Check if branch is merged (use grep -F for fixed string matching - security)
        if git -C "${REPO_ROOT}" branch --merged "$main_branch" 2>/dev/null | grep -F "$safe_branch"; then
            log_info "Branch '$branch' is merged to $main_branch"
            if remove_worktree "$worktree_path" "$force" "$dry_run"; then
                removed=$((removed + 1))
            fi
        fi
    done < <(git -C "${REPO_ROOT}" worktree list 2>/dev/null)

    if [[ $removed -eq 0 ]]; then
        log_info "No merged worktrees found"
    else
        log_success "Removed $removed merged worktree(s)"
    fi
}

# Remove all worktrees
remove_all() {
    local force="$1"
    local dry_run="$2"
    local removed=0

    if [[ "$force" != true ]]; then
        log_warn "This will remove ALL worktrees except main!"
        read -rp "Are you sure? [y/N] " answer
        if [[ ! "$answer" =~ ^[Yy]$ ]]; then
            log_warn "Aborted"
            return
        fi
    fi

    while IFS= read -r line; do
        local worktree_path
        worktree_path=$(echo "$line" | awk '{print $1}')

        # Skip main worktree
        if [[ "$worktree_path" == "${REPO_ROOT}" ]]; then
            continue
        fi

        if remove_worktree "$worktree_path" true "$dry_run"; then
            removed=$((removed + 1))
        fi
    done < <(git -C "${REPO_ROOT}" worktree list 2>/dev/null)

    log_success "Removed $removed worktree(s)"
}

# Prune orphaned records
prune_orphaned() {
    local dry_run="$1"
    local pruned=0

    log_info "Pruning orphaned records..."

    # Prune git worktree
    if [[ "$dry_run" == true ]]; then
        log_info "Would run: git worktree prune"
    else
        git -C "${REPO_ROOT}" worktree prune
        log_success "Git worktree pruned"
    fi

    # Prune state files
    if [[ -d "${STATE_DIR}" ]]; then
        shopt -s nullglob
        for state_file in "${STATE_DIR}"/*.yaml; do
            if [[ -f "$state_file" ]]; then
                # Validate state file format (security)
                if ! validate_state_file "$state_file"; then
                    log_warn "Invalid state file, skipping: $state_file"
                    continue
                fi

                local wt_path
                wt_path=$(grep -E "^worktree_path:" "$state_file" 2>/dev/null | sed 's/^[^:]*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//')

                if [[ -n "$wt_path" && ! -d "$wt_path" ]]; then
                    if [[ "$dry_run" == true ]]; then
                        log_info "Would remove orphaned state file: $state_file"
                    else
                        rm -f "$state_file"
                        log_success "Removed orphaned state file: $(basename "$state_file")"
                    fi
                    pruned=$((pruned + 1))
                fi
            fi
        done
        shopt -u nullglob
    fi

    if [[ $pruned -eq 0 ]]; then
        log_info "No orphaned records found"
    else
        log_success "Pruned $pruned orphaned record(s)"
    fi
}

# Main
main() {
    local worktree_path=""
    local mode=""
    local force=false
    local dry_run=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            --merged)
                mode="merged"
                shift
                ;;
            --all)
                mode="all"
                shift
                ;;
            --prune)
                mode="prune"
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            -*)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                worktree_path="$1"
                shift
                ;;
        esac
    done

    case "$mode" in
        merged)
            remove_merged "$force" "$dry_run"
            ;;
        all)
            remove_all "$force" "$dry_run"
            ;;
        prune)
            prune_orphaned "$dry_run"
            ;;
        "")
            if [[ -z "$worktree_path" ]]; then
                log_error "No worktree path specified"
                show_usage
                exit 1
            fi
            remove_worktree "$worktree_path" "$force" "$dry_run"
            ;;
    esac
}

main "$@"
