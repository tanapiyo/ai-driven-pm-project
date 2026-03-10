#!/usr/bin/env bash
# tools/worktree/prune-containers.sh
# 不要なコンテナ・ボリューム・ネットワークを削除する
#
# 対象:
#   - 削除済み Worktree のコンテナ（Worktree が存在しないのにコンテナが残っている）
#   - マージ済みブランチのコンテナ（PR がマージされた後のコンテナ）
#
# Usage:
#   ./tools/worktree/prune-containers.sh [options]
#
# Options:
#   --dry-run       削除せずに対象を表示
#   --force         確認なしで削除
#   --include-volumes  ボリュームも削除（デフォルトは残す）
#   -h, --help      ヘルプ表示

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKTREES_DIR="${REPO_ROOT}/worktrees"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_dry() { echo -e "${CYAN}[DRY-RUN]${NC} $*"; }

show_usage() {
    cat << EOF
Usage: $(basename "$0") [options]

不要なコンテナ・ボリューム・ネットワークを削除します。

対象:
  - 削除済み Worktree のコンテナ（Worktree が存在しないのにコンテナが残っている）
  - マージ済みブランチのコンテナ（PR がマージされた後のコンテナ）

Options:
  --dry-run          削除せずに対象を表示
  --force            確認なしで削除
  --include-volumes  ボリュームも削除（デフォルトは残す）
  -h, --help         ヘルプ表示

Examples:
  $(basename "$0")                    # 対象を確認して削除
  $(basename "$0") --dry-run          # 削除せずに対象を確認
  $(basename "$0") --force            # 確認なしで削除
  $(basename "$0") --include-volumes  # ボリュームも含めて削除
EOF
}

# Get all active worktree names (safe format: feat/xxx -> feat-xxx)
get_active_worktrees() {
    git -C "${REPO_ROOT}" worktree list --porcelain 2>/dev/null | \
        grep "^worktree " | \
        sed 's/^worktree //' | \
        while read -r path; do
            basename "$path"
        done
}

# Get main branch name
get_main_branch() {
    git -C "${REPO_ROOT}" symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | \
        sed 's@^refs/remotes/origin/@@' || echo "main"
}

# Get merged branches (local)
get_merged_branches() {
    local main_branch
    main_branch=$(get_main_branch)

    git -C "${REPO_ROOT}" branch --merged "$main_branch" 2>/dev/null | \
        sed 's/^[* ]*//' | \
        grep -v "^${main_branch}$" || true
}

# Convert branch name to worktree safe name
branch_to_worktree_name() {
    echo "$1" | sed 's/\//-/g'
}

# Get orphaned Docker Compose projects (this repo only)
get_orphaned_projects() {
    local active_worktrees
    active_worktrees=$(get_active_worktrees)

    # Get main repo basename (should be excluded)
    local main_repo_name
    main_repo_name=$(basename "${REPO_ROOT}")

    # Get this repo's Compose projects
    docker compose ls -a --format json 2>/dev/null | \
        jq -r '.[] | select(.ConfigFiles | contains("vibecoding-repository-template")) | .Name' | \
        while read -r project; do
            # Skip infra (traefik)
            if [[ "$project" == "infra" ]]; then
                continue
            fi

            # Skip main project (root repo's docker compose)
            if [[ "$project" == "main" || "$project" == "$main_repo_name" ]]; then
                continue
            fi

            # Check if corresponding worktree exists
            local found=false
            for wt in $active_worktrees; do
                if [[ "$wt" == "$project" ]]; then
                    found=true
                    break
                fi
            done

            if [[ "$found" == false ]]; then
                echo "$project"
            fi
        done
}

# Get projects for merged branches
get_merged_projects() {
    local merged_branches
    merged_branches=$(get_merged_branches)

    local main_branch
    main_branch=$(get_main_branch)

    for branch in $merged_branches; do
        # Skip main/master branch
        if [[ "$branch" == "main" || "$branch" == "master" || "$branch" == "$main_branch" ]]; then
            continue
        fi

        local wt_name
        wt_name=$(branch_to_worktree_name "$branch")

        # Skip if it's 'main' project
        if [[ "$wt_name" == "main" ]]; then
            continue
        fi

        # Check if Docker Compose project exists
        if docker compose ls -a --format json 2>/dev/null | \
            jq -r '.[] | .Name' | grep -q "^${wt_name}$"; then
            echo "$wt_name"
        fi
    done
}

# Remove a Docker Compose project and its resources
remove_project() {
    local project="$1"
    local include_volumes="$2"
    local dry_run="$3"

    if [[ "$dry_run" == true ]]; then
        log_dry "Would remove project: $project"

        # Show what would be removed
        local containers
        containers=$(docker ps -a --filter "label=com.docker.compose.project=${project}" --format "{{.Names}}" 2>/dev/null || true)
        if [[ -n "$containers" ]]; then
            echo "  Containers:"
            echo "$containers" | sed 's/^/    - /'
        fi

        if [[ "$include_volumes" == true ]]; then
            local volumes
            volumes=$(docker volume ls --filter "name=${project}_" --format "{{.Name}}" 2>/dev/null || true)
            if [[ -n "$volumes" ]]; then
                echo "  Volumes:"
                echo "$volumes" | sed 's/^/    - /'
            fi
        fi

        local networks
        networks=$(docker network ls --filter "name=${project}_" --format "{{.Name}}" 2>/dev/null || true)
        if [[ -n "$networks" ]]; then
            echo "  Networks:"
            echo "$networks" | sed 's/^/    - /'
        fi

        return 0
    fi

    log_info "Removing project: $project"

    # Find config file
    local config_file=""
    local project_info
    project_info=$(docker compose ls -a --format json 2>/dev/null | \
        jq -r --arg p "$project" '.[] | select(.Name == $p) | .ConfigFiles' | head -1)

    if [[ -n "$project_info" && "$project_info" != "null" ]]; then
        config_file=$(echo "$project_info" | cut -d',' -f1)
    fi

    # Try to use docker compose down
    if [[ -n "$config_file" && -f "$config_file" ]]; then
        local compose_dir
        compose_dir=$(dirname "$config_file")

        local down_flags=("--remove-orphans")
        if [[ "$include_volumes" == true ]]; then
            down_flags+=("--volumes")
        fi

        if (cd "$compose_dir" && docker compose -p "$project" down "${down_flags[@]}" 2>/dev/null); then
            log_success "Project removed via docker compose down: $project"
            return 0
        fi
    fi

    # Fallback: manual removal
    log_warn "Falling back to manual removal for: $project"

    # Stop and remove containers
    local containers
    containers=$(docker ps -a --filter "label=com.docker.compose.project=${project}" -q 2>/dev/null || true)
    if [[ -n "$containers" ]]; then
        docker stop $containers 2>/dev/null || true
        docker rm $containers 2>/dev/null || true
        log_success "Containers removed"
    fi

    # Remove volumes (if requested)
    if [[ "$include_volumes" == true ]]; then
        local volumes
        volumes=$(docker volume ls --filter "name=${project}_" -q 2>/dev/null || true)
        if [[ -n "$volumes" ]]; then
            docker volume rm $volumes 2>/dev/null || true
            log_success "Volumes removed"
        fi
    fi

    # Remove networks
    local networks
    networks=$(docker network ls --filter "name=${project}_" -q 2>/dev/null || true)
    if [[ -n "$networks" ]]; then
        docker network rm $networks 2>/dev/null || true
        log_success "Networks removed"
    fi

    log_success "Project removed: $project"
}

main() {
    local dry_run=false
    local force=false
    local include_volumes=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            --include-volumes)
                include_volumes=true
                shift
                ;;
            -*)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                log_error "Unexpected argument: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    log_info "=== Prune Containers ==="
    log_info "Scanning for orphaned Docker Compose projects..."

    # Collect projects to remove
    local orphaned_projects merged_projects all_projects
    orphaned_projects=$(get_orphaned_projects | sort -u)
    merged_projects=$(get_merged_projects | sort -u)

    # Combine and deduplicate
    all_projects=$(echo -e "${orphaned_projects}\n${merged_projects}" | sort -u | grep -v '^$' || true)

    if [[ -z "$all_projects" ]]; then
        log_success "No orphaned or merged projects found. Nothing to clean up."
        exit 0
    fi

    # Report findings
    echo ""
    log_info "Found the following projects to clean up:"
    echo ""

    if [[ -n "$orphaned_projects" ]]; then
        echo -e "${YELLOW}Orphaned (worktree deleted):${NC}"
        echo "$orphaned_projects" | sed 's/^/  - /'
        echo ""
    fi

    if [[ -n "$merged_projects" ]]; then
        echo -e "${YELLOW}Merged branches:${NC}"
        echo "$merged_projects" | sed 's/^/  - /'
        echo ""
    fi

    # Confirm if not forced
    if [[ "$dry_run" == false && "$force" == false ]]; then
        echo ""
        if [[ "$include_volumes" == true ]]; then
            log_warn "Volumes will also be deleted!"
        else
            log_info "Volumes will be preserved (use --include-volumes to delete)"
        fi
        echo ""
        read -rp "Proceed with cleanup? [y/N] " answer
        if [[ ! "$answer" =~ ^[Yy]$ ]]; then
            log_warn "Aborted"
            exit 0
        fi
    fi

    # Remove projects
    local removed=0
    echo ""
    for project in $all_projects; do
        if remove_project "$project" "$include_volumes" "$dry_run"; then
            removed=$((removed + 1))
        fi
        echo ""
    done

    # Summary
    if [[ "$dry_run" == true ]]; then
        log_info "Dry run complete. ${removed} project(s) would be removed."
    else
        log_success "Cleanup complete. ${removed} project(s) removed."
    fi
}

main "$@"
