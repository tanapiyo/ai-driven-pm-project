#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# Source naming utilities library
source "${SCRIPT_DIR}/../tools/worktree/lib/naming.sh"

# Source subnet utilities library (calculate_subnet, get_next_worktree_id)
# SUBNET_STATE_DIR must be set before sourcing so the library knows where state lives
SUBNET_STATE_DIR="${ROOT_DIR}/.worktree-state"
export SUBNET_STATE_DIR
REPO_ROOT="${ROOT_DIR}"
export REPO_ROOT
source "${SCRIPT_DIR}/../tools/worktree/lib/subnet.sh"

echo "🔍 Detecting environment..."

is_worktree() {
    [[ -f "$ROOT_DIR/.git" ]]
}

get_worktree_name() {
    basename "$ROOT_DIR"
}

ensure_traefik() {
    bash "$SCRIPT_DIR/ensure-traefik.sh"
}

prepare_env() {
    local worktree_name="$1"
    local repo_name
    repo_name=$(get_repo_name "$ROOT_DIR")

    # Create endpoint name (includes repo name for URL uniqueness)
    local endpoint_name="${worktree_name}.${repo_name}"

    # Docker-safe project name (dots replaced with hyphens)
    local docker_project_name
    docker_project_name=$(sanitize_docker_project_name "$endpoint_name")

    local container_name
    container_name=$(get_container_name "$worktree_name")

    # Always scan Docker networks at runtime to find a free subnet.
    # No .env preservation or worktree-state lookup needed — just use whatever is
    # available right now. This is the simplest and most robust approach.
    # See issue #885.
    if ! find_available_subnet; then
        echo "ERROR: Could not allocate a free subnet — all 3328 slots are in use" >&2
        return 1
    fi
    local internal_subnet="$INTERNAL_SUBNET"
    local web_static_ip="$WEB_STATIC_IP"

    # Detect main .git directory for worktree git support inside container
    local main_git_dir=""
    if is_worktree; then
        main_git_dir=$(git -C "$ROOT_DIR" rev-parse --git-common-dir 2>/dev/null || true)
        if [[ -n "$main_git_dir" && -d "$main_git_dir" ]]; then
            # Resolve to absolute path
            main_git_dir=$(cd "$main_git_dir" && pwd)
        else
            main_git_dir=""
        fi
    fi

    # Regenerate .env with all required values including subnet variables
    cat > .env << EOF
WORKTREE=${docker_project_name}
ENDPOINT_NAME=${endpoint_name}
COMPOSE_PROJECT_NAME=${docker_project_name}
CONTAINER_NAME=${container_name}
HOST_WORKSPACE_PATH=$ROOT_DIR
INTERNAL_SUBNET=${internal_subnet}
WEB_STATIC_IP=${web_static_ip}
MAIN_GIT_DIR=${main_git_dir:-./.git}
EOF
    export WORKTREE="$docker_project_name"
    export ENDPOINT_NAME="$endpoint_name"
    export INTERNAL_SUBNET="$internal_subnet"
    export WEB_STATIC_IP="$web_static_ip"

    # Generate git worktree env file for container
    # Sets GIT_DIR and GIT_WORK_TREE so git works inside the container
    if is_worktree && [[ -n "$main_git_dir" ]]; then
        local wt_git_dir
        wt_git_dir=$(git -C "$ROOT_DIR" rev-parse --git-dir 2>/dev/null || true)
        local wt_name
        wt_name=$(basename "$wt_git_dir")
        cat > .devcontainer/.env.git-worktree << WTEOF
GIT_DIR=/workspace/.git-main/worktrees/${wt_name}
GIT_WORK_TREE=/workspace
WTEOF
        echo "🔗 Git worktree env: GIT_DIR → /workspace/.git-main/worktrees/${wt_name}"
    else
        # Non-worktree: remove stale env file if it exists
        rm -f .devcontainer/.env.git-worktree
    fi
}

main() {
    ensure_traefik

    local name
    if is_worktree; then
        echo "📂 Detected: worktree"
        name=$(get_worktree_name)
    else
        echo "📂 Detected: root repository"
        name=$(get_canonical_worktree_name "main" "$ROOT_DIR")
    fi

    prepare_env "$name"
    echo "🚀 Starting services for: $WORKTREE"
    docker compose -p "$WORKTREE" -f docker-compose.worktree.yml up -d --build
    echo "✅ Ready! Frontend: http://${ENDPOINT_NAME}.localhost | API: http://${ENDPOINT_NAME}.localhost/api"
    echo "   (Debug) Backend Direct: http://be-${ENDPOINT_NAME}.localhost"
}

main "$@"
