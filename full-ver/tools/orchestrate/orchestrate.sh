#!/usr/bin/env bash
# tools/orchestrate/orchestrate.sh
# Agent Orchestrator - Main Entry Point
#
# Routes user requests to appropriate agents, manages worktrees,
# and coordinates parallel execution in DevContainers.
#
# Usage:
#   ./tools/orchestrate start "<task description>"
#   ./tools/orchestrate status
#   ./tools/orchestrate spawn <agent> <branch>
#   ./tools/orchestrate list
#   ./tools/orchestrate cleanup [--merged]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKTREE_DIR="${SCRIPT_DIR}/../worktree"

# Source utilities
# shellcheck source=./context.sh
source "${SCRIPT_DIR}/context.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[ORCH]${NC} $*"; }
log_success() { echo -e "${GREEN}[ORCH]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[ORCH]${NC} $*"; }
log_error() { echo -e "${RED}[ORCH]${NC} $*" >&2; }

show_banner() {
    echo -e "${MAGENTA}"
    cat << 'EOF'
   ___           _               _             _
  / _ \ _ __ ___| |__   ___  ___| |_ _ __ __ _| |_ ___  _ __
 | | | | '__/ __| '_ \ / _ \/ __| __| '__/ _` | __/ _ \| '__|
 | |_| | | | (__| | | |  __/\__ \ |_| | | (_| | || (_) | |
  \___/|_|  \___|_| |_|\___||___/\__|_|  \__,_|\__\___/|_|

EOF
    echo -e "${NC}"
}

show_usage() {
    cat << EOF
${CYAN}Agent Orchestrator${NC}
Routes tasks to AI agents running in isolated worktree environments.

${YELLOW}Usage:${NC}
  $(basename "$0") <command> [options]

${YELLOW}Commands:${NC}
  start "<task>"      Start a new task with automatic agent routing
  spawn <agent> <branch>  Manually spawn a specific agent in a worktree
  status              Show status of all active worktrees
  list                List all worktrees
  cleanup [options]   Clean up worktrees
  route "<request>"   Show routing decision without executing

${YELLOW}Start Options:${NC}
  --agent <name>      Force specific agent (skip routing)
  --branch <name>     Specify branch name
  --task-id <id>      Specify existing task/spec ID for DocDD lookup
  --no-devcontainer   Don't start DevContainer
  --no-smart          Disable smart DocDD-aware routing
  --dry-run           Show what would happen without executing

${YELLOW}Cleanup Options:${NC}
  --merged            Remove worktrees with merged branches
  --all               Remove all worktrees
  --prune             Prune orphaned state files

${YELLOW}Agents:${NC}
  pdm         Product Manager - specs, requirements
  architect   Architect - design, ADR, plans
  designer    Product Designer - UX, UI requirements
  implementer Implementer - code, tests
  qa          QA Engineer - test plans, verification
  reviewer    Code Reviewer - review, approval

${YELLOW}Examples:${NC}
  $(basename "$0") start "認証機能を追加して"
  $(basename "$0") start --agent implementer "fix login bug"
  $(basename "$0") spawn implementer feat/GH-123-auth
  $(basename "$0") status
  $(basename "$0") cleanup --merged

${YELLOW}Related:${NC}
  Spec: .specify/specs/agent-orchestration/spec.md
  Routing: tools/orchestrate/routing-rules.yaml
EOF
}

# Generate task ID
generate_task_id() {
    local request="$1"

    # Try to extract GH-xxx from request
    local gh_id
    gh_id=$(echo "$request" | grep -oE 'GH-[0-9]+' | head -1 || true)

    if [[ -n "$gh_id" ]]; then
        echo "$gh_id"
    else
        # Generate from timestamp + hash
        local hash
        hash=$(echo "$request" | md5sum | cut -c1-6)
        echo "task-$(date +%Y%m%d)-${hash}"
    fi
}

# Generate branch name
generate_branch_name() {
    local task_id="$1"
    local agent="$2"
    local request="$3"

    # Create slug from request (first 30 chars, alphanumeric + dash)
    local slug
    slug=$(echo "$request" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | cut -c1-30 | sed 's/-$//')

    echo "feat/${task_id}-${slug}"
}

# Start a new task
cmd_start() {
    local request=""
    local force_agent=""
    local force_branch=""
    local force_task_id=""
    local no_devcontainer=false
    local dry_run=false
    local no_smart=false

    # Parse options
    while [[ $# -gt 0 ]]; do
        case $1 in
            --agent)
                force_agent="$2"
                shift 2
                ;;
            --branch)
                force_branch="$2"
                shift 2
                ;;
            --task-id)
                force_task_id="$2"
                shift 2
                ;;
            --no-devcontainer)
                no_devcontainer=true
                shift
                ;;
            --no-smart)
                no_smart=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            -*)
                log_error "Unknown option: $1"
                return 1
                ;;
            *)
                request="$1"
                shift
                ;;
        esac
    done

    if [[ -z "$request" ]]; then
        log_error "No task description provided"
        echo "Usage: $(basename "$0") start \"<task description>\""
        return 1
    fi

    show_banner

    log_info "Starting new task..."
    log_info "Request: $request"
    echo ""

    # Route the request
    log_info "Analyzing request..."
    
    local router_args=("--json")
    
    # Use smart routing by default
    if [[ "$no_smart" != true ]]; then
        router_args+=("--smart")
    fi
    
    # Pass task ID if provided
    if [[ -n "$force_task_id" ]]; then
        router_args+=("--task-id" "$force_task_id")
    fi
    
    router_args+=("$request")
    
    local routing
    routing=$("${SCRIPT_DIR}/router.sh" "${router_args[@]}")

    local agent
    local workflow
    local rule_id
    local smart_routing

    if [[ -n "$force_agent" ]]; then
        agent="$force_agent"
        workflow="direct"
        rule_id="manual"
        smart_routing=false
        log_info "Using forced agent: $agent"
    else
        agent=$(echo "$routing" | jq -r '.agent')
        workflow=$(echo "$routing" | jq -r '.workflow')
        rule_id=$(echo "$routing" | jq -r '.rule_id')
        smart_routing=$(echo "$routing" | jq -r '.smart_routing // false')
    fi

    echo -e "${CYAN}Routing Decision:${NC}"
    echo "  Rule: $rule_id"
    echo "  Agent: $agent"
    echo "  Workflow: $workflow"
    if [[ "$smart_routing" == true ]]; then
        echo -e "  Mode: ${GREEN}Smart (DocDD-aware)${NC}"
    fi
    echo ""
    
    # Show DocDD context if smart routing
    if [[ "$smart_routing" == true ]]; then
        local steps_done
        local steps_needed
        steps_done=$(echo "$routing" | jq -r '.docdd_context.steps_done | join(", ") // "none"')
        steps_needed=$(echo "$routing" | jq -r '.docdd_context.steps_needed | join(", ") // "none"')
        
        echo -e "${CYAN}DocDD Context:${NC}"
        echo -e "  Done: ${GREEN}$steps_done${NC}"
        echo -e "  Needed: ${YELLOW}$steps_needed${NC}"
        echo ""
    fi

    # Generate task ID and branch
    local task_id
    task_id=$(generate_task_id "$request")

    local branch
    if [[ -n "$force_branch" ]]; then
        branch="$force_branch"
    else
        branch=$(generate_branch_name "$task_id" "$agent" "$request")
    fi

    log_info "Task ID: $task_id"
    log_info "Branch: $branch"
    echo ""

    if [[ "$dry_run" == true ]]; then
        log_warn "Dry run mode - stopping here"
        echo ""
        echo "Would execute:"
        echo "  ./tools/worktree/spawn.sh $agent $branch"
        return 0
    fi

    # Spawn worktree
    log_info "Spawning worktree for $agent agent..."

    local spawn_args=("$agent" "$branch")
    if [[ "$no_devcontainer" == true ]]; then
        spawn_args+=("--no-devcontainer")
    fi

    "${WORKTREE_DIR}/spawn.sh" "${spawn_args[@]}"

    # Get worktree path
    local repo_name
    repo_name=$(basename "${REPO_ROOT}")
    local safe_branch
    safe_branch=$(echo "$branch" | sed 's/\//-/g')
    local worktree_path="$(dirname "${REPO_ROOT}")/${repo_name}-${safe_branch}"

    # Update context with task details
    local context_file="${worktree_path}/.worktree-context.yaml"
    if [[ -f "$context_file" ]]; then
        log_info "Updating context with task details..."

        # Update task info
        cat >> "$context_file" << EOF

# Task Details (updated by orchestrate start)
task:
  title: "$(echo "$request" | head -c 80)"
  description: "$(echo "$request")"
  original_request: "$(echo "$request")"
  scope: []

# Routing Info
routing:
  rule_id: "${rule_id}"
  routed_at: "$(date -Iseconds)"
EOF
    fi

    echo ""
    log_success "=== Task Started ==="
    echo ""
    echo "The ${agent} agent is ready to work in:"
    echo "  ${worktree_path}"
    echo ""
    echo "Next steps:"
    echo "  1. Open the worktree in VS Code:"
    echo "     code ${worktree_path}"
    echo ""
    echo "  2. Start the AI agent (Claude Code or Copilot) with:"
    echo "     - Context: .worktree-context.yaml"
    echo "     - Prompt: prompts/agents/${agent}.md"
    echo ""
    echo "  3. Monitor progress:"
    echo "     ./tools/orchestrate status"
    echo ""
}

# Spawn a specific agent
cmd_spawn() {
    local agent="$1"
    local branch="$2"
    shift 2

    "${WORKTREE_DIR}/spawn.sh" "$agent" "$branch" "$@"
}

# Show status
cmd_status() {
    show_banner
    "${WORKTREE_DIR}/status.sh" "$@"
}

# List worktrees
cmd_list() {
    "${WORKTREE_DIR}/status.sh" --brief
}

# Cleanup
cmd_cleanup() {
    "${WORKTREE_DIR}/cleanup.sh" "$@"
}

# Route (show routing decision only)
cmd_route() {
    "${SCRIPT_DIR}/router.sh" "$@"
}

# Main
main() {
    if [[ $# -eq 0 ]]; then
        show_usage
        exit 0
    fi

    local command="$1"
    shift

    case "$command" in
        start)
            cmd_start "$@"
            ;;
        spawn)
            if [[ $# -lt 2 ]]; then
                log_error "spawn requires <agent> and <branch>"
                echo "Usage: $(basename "$0") spawn <agent> <branch>"
                exit 1
            fi
            cmd_spawn "$@"
            ;;
        status)
            cmd_status "$@"
            ;;
        list)
            cmd_list "$@"
            ;;
        cleanup)
            cmd_cleanup "$@"
            ;;
        route)
            cmd_route "$@"
            ;;
        -h|--help|help)
            show_usage
            ;;
        *)
            log_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
