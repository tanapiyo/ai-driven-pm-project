#!/usr/bin/env bash
# tools/worktree/lib/container-health.sh
# Container health checking utilities for worktree management

# Check if a container is healthy and ready for work
# Args:
#   $1 - container_id: Docker container ID
#   $2 - max_wait: Maximum wait time in seconds (default: 300)
# Returns:
#   0 - Container is healthy
#   1 - Container not running or unhealthy
#   2 - Timeout waiting for healthy state
check_container_health() {
    local container_id="$1"
    local max_wait="${2:-300}"  # 5 minutes default

    if [[ -z "$container_id" ]]; then
        return 1
    fi

    local start_time=$(date +%s)

    while true; do
        # Check if container exists and is running
        if ! docker ps --filter "id=${container_id}" --format "{{.ID}}" 2>/dev/null | grep -q .; then
            return 1  # Container not running
        fi

        # Check container health status (if healthcheck defined)
        local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_id" 2>/dev/null || echo "none")

        if [[ "$health" == "healthy" ]]; then
            return 0
        fi

        # If no healthcheck defined, check for .dev-ready marker file
        if [[ "$health" == "none" ]]; then
            if docker exec "$container_id" test -f /workspace/.dev-ready 2>/dev/null; then
                return 0
            fi
        fi

        # Timeout check
        local now=$(date +%s)
        local elapsed=$((now - start_time))
        if [[ $elapsed -ge $max_wait ]]; then
            return 2  # Timeout
        fi

        sleep 2
    done
}

# Get container ID for a worktree using multiple detection strategies
# Args:
#   $1 - worktree_id: Numeric worktree ID
#   $2 - worktree_path: Absolute path to worktree directory
# Returns:
#   Prints container ID to stdout if found
#   Exit code 0 if found, 1 if not found
get_container_id_by_worktree() {
    local worktree_id="$1"
    local worktree_path="$2"

    # Strategy 1: By worktree.id label (most reliable)
    local container_id=$(docker ps -q --filter "label=worktree.id=${worktree_id}" 2>/dev/null | head -1)
    if [[ -n "$container_id" ]]; then
        echo "$container_id"
        return 0
    fi

    # Strategy 2: By devcontainer.local_folder label
    container_id=$(docker ps -q --filter "label=devcontainer.local_folder=${worktree_path}" 2>/dev/null | head -1)
    if [[ -n "$container_id" ]]; then
        echo "$container_id"
        return 0
    fi

    # Strategy 3: By compose project name
    local safe_name=$(basename "$worktree_path" | tr '/' '-')
    container_id=$(docker ps -q --filter "label=com.docker.compose.project=${safe_name}" 2>/dev/null | head -1)
    if [[ -n "$container_id" ]]; then
        echo "$container_id"
        return 0
    fi

    # Strategy 4: By container name pattern
    local repo_name=$(basename "$(dirname "$worktree_path")")
    local branch_name=$(basename "$worktree_path")
    local name_pattern="${repo_name}-${branch_name}"
    container_id=$(docker ps --filter "name=${name_pattern}" --format "{{.ID}}" 2>/dev/null | head -1)
    if [[ -n "$container_id" ]]; then
        echo "$container_id"
        return 0
    fi

    return 1  # Not found
}

# Wait for container to appear with polling
# Args:
#   $1 - worktree_id: Numeric worktree ID
#   $2 - worktree_path: Absolute path to worktree directory
#   $3 - max_wait: Maximum wait time in seconds (default: 60)
# Returns:
#   Prints container ID to stdout if found
#   Exit code 0 if found, 1 if not found within timeout
wait_for_container() {
    local worktree_id="$1"
    local worktree_path="$2"
    local max_wait="${3:-60}"

    local start_time=$(date +%s)

    while true; do
        local container_id=$(get_container_id_by_worktree "$worktree_id" "$worktree_path")
        if [[ -n "$container_id" ]]; then
            echo "$container_id"
            return 0
        fi

        local now=$(date +%s)
        local elapsed=$((now - start_time))
        if [[ $elapsed -ge $max_wait ]]; then
            return 1  # Timeout
        fi

        sleep 2
    done
}

# Get detailed container status information
# Args:
#   $1 - container_id: Docker container ID
# Returns:
#   Prints JSON-like status info to stdout
get_container_status() {
    local container_id="$1"

    if [[ -z "$container_id" ]]; then
        echo "status=not_found"
        return 1
    fi

    if ! docker ps -a --filter "id=${container_id}" --format "{{.ID}}" 2>/dev/null | grep -q .; then
        echo "status=not_found"
        return 1
    fi

    local state=$(docker inspect --format='{{.State.Status}}' "$container_id" 2>/dev/null)
    local health=$(docker inspect --format='{{.State.Health.Status}}' "$container_id" 2>/dev/null || echo "none")
    local name=$(docker inspect --format='{{.Name}}' "$container_id" 2>/dev/null | sed 's/^\///')
    local started=$(docker inspect --format='{{.State.StartedAt}}' "$container_id" 2>/dev/null)

    echo "status=$state"
    echo "health=$health"
    echo "name=$name"
    echo "started=$started"
    echo "id=$container_id"
}

# Stop container gracefully with timeout
# Args:
#   $1 - container_id: Docker container ID
#   $2 - timeout: Grace period in seconds (default: 30)
# Returns:
#   0 - Stopped successfully
#   1 - Failed to stop
stop_container_gracefully() {
    local container_id="$1"
    local timeout="${2:-30}"

    if [[ -z "$container_id" ]]; then
        return 1
    fi

    # Check if container exists
    if ! docker ps -a --filter "id=${container_id}" --format "{{.ID}}" 2>/dev/null | grep -q .; then
        return 0  # Already gone
    fi

    # Try graceful stop first
    if docker stop -t "$timeout" "$container_id" 2>/dev/null; then
        # Remove container
        docker rm "$container_id" 2>/dev/null || true
        return 0
    else
        # Force kill if graceful stop failed
        docker kill "$container_id" 2>/dev/null || true
        docker rm "$container_id" 2>/dev/null || true
        return 1
    fi
}

# Validate container ID format (security: prevent command injection)
# Args:
#   $1 - container_id: Container ID to validate
# Returns:
#   0 - Valid format (12-64 hex characters)
#   1 - Invalid format
validate_container_id() {
    local container_id="$1"

    if [[ -z "$container_id" ]]; then
        return 1
    fi

    # Docker container IDs are hex strings (12 chars short, 64 chars full)
    if [[ ! "$container_id" =~ ^[a-f0-9]{12,64}$ ]]; then
        return 1
    fi

    return 0
}

# Validate worktree path is within repository boundaries (security: prevent path traversal)
# Args:
#   $1 - worktree_path: Path to validate
#   $2 - repo_root: Repository root path
# Returns:
#   0 - Path is within ${repo_root}/worktrees/
#   1 - Path is outside boundaries
validate_worktree_path() {
    local worktree_path="$1"
    local repo_root="$2"

    if [[ -z "$worktree_path" || -z "$repo_root" ]]; then
        return 1
    fi

    # Resolve to absolute path (follow symlinks)
    local abs_path
    abs_path=$(cd "$worktree_path" 2>/dev/null && pwd) || abs_path="$worktree_path"

    # Check if path is within ${repo_root}/worktrees/
    if [[ "$abs_path" != "${repo_root}/worktrees"/* ]]; then
        return 1
    fi

    # Reject main repository path
    if [[ "$abs_path" == "$repo_root" ]]; then
        return 1
    fi

    return 0
}
