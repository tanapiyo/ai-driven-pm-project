#!/usr/bin/env bash
# tools/worktree/spawn.sh
# Worktree を作成し、DevContainer を起動する
#
# Usage:
#   ./tools/worktree/spawn.sh <agent-type> --issue <number>
#   ./tools/worktree/spawn.sh <agent-type> <branch-name> [--context <file>]
#
# Examples:
#   ./tools/worktree/spawn.sh implementer --issue 123
#   ./tools/worktree/spawn.sh implementer feat/GH-123-auth
#   ./tools/worktree/spawn.sh architect feat/GH-456-refactor --context .worktree-context.yaml

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STATE_DIR="${REPO_ROOT}/.worktree-state"

# Source container health check library
source "${SCRIPT_DIR}/lib/container-health.sh"

# Source naming utilities library
source "${SCRIPT_DIR}/lib/naming.sh"

# Source subnet utilities library (calculate_subnet, get_next_worktree_id)
SUBNET_STATE_DIR="${STATE_DIR}"
export SUBNET_STATE_DIR
export REPO_ROOT
source "${SCRIPT_DIR}/lib/subnet.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $*" >&2; }
log_success() { echo -e "${GREEN}[OK]${NC} $*" >&2; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Generate branch name from GitHub Issue
# Args:
#   $1 - issue_number: GitHub issue number
# Returns:
#   Branch name in format: <type>/<slug>-<issue_number>
#   e.g., feat/add-auth-token-123
generate_branch_from_issue() {
    local issue_number="$1"

    # Validate issue number format
    if [[ ! "$issue_number" =~ ^[0-9]+$ ]]; then
        log_error "Invalid issue number: $issue_number (must be numeric)"
        return 1
    fi

    # Check if gh CLI is available
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) is required for --issue flag"
        log_error "Install: https://cli.github.com/"
        return 1
    fi

    # Check if authenticated
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated"
        log_error "Run: gh auth login"
        return 1
    fi

    log_info "Fetching GitHub Issue #${issue_number}..."

    # Get issue details
    local issue_json
    if ! issue_json=$(gh issue view "$issue_number" --json title,labels,state 2>&1); then
        log_error "Failed to fetch issue #${issue_number}"
        log_error "$issue_json"
        return 1
    fi

    # Check issue state
    local issue_state
    issue_state=$(echo "$issue_json" | jq -r '.state')
    if [[ "$issue_state" == "CLOSED" ]]; then
        log_warn "Issue #${issue_number} is closed"
        read -rp "Continue anyway? [y/N] " answer
        if [[ ! "$answer" =~ ^[Yy]$ ]]; then
            log_error "Aborted"
            return 1
        fi
    fi

    # Get issue title
    local issue_title
    issue_title=$(echo "$issue_json" | jq -r '.title')
    log_info "Issue title: $issue_title"

    # Determine branch type from labels
    local branch_type="feat"
    local labels
    labels=$(echo "$issue_json" | jq -r '.labels[].name' 2>/dev/null || echo "")

    if echo "$labels" | grep -qiE "^bug$|^fix$|^bugfix$"; then
        branch_type="fix"
    elif echo "$labels" | grep -qiE "^documentation$|^docs$"; then
        branch_type="docs"
    elif echo "$labels" | grep -qiE "^chore$|^maintenance$"; then
        branch_type="chore"
    elif echo "$labels" | grep -qiE "^refactor$|^refactoring$"; then
        branch_type="refactor"
    elif echo "$labels" | grep -qiE "^enhancement$|^feature$"; then
        branch_type="feat"
    fi

    # Generate slug from title
    # 1. Convert to lowercase
    # 2. Replace non-alphanumeric with dash
    # 3. Remove leading/trailing dashes
    # 4. Collapse consecutive dashes
    # 5. Truncate to 40 chars (leave room for type and issue number)
    local slug
    slug=$(echo "$issue_title" \
        | tr '[:upper:]' '[:lower:]' \
        | LC_ALL=C sed 's/[^a-z0-9]/-/g' \
        | sed 's/^-*//' \
        | sed 's/-*$//' \
        | sed 's/--*/-/g' \
        | cut -c1-40 \
        | sed 's/-*$//')

    # Construct branch name: type/slug-issue_number
    local branch_name="${branch_type}/${slug}-${issue_number}"

    log_success "Generated branch name: $branch_name"
    echo "$branch_name"
}

show_usage() {
    cat << EOF
Usage: $(basename "$0") <agent-type> --issue <number>
       $(basename "$0") <agent-type> <branch-name> [options]

Arguments:
  agent-type    Agent to run: pdm, architect, designer, implementer, qa, reviewer
  branch-name   Git branch name (will be created from remote main HEAD)

Options:
  --issue <number>    GitHub Issue number (auto-generates branch name from issue)
  --context <file>    Context file to pass to agent (.worktree-context.yaml)
  --no-devcontainer   Skip DevContainer startup
  --from-remote-main  (Default) Create branch from origin/main HEAD (MANDATORY)
  --dry-run           Show what would be done without executing
  -h, --help          Show this help message

IMPORTANT: All worktrees are ALWAYS created from the latest origin/main HEAD.
           This ensures clean separation from main and latest code base.

Examples:
  $(basename "$0") implementer --issue 123
  $(basename "$0") implementer feat/GH-123-auth
  $(basename "$0") architect feat/GH-456-design --context context.yaml
EOF
}

# Validate agent type
VALID_AGENTS=("pdm" "architect" "designer" "implementer" "qa" "reviewer" "orchestrator")

validate_agent() {
    local agent="$1"
    for valid in "${VALID_AGENTS[@]}"; do
        if [[ "$agent" == "$valid" ]]; then
            return 0
        fi
    done
    return 1
}

# Allocate port range for worktree
allocate_ports() {
    local worktree_id="$1"
    # Base port + worktree_id * 10 (each worktree gets 10 ports)
    # Range: 3000-3099 for worktree 0, 3100-3199 for worktree 1, etc.
    local base_port=$((3000 + worktree_id * 100))
    echo "$base_port"
}

# Create state file for worktree
create_state_file() {
    local worktree_path="$1"
    local branch="$2"
    local agent="$3"
    local worktree_id="$4"
    local context_file="$5"
    local port_base="$6"

    mkdir -p "${STATE_DIR}"
    local state_file="${STATE_DIR}/$(basename "${worktree_path}").yaml"

    cat > "${state_file}" << EOF
# Worktree State File
# Generated: $(date -Iseconds)

worktree_id: ${worktree_id}
worktree_path: "${worktree_path}"
branch: "${branch}"
agent: "${agent}"
status: "running"
port_base: ${port_base}
created_at: "$(date -Iseconds)"
context_file: "${context_file:-none}"

# DevContainer info (populated after startup)
container_id: ""
container_name: ""
EOF

    echo "${state_file}"
}

# Print handoff block for Claude session continuation
print_handoff_block() {
    local worktree_path="$1"
    local branch_name="$2"
    local agent_type="$3"
    local context_file="$4"

    # Extract issue number from branch name (e.g., feat/GH-123-foo -> GH-123, feat/issue-123 -> #123)
    local issue_ref=""
    if [[ "$branch_name" =~ GH-([0-9]+) ]]; then
        issue_ref="#${BASH_REMATCH[1]}"
    elif [[ "$branch_name" =~ issue-([0-9]+) ]]; then
        issue_ref="#${BASH_REMATCH[1]}"
    elif [[ "$branch_name" =~ ([0-9]+) ]]; then
        issue_ref="#${BASH_REMATCH[1]}"
    fi

    # Detect plan file in ~/.claude/plans/
    local plan_file=""
    local plan_dir="${HOME}/.claude/plans"
    if [[ -d "$plan_dir" ]]; then
        # Find most recent plan file (modified in last 24 hours)
        plan_file=$(find "$plan_dir" -name "*.md" -mtime -1 -type f 2>/dev/null | head -1 || echo "")
    fi

    # Check DevContainer status
    local devcontainer_status="Not running"
    if [[ -f "${worktree_path}/.setup-status" ]]; then
        local status_content
        status_content=$(cat "${worktree_path}/.setup-status" 2>/dev/null || echo "")
        if [[ "$status_content" == "READY" ]]; then
            devcontainer_status="Running"
        fi
    fi

    # Generate VS Code command
    local vscode_cmd="code $worktree_path"
    local vscode_devcontainer_cmd="code --folder-uri vscode-remote://dev-container+$(echo -n "$worktree_path" | xxd -p | tr -d '\n')/workspace"

    # Print handoff block
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "📋 HANDOFF - Copy commands below to continue in new VS Code window"
    echo "════════════════════════════════════════════════════════════════════"
    echo ""
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│ 1. OPEN VS CODE (copy and run in terminal)                     │"
    echo "└─────────────────────────────────────────────────────────────────┘"
    echo ""
    echo "$vscode_cmd"
    echo ""
    echo "# Or with DevContainer (recommended):"
    echo "$vscode_devcontainer_cmd"
    echo ""
    echo "┌─────────────────────────────────────────────────────────────────┐"
    echo "│ 2. CLAUDE PROMPT (copy and paste to Claude in new window)      │"
    echo "└─────────────────────────────────────────────────────────────────┘"
    echo ""
    echo "────────────────── COPY FROM HERE ──────────────────"

    # Generate the Claude prompt
    if [[ -n "$issue_ref" ]]; then
        echo "Continue implementing GitHub Issue ${issue_ref}"
    else
        echo "Continue working on branch: ${branch_name}"
    fi
    echo ""
    echo "## Summary"
    echo "<!-- Add brief description of the task here -->"
    echo ""
    echo "## Current Status"
    echo "- Worktree created at: ${worktree_path}"
    echo "- Branch: ${branch_name}"
    echo "- DevContainer: ${devcontainer_status}"
    if [[ -n "$plan_file" ]]; then
        echo "- Plan file: ${plan_file}"
    fi
    echo ""
    echo "Run /kickoff to continue exploration and planning."
    echo "────────────────── COPY TO HERE ────────────────────"
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo ""

    # Also save the handoff prompt to a file for easy access
    local handoff_file="${worktree_path}/.claude-handoff.md"
    {
        if [[ -n "$issue_ref" ]]; then
            echo "Continue implementing GitHub Issue ${issue_ref}"
        else
            echo "Continue working on branch: ${branch_name}"
        fi
        echo ""
        echo "## Summary"
        echo "<!-- Add brief description of the task here -->"
        echo ""
        echo "## Current Status"
        echo "- Worktree created at: ${worktree_path}"
        echo "- Branch: ${branch_name}"
        echo "- DevContainer: ${devcontainer_status}"
        if [[ -n "$plan_file" ]]; then
            echo "- Plan file: ${plan_file}"
        fi
        echo ""
        echo "Run /kickoff to continue exploration and planning."
    } > "$handoff_file"

    log_info "Handoff prompt saved to: $handoff_file"
}

# Create worktree context file
create_worktree_context() {
    local worktree_path="$1"
    local branch="$2"
    local agent="$3"
    local source_context="$4"

    local context_file="${worktree_path}/.worktree-context.yaml"

    if [[ -n "$source_context" && -f "$source_context" ]]; then
        # Copy and extend source context
        cp "$source_context" "$context_file"
        cat >> "$context_file" << EOF

# Auto-added by spawn.sh
_spawn_info:
  spawned_at: "$(date -Iseconds)"
  worktree_path: "${worktree_path}"
  branch: "${branch}"
  assigned_agent: "${agent}"
EOF
    else
        # Create new context
        cat > "$context_file" << EOF
# Worktree Context
# Generated: $(date -Iseconds)

task_id: "$(echo "$branch" | grep -oE 'GH-[0-9]+' || echo 'unknown')"
parent_agent: "orchestrator"
assigned_agent: "${agent}"
branch: "${branch}"
worktree_path: "${worktree_path}"

# Context references (to be filled by agent)
context:
  spec: ""
  plan: ""
  adr: ""

# Success criteria
success_criteria:
  - "contract test passes"
  - "docs updated if needed"

# Completion callback
on_complete:
  notify: "orchestrator"
  action: "report-status"
EOF
    fi

    echo "$context_file"
}

# Main
main() {
    local agent_type=""
    local branch_name=""
    local context_file=""
    local no_devcontainer=false
    local dry_run=false
    local from_remote_main=true  # ALWAYS true - this is mandatory
    local issue_number=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            --issue)
                issue_number="$2"
                shift 2
                ;;
            --context)
                context_file="$2"
                shift 2
                ;;
            --no-devcontainer)
                no_devcontainer=true
                shift
                ;;
            --from-remote-main)
                # This is always true, but accept the flag for explicitness
                from_remote_main=true
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
                if [[ -z "$agent_type" ]]; then
                    agent_type="$1"
                elif [[ -z "$branch_name" ]]; then
                    branch_name="$1"
                else
                    log_error "Unexpected argument: $1"
                    show_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # Generate branch name from issue if --issue flag is provided
    if [[ -n "$issue_number" ]]; then
        if [[ -n "$branch_name" ]]; then
            log_error "Cannot use both --issue and branch-name arguments"
            show_usage
            exit 1
        fi
        branch_name=$(generate_branch_from_issue "$issue_number") || exit 1
    fi

    # Validate required arguments
    if [[ -z "$agent_type" || -z "$branch_name" ]]; then
        log_error "Missing required arguments"
        show_usage
        exit 1
    fi

    # Validate agent type
    if ! validate_agent "$agent_type"; then
        log_error "Invalid agent type: $agent_type"
        log_error "Valid agents: ${VALID_AGENTS[*]}"
        exit 1
    fi

    # Validate context file if provided
    if [[ -n "$context_file" && ! -f "$context_file" ]]; then
        log_error "Context file not found: $context_file"
        exit 1
    fi

    # Calculate paths and IDs
    local worktree_path
    worktree_path=$(get_worktree_path "$branch_name" "$REPO_ROOT")
    local worktree_id
    worktree_id=$(get_next_worktree_id)
    local port_base
    port_base=$(allocate_ports "$worktree_id")

    # Find an available subnet, auto-retrying on collision with existing Docker networks.
    # Sets INTERNAL_SUBNET and WEB_STATIC_IP globals.
    # Never kills/stops conflicting containers — only skips to the next slot.
    if ! find_available_subnet "$worktree_id"; then
        log_error "Could not allocate a free subnet — all 3328 slots are in use"
        exit 1
    fi

    log_info "=== Worktree Spawn ==="
    log_info "Agent:      $agent_type"
    log_info "Branch:     $branch_name"
    log_info "Path:       $worktree_path"
    log_info "Worktree ID: $worktree_id"
    log_info "Port range: ${port_base}-$((port_base + 99))"
    log_info "Subnet:     $INTERNAL_SUBNET (web: $WEB_STATIC_IP)"

    if [[ "$dry_run" == true ]]; then
        log_warn "Dry run mode - no changes will be made"
        exit 0
    fi

    # Check if worktree already exists
    if [[ -d "$worktree_path" ]]; then
        log_warn "Worktree already exists at $worktree_path"
        read -rp "Remove and recreate? [y/N] " answer
        if [[ "$answer" =~ ^[Yy]$ ]]; then
            log_info "Removing existing worktree..."
            git -C "${REPO_ROOT}" worktree remove --force "$worktree_path" 2>/dev/null || rm -rf "$worktree_path"
            git -C "${REPO_ROOT}" worktree prune
        else
            log_error "Aborted"
            exit 1
        fi
    fi

    # MANDATORY: Fetch latest from remote main before creating worktree
    log_info "Fetching latest from origin/main..."
    if ! git -C "${REPO_ROOT}" fetch origin main --quiet 2>/dev/null; then
        log_warn "Could not fetch origin/main, using local state"
    fi

    # Determine the base commit (ALWAYS origin/main)
    local base_ref="origin/main"
    if ! git -C "${REPO_ROOT}" rev-parse --verify "$base_ref" >/dev/null 2>&1; then
        # Fallback to local main if origin/main doesn't exist
        base_ref="main"
        if ! git -C "${REPO_ROOT}" rev-parse --verify "$base_ref" >/dev/null 2>&1; then
            log_error "Neither origin/main nor main branch exists"
            exit 1
        fi
        log_warn "Using local main instead of origin/main"
    fi

    local base_commit
    base_commit=$(git -C "${REPO_ROOT}" rev-parse "$base_ref")
    log_info "Base commit: $base_commit (from $base_ref)"

    # Create worktree - ALWAYS from remote main HEAD
    log_info "Creating worktree from $base_ref..."
    if git -C "${REPO_ROOT}" rev-parse --verify "$branch_name" >/dev/null 2>&1; then
        # Branch already exists - this is NOT allowed for new worktrees
        log_error "Branch '$branch_name' already exists."
        log_error "Worktrees must be created with NEW branches from origin/main HEAD."
        log_error "Please choose a different branch name or remove the existing branch."
        exit 1
    else
        # Create new branch from origin/main HEAD (MANDATORY)
        git -C "${REPO_ROOT}" worktree add -b "$branch_name" "$worktree_path" "$base_ref"
    fi
    log_success "Worktree created at $worktree_path (based on $base_ref)"

    # Create context file in worktree
    log_info "Creating worktree context..."
    local wt_context
    wt_context=$(create_worktree_context "$worktree_path" "$branch_name" "$agent_type" "$context_file")
    log_success "Context file: $wt_context"

    # Create state file
    log_info "Creating state file..."
    local state_file
    state_file=$(create_state_file "$worktree_path" "$branch_name" "$agent_type" "$worktree_id" "$context_file" "$port_base")
    log_success "State file: $state_file"

    # Trap cleanup on error
    cleanup_on_error() {
        log_error "Startup failed, cleaning up..."
        if [[ -n "${container_id:-}" ]]; then
            docker stop "$container_id" 2>/dev/null || true
        fi
        git -C "${REPO_ROOT}" worktree remove --force "$worktree_path" 2>/dev/null || true
        rm -f "$state_file"
    }
    trap cleanup_on_error ERR

    # Start DevContainer if requested
    if [[ "$no_devcontainer" == false ]]; then
        log_info "Starting DevContainer..."

        # Pre-flight check: Ensure Docker is available
        if ! docker info >/dev/null 2>&1; then
            log_error "Docker daemon is not running or not accessible"
            log_error "Please start Docker Desktop or check docker permissions"
            exit 1
        fi

        # Check if devcontainer CLI is available
        if ! command -v devcontainer &> /dev/null; then
            log_warn "devcontainer CLI not found. Using docker compose fallback..."

            # Docker compose fallback (works without devcontainer CLI)
            local worktree_name
            worktree_name=$(basename "$worktree_path")

            # Generate endpoint name (includes repository name for URL uniqueness)
            local endpoint_name
            endpoint_name=$(get_endpoint_name "$branch_name" "$REPO_ROOT")

            # Create Docker-safe project name (dots replaced with hyphens)
            # Docker Compose project names can only contain alphanumeric, hyphens, underscores
            local docker_project_name
            docker_project_name=$(sanitize_docker_project_name "$endpoint_name")

            # Ensure traefik network exists
            log_info "Ensuring traefik network..."
            if [[ -f "${REPO_ROOT}/scripts/ensure-traefik.sh" ]]; then
                bash "${REPO_ROOT}/scripts/ensure-traefik.sh" || {
                    log_warn "Failed to setup traefik network. Services may not be accessible via hostname."
                }
            fi

            # Prepare environment variables
            log_info "Preparing environment for docker compose..."
            local container_name
            container_name=$(get_container_name "$branch_name")
            cat > "${worktree_path}/.env" << EOF
WORKTREE=${docker_project_name}
ENDPOINT_NAME=${endpoint_name}
COMPOSE_PROJECT_NAME=${docker_project_name}
CONTAINER_NAME=${container_name}
HOST_WORKSPACE_PATH=${worktree_path}
INTERNAL_SUBNET=${INTERNAL_SUBNET}
WEB_STATIC_IP=${WEB_STATIC_IP}
EOF

            # Append user-local secrets if present
            if [ -f "${REPO_ROOT}/.env.secrets" ]; then
                log_info "Appending .env.secrets to worktree .env..."
                cat "${REPO_ROOT}/.env.secrets" >> "${worktree_path}/.env"
            fi

            # Start containers with docker compose
            log_info "Starting containers with docker compose..."
            (
                cd "$worktree_path"
                echo "STARTING" > .setup-status
                if docker compose -p "${docker_project_name}" -f docker-compose.worktree.yml up -d --build 2>&1 | tee .devcontainer-startup.log; then
                    echo "READY" > .setup-status
                else
                    echo "FAILED" > .setup-status
                    exit 1
                fi
            ) &
            local bg_pid=$!

            # Wait for dev container to appear
            log_info "Waiting for container to start..."
            local container_id=""
            # Try to find the dev container by compose project label (use Docker-safe name)
            local max_wait=60
            local start_time=$(date +%s)
            while true; do
                container_id=$(docker ps -q --filter "label=com.docker.compose.project=${docker_project_name}" --filter "label=com.docker.compose.service=dev" 2>/dev/null | head -1)
                if [[ -n "$container_id" ]]; then
                    break
                fi

                local now=$(date +%s)
                local elapsed=$((now - start_time))
                if [[ $elapsed -ge $max_wait ]]; then
                    log_error "Container failed to start within ${max_wait} seconds"
                    log_error "Check logs at: ${worktree_path}/.devcontainer-startup.log"
                    wait $bg_pid || true
                    exit 1
                fi
                sleep 2
            done

            log_success "Container started: $container_id"

            # Update state file with container ID
            local container_name_actual
            container_name_actual=$(docker inspect --format '{{.Name}}' "$container_id" 2>/dev/null | sed 's/^\///' || echo "")

            if [[ -n "$container_id" ]]; then
                sed -i.bak "s|^container_id: \".*\"|container_id: \"${container_id}\"|" "$state_file"
            fi
            if [[ -n "$container_name_actual" ]]; then
                sed -i.bak "s|^container_name: \".*\"|container_name: \"${container_name_actual}\"|" "$state_file"
            fi
            rm -f "${state_file}.bak"

            # Wait for container to be healthy
            log_info "Waiting for container to be ready (up to 5 minutes)..."
            if check_container_health "$container_id" 300; then
                log_success "Container is healthy!"
            else
                local exit_code=$?
                if [[ $exit_code -eq 2 ]]; then
                    log_error "Container health check timed out after 5 minutes"
                    log_error "Check logs with: docker logs ${container_id}"
                else
                    log_error "Container is not healthy"
                    log_error "Check logs with: docker logs ${container_id}"
                fi
                exit 1
            fi

            # Wait for background process to complete
            wait $bg_pid || {
                log_error "Docker compose startup process failed"
                exit 1
            }

            log_success "DevContainer (docker compose fallback) fully initialized"
            log_info "Frontend: $(get_frontend_endpoint "$endpoint_name")"
            log_info "Backend API: $(get_backend_api_endpoint "$endpoint_name")"
            log_info "Backend (direct): $(get_backend_direct_endpoint "$endpoint_name")"
        else
            # Generate endpoint name (includes repository name for URL uniqueness)
            local endpoint_name
            endpoint_name=$(get_endpoint_name "$branch_name" "$REPO_ROOT")

            # Create Docker-safe project name (dots replaced with hyphens)
            local docker_project_name
            docker_project_name=$(sanitize_docker_project_name "$endpoint_name")

            # Generate container name using naming library for consistency with docker-compose fallback
            local container_name
            container_name=$(get_container_name "$branch_name")

            # Ensure traefik network exists
            log_info "Ensuring traefik network..."
            if [[ -f "${REPO_ROOT}/scripts/ensure-traefik.sh" ]]; then
                bash "${REPO_ROOT}/scripts/ensure-traefik.sh" || {
                    log_warn "Failed to setup traefik network. Services may not be accessible via hostname."
                }
            fi

            # Prepare environment variables file so docker-compose.worktree.yml can resolve
            # ${CONTAINER_NAME}, ${ENDPOINT_NAME}, ${COMPOSE_PROJECT_NAME}, ${WORKTREE}
            log_info "Preparing environment for devcontainer..."
            cat > "${worktree_path}/.env" << EOF
WORKTREE=${docker_project_name}
ENDPOINT_NAME=${endpoint_name}
COMPOSE_PROJECT_NAME=${docker_project_name}
CONTAINER_NAME=${container_name}
HOST_WORKSPACE_PATH=${worktree_path}
INTERNAL_SUBNET=${INTERNAL_SUBNET}
WEB_STATIC_IP=${WEB_STATIC_IP}
EOF

            # Append user-local secrets if present
            if [ -f "${REPO_ROOT}/.env.secrets" ]; then
                log_info "Appending .env.secrets to worktree .env..."
                cat "${REPO_ROOT}/.env.secrets" >> "${worktree_path}/.env"
            fi

            # Start devcontainer in background
            log_info "Launching DevContainer..."
            (
                cd "$worktree_path"
                echo "STARTING" > .setup-status
                if devcontainer up \
                    --workspace-folder . \
                    --config .devcontainer/devcontainer.json \
                    --id-label "worktree.id=${worktree_id}" \
                    --id-label "worktree.agent=${agent_type}" 2>&1 | tee .devcontainer-startup.log; then
                    echo "READY" > .setup-status
                else
                    echo "FAILED" > .setup-status
                    exit 1
                fi
            ) &
            local bg_pid=$!

            # Wait for container to appear (up to 60s)
            log_info "Waiting for container to start..."
            local container_id=""
            container_id=$(wait_for_container "$worktree_id" "$worktree_path" 60) || {
                log_error "Container failed to start within 60 seconds"
                log_error "Check logs at: ${worktree_path}/.devcontainer-startup.log"
                wait $bg_pid || true
                exit 1
            }

            log_success "Container started: $container_id"

            # Update state file with container ID
            local container_name_actual
            container_name_actual=$(docker inspect --format '{{.Name}}' "$container_id" 2>/dev/null | sed 's/^\///' || echo "")

            # Use portable sed syntax for macOS and Linux
            if [[ -n "$container_id" ]]; then
                sed -i.bak "s|^container_id: \".*\"|container_id: \"${container_id}\"|" "$state_file"
            fi
            if [[ -n "$container_name_actual" ]]; then
                sed -i.bak "s|^container_name: \".*\"|container_name: \"${container_name_actual}\"|" "$state_file"
            fi
            rm -f "${state_file}.bak"

            # Wait for container to be healthy
            log_info "Waiting for container to be ready (up to 5 minutes)..."
            if check_container_health "$container_id" 300; then
                log_success "Container is healthy!"
            else
                local exit_code=$?
                if [[ $exit_code -eq 2 ]]; then
                    log_error "Container health check timed out after 5 minutes"
                    log_error "Check logs with: docker logs ${container_id}"
                else
                    log_error "Container is not healthy"
                    log_error "Check logs with: docker logs ${container_id}"
                fi
                exit 1
            fi

            # Wait for background process to complete
            wait $bg_pid || {
                log_error "DevContainer startup process failed"
                exit 1
            }

            log_success "DevContainer fully initialized"
            log_info "Frontend: $(get_frontend_endpoint "$endpoint_name")"
            log_info "Backend API: $(get_backend_api_endpoint "$endpoint_name")"
            log_info "Backend (direct): $(get_backend_direct_endpoint "$endpoint_name")"
        fi
    fi

    # Clear error trap on success
    trap - ERR

    # Summary
    echo ""
    log_success "=== Worktree Ready ==="
    echo ""
    echo "To work in this worktree:"
    echo "  cd $worktree_path"
    echo ""
    echo "To open in VS Code:"
    echo "  code $worktree_path"
    echo ""
    echo "To open in VS Code DevContainer:"
    echo "  code --folder-uri vscode-remote://dev-container+$(echo -n "$worktree_path" | xxd -p | tr -d '\n')/workspace"
    echo ""
    echo "Context file:"
    echo "  $wt_context"
    echo ""
    echo "Agent prompt:"
    echo "  prompts/agents/${agent_type}.md"
    echo ""

    # === HANDOFF BLOCK ===
    # Generate handoff information for Claude session continuation
    print_handoff_block "$worktree_path" "$branch_name" "$agent_type" "$wt_context"
}

main "$@"
