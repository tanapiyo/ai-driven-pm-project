#!/usr/bin/env bash
# tools/worktree/lib/naming.sh
# Canonical worktree and endpoint naming functions
#
# This library provides consistent naming for worktrees and endpoints
# to ensure all scripts follow the ${BRANCH}.${REPO}.localhost format
#
# Naming Convention:
# - Worktree directory name: ${SANITIZED_BRANCH}
# - Docker project name: ${SANITIZED_BRANCH}-${SANITIZED_REPO} (dots replaced with hyphens)
# - Container names: ${SANITIZED_BRANCH}-{db,dev,web,api} (branch name only, no repo name)
# - Frontend endpoint: http://${SANITIZED_BRANCH}.${SANITIZED_REPO}.localhost (domain includes repo name)
# - Backend endpoint: http://${SANITIZED_BRANCH}.${SANITIZED_REPO}.localhost/api
# - Backend direct: http://be-${SANITIZED_BRANCH}.${SANITIZED_REPO}.localhost

set -euo pipefail

# Get repository name from repository root path
# Args:
#   $1 - Repository root path (can be main repo or worktree)
# Returns:
#   Sanitized repository name (safe for Docker/DNS)
# Note:
#   For worktrees, this returns the PARENT repository name, not the worktree directory name.
#   This ensures consistent naming between spawn.sh, init-environment.sh, and devcontainer-exec.sh.
get_repo_name() {
    local repo_root="$1"
    local repo_name

    # Check if this is a worktree (has .git file instead of .git directory)
    if [[ -f "${repo_root}/.git" ]]; then
        # This is a worktree - get the parent repository name
        local parent_repo
        parent_repo=$(cd "${repo_root}" && git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/.git$||' || echo "")
        if [[ -n "$parent_repo" ]]; then
            repo_name=$(basename "${parent_repo}")
        else
            # Fallback: use current directory name
            repo_name=$(basename "${repo_root}")
        fi
    else
        # This is the main repository
        repo_name=$(basename "${repo_root}")
    fi

    # Sanitize repo name (same rules as branch name)
    # This prevents issues if repo directory contains special characters
    echo "$repo_name" \
        | sed 's/[^a-zA-Z0-9\/-]/-/g' \
        | sed 's/\//-/g' \
        | tr '[:upper:]' '[:lower:]' \
        | sed 's/^-*//' \
        | sed 's/-*$//' \
        | sed 's/--*/-/g'
}

# Sanitize branch name for use in subdomain/directory names
# Args:
#   $1 - Branch name (e.g., "feat/add-login", "main", "fix/bug#123")
# Returns:
#   Sanitized name safe for subdomains (e.g., "feat-add-login", "main", "fix-bug-123")
# Note:
#   - Strips Unicode/emoji characters
#   - Truncates to 100 characters (leaves room for repo name within 63-char DNS limit)
#   - Collapses consecutive dashes
sanitize_branch_name() {
    local branch="$1"

    # 1. Remove Unicode/emoji (keep only ASCII alphanumeric, forward slash, dash)
    # 2. Replace invalid characters with dash
    # 3. Convert forward slashes to dashes
    # 4. Convert to lowercase
    # 5. Collapse consecutive dashes
    # 6. Remove leading/trailing dashes
    # 7. Truncate to 100 chars (safe limit for DNS label when combined with repo name)
    echo "$branch" \
        | LC_ALL=C sed 's/[^a-zA-Z0-9\/-]/-/g' \
        | sed 's/\//-/g' \
        | tr '[:upper:]' '[:lower:]' \
        | sed 's/--*/-/g' \
        | sed 's/^-*//' \
        | sed 's/-*$//' \
        | cut -c1-100
}

# Get endpoint name for URLs (includes repository name)
# Args:
#   $1 - Branch name
#   $2 - Repository root path
# Returns:
#   Endpoint name (e.g., "feat-login.myapp")
get_endpoint_name() {
    local branch="$1"
    local repo_root="$2"

    local safe_branch
    safe_branch=$(sanitize_branch_name "$branch")

    local repo_name
    repo_name=$(get_repo_name "$repo_root")

    echo "${safe_branch}.${repo_name}"
}

# Sanitize endpoint name for Docker Compose project name
# Args:
#   $1 - Endpoint name (e.g., "feat-login.myapp")
# Returns:
#   Docker-safe project name (e.g., "feat-login-myapp")
# Note:
#   Docker Compose project names must contain only lowercase alphanumeric characters,
#   hyphens, and underscores. Dots are not allowed.
sanitize_docker_project_name() {
    local endpoint_name="$1"

    # Replace dots with hyphens for Docker Compose compatibility
    echo "$endpoint_name" | sed 's/\./-/g'
}

# Get canonical worktree name
# Args:
#   $1 - Branch name
#   $2 - Repository root path (unused, kept for backward compatibility)
# Returns:
#   Canonical worktree name (e.g., "main", "feat-login")
get_canonical_worktree_name() {
    local branch="$1"
    # repo_root parameter is unused but kept for backward compatibility

    sanitize_branch_name "$branch"
}

# Get worktree directory path
# Args:
#   $1 - Branch name
#   $2 - Repository root path
# Returns:
#   Full path to worktree directory (e.g., "/path/to/repo/worktrees/main")
get_worktree_path() {
    local branch="$1"
    local repo_root="$2"

    local worktree_name
    worktree_name=$(get_canonical_worktree_name "$branch" "$repo_root")

    echo "${repo_root}/worktrees/${worktree_name}"
}

# Get frontend endpoint URL
# Args:
#   $1 - Endpoint name (e.g., "feat-login.myapp")
# Returns:
#   Frontend URL (e.g., "http://feat-login.myapp.localhost")
get_frontend_endpoint() {
    local endpoint_name="$1"
    echo "http://${endpoint_name}.localhost"
}

# Get backend API endpoint URL
# Args:
#   $1 - Endpoint name (e.g., "feat-login.myapp")
# Returns:
#   Backend API URL (e.g., "http://feat-login.myapp.localhost/api")
get_backend_api_endpoint() {
    local endpoint_name="$1"
    echo "http://${endpoint_name}.localhost/api"
}

# Get backend direct endpoint URL (for debugging)
# Args:
#   $1 - Endpoint name (e.g., "feat-login.myapp")
# Returns:
#   Backend direct URL (e.g., "http://be-feat-login.myapp.localhost")
get_backend_direct_endpoint() {
    local endpoint_name="$1"
    echo "http://be-${endpoint_name}.localhost"
}

# Get container name (branch name only, no repo name)
# Args:
#   $1 - Branch name
# Returns:
#   Container name (e.g., "feat-login", "chore-docker-container-naming")
# Note:
#   Container names should only include the branch name, NOT the repository name.
#   This prevents duplicate containers when restarting (branch-only + repo-name variant).
get_container_name() {
    local branch="$1"

    # Use the same sanitization as branch name
    sanitize_branch_name "$branch"
}
