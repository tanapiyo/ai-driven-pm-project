#!/usr/bin/env bash
# tools/worktree/lib/docker-compose.sh
# Docker Compose resource management utilities for worktree cleanup

set -euo pipefail

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Validate Docker Compose project name (security: prevent command injection)
# Args:
#   $1 - project_name: Project name to validate
# Returns:
#   0 - Valid format (alphanumeric, dash, underscore only)
#   1 - Invalid format
validate_compose_project() {
    local project_name="$1"

    if [[ -z "$project_name" ]]; then
        return 1
    fi

    # Allow only alphanumeric, dash, underscore
    if [[ ! "$project_name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        return 1
    fi

    return 0
}

# Get Docker Compose project name for a worktree
# Args:
#   $1 - worktree_path: Absolute path to worktree directory
# Returns:
#   Prints project name to stdout
#   Exit code 0 if found, 1 if invalid
get_compose_project_name() {
    local worktree_path="$1"
    local project_name=""

    # Strategy 1: Read from .env file
    if [[ -f "${worktree_path}/.env" ]]; then
        project_name=$(grep -E '^COMPOSE_PROJECT_NAME=' "${worktree_path}/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'") || true
        if [[ -z "$project_name" ]]; then
            project_name=$(grep -E '^WORKTREE=' "${worktree_path}/.env" 2>/dev/null | cut -d= -f2 | tr -d '"' | tr -d "'") || true
        fi
    fi

    # Strategy 2: Fallback to worktree directory basename
    if [[ -z "$project_name" ]]; then
        project_name=$(basename "$worktree_path")
    fi

    # Validate project name
    if ! validate_compose_project "$project_name"; then
        log_error "Invalid Docker Compose project name: $project_name"
        return 1
    fi

    echo "$project_name"
    return 0
}

# Stop Docker Compose services for a worktree
# Args:
#   $1 - worktree_path: Absolute path to worktree directory
# Returns:
#   0 - Services stopped successfully or no services running
#   1 - Failed to stop services
stop_compose_services() {
    local worktree_path="$1"
    local project_name

    project_name=$(get_compose_project_name "$worktree_path") || return 1

    log_info "Stopping Docker Compose services for project: $project_name"

    # Check if docker compose file exists
    if [[ ! -f "${worktree_path}/docker-compose.worktree.yml" ]]; then
        log_warn "No docker-compose.worktree.yml found, skipping compose cleanup"
        return 0
    fi

    (
        cd "$worktree_path" || return 1
        if docker compose -p "$project_name" down 2>/dev/null; then
            log_success "Docker Compose services stopped"
            return 0
        else
            log_warn "Docker Compose down failed or no services running"
            return 0  # Non-fatal: services may already be stopped
        fi
    )
}

# Cleanup Docker Compose resources (containers, volumes, networks)
# Args:
#   $1 - worktree_path: Absolute path to worktree directory
#   $2 - dry_run: "true" for dry-run mode, "false" for actual cleanup (default: false)
# Returns:
#   0 - Resources cleaned up successfully
#   1 - Failed to cleanup resources
cleanup_compose_resources() {
    local worktree_path="$1"
    local dry_run="${2:-false}"
    local project_name

    project_name=$(get_compose_project_name "$worktree_path") || return 1

    if [[ "$dry_run" == "true" ]]; then
        list_compose_resources "$worktree_path"
        return 0
    fi

    log_info "Cleaning up Docker Compose resources for project: $project_name..."

    # Check if docker compose file exists
    if [[ ! -f "${worktree_path}/docker-compose.worktree.yml" ]]; then
        log_info "No docker-compose.worktree.yml found, skipping compose cleanup"
        return 0
    fi

    (
        cd "$worktree_path" || return 1

        # Stop and remove containers + volumes
        docker compose -p "$project_name" down -v 2>/dev/null || {
            log_warn "Docker Compose down -v failed, trying manual cleanup..."
        }

        # Prune orphaned volumes for this project
        docker volume prune -f --filter "label=com.docker.compose.project=$project_name" 2>/dev/null || true

        # Prune orphaned networks for this project (excluding traefik-public)
        docker network prune -f --filter "label=com.docker.compose.project=$project_name" 2>/dev/null || true
    )

    log_success "Docker Compose resources cleaned up"
    return 0
}

# List Docker Compose resources for dry-run mode
# Args:
#   $1 - worktree_path: Absolute path to worktree directory
# Returns:
#   Prints resource list to stdout
list_compose_resources() {
    local worktree_path="$1"
    local project_name

    project_name=$(get_compose_project_name "$worktree_path") || return 1

    echo ""
    echo "Would remove the following Docker Compose resources for project: $project_name"
    echo ""

    # Check if docker compose file exists
    if [[ ! -f "${worktree_path}/docker-compose.worktree.yml" ]]; then
        echo "  (No docker-compose.worktree.yml found)"
        return 0
    fi

    (
        cd "$worktree_path" 2>/dev/null || return 1

        echo "Containers:"
        if docker compose -p "$project_name" ps -a 2>/dev/null | tail -n +2 | grep -v '^$'; then
            :  # Output shown
        else
            echo "  (none)"
        fi
        echo ""

        echo "Volumes:"
        if docker volume ls --filter "label=com.docker.compose.project=$project_name" 2>/dev/null | tail -n +2 | grep -v '^$'; then
            :  # Output shown
        else
            echo "  (none)"
        fi
        echo ""

        echo "Networks:"
        if docker network ls --filter "label=com.docker.compose.project=$project_name" 2>/dev/null | tail -n +2 | grep -v '^$'; then
            :  # Output shown
        else
            echo "  (none)"
        fi
        echo ""
    )
}
