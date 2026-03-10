#!/usr/bin/env bash
# tools/orchestrate/workflow.sh
# Workflow Execution Engine
#
# Manages sequential and parallel workflow execution across worktrees.
#
# Usage:
#   ./tools/orchestrate/workflow.sh start <workflow-file>
#   ./tools/orchestrate/workflow.sh status <workflow-id>
#   ./tools/orchestrate/workflow.sh step <workflow-id>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKFLOW_DIR="${REPO_ROOT}/.worktree-state/workflows"

# Source utilities
# shellcheck source=./context.sh
source "${SCRIPT_DIR}/context.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[WORKFLOW]${NC} $*"; }
log_success() { echo -e "${GREEN}[WORKFLOW]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WORKFLOW]${NC} $*"; }
log_error() { echo -e "${RED}[WORKFLOW]${NC} $*" >&2; }

show_usage() {
    cat << EOF
Usage: $(basename "$0") <command> [options]

Commands:
  create <task-id> <workflow-type>  Create a new workflow
  start <workflow-id>               Start workflow execution
  status <workflow-id>              Show workflow status
  step <workflow-id>                Execute next step
  complete <workflow-id> <step>     Mark step as complete
  cancel <workflow-id>              Cancel workflow

Workflow Types:
  sequential    Steps run one after another
  parallel      Steps run simultaneously

Examples:
  $(basename "$0") create GH-123 sequential
  $(basename "$0") start wf-20240115-abc123
  $(basename "$0") step wf-20240115-abc123
EOF
}

# Generate workflow ID
generate_workflow_id() {
    local hash
    hash=$(date +%s | md5sum | cut -c1-6)
    echo "wf-$(date +%Y%m%d)-${hash}"
}

# Create workflow state file
create_workflow() {
    local task_id="$1"
    local workflow_type="${2:-sequential}"
    local pipeline="${3:-}"

    mkdir -p "${WORKFLOW_DIR}"

    local workflow_id
    workflow_id=$(generate_workflow_id)
    local workflow_file="${WORKFLOW_DIR}/${workflow_id}.yaml"

    cat > "$workflow_file" << EOF
# Workflow State
# Generated: $(date -Iseconds)

workflow_id: "${workflow_id}"
task_id: "${task_id}"
type: "${workflow_type}"
status: "created"
created_at: "$(date -Iseconds)"
started_at: ""
completed_at: ""

# Workflow Steps
current_step: 0
total_steps: 0
steps: []

# Error handling
retry_count: 0
max_retries: 3
last_error: ""
EOF

    echo "$workflow_id"
}

# Add step to workflow
add_step() {
    local workflow_id="$1"
    local agent="$2"
    local description="${3:-}"

    local workflow_file="${WORKFLOW_DIR}/${workflow_id}.yaml"

    if [[ ! -f "$workflow_file" ]]; then
        log_error "Workflow not found: $workflow_id"
        return 1
    fi

    # Get current total steps
    local total_steps
    total_steps=$(grep "^total_steps:" "$workflow_file" | awk '{print $2}')
    local new_step=$((total_steps + 1))

    # Update total_steps
    sed -i "s/^total_steps:.*/total_steps: ${new_step}/" "$workflow_file"

    # Append step
    cat >> "$workflow_file" << EOF

# Step ${new_step}
step_${new_step}:
  agent: "${agent}"
  description: "${description}"
  status: "pending"
  worktree: ""
  started_at: ""
  completed_at: ""
EOF

    log_info "Added step ${new_step}: ${agent}"
}

# Start workflow execution
start_workflow() {
    local workflow_id="$1"
    local workflow_file="${WORKFLOW_DIR}/${workflow_id}.yaml"

    if [[ ! -f "$workflow_file" ]]; then
        log_error "Workflow not found: $workflow_id"
        return 1
    fi

    # Update status
    sed -i "s/^status:.*/status: \"running\"/" "$workflow_file"
    sed -i "s/^started_at:.*/started_at: \"$(date -Iseconds)\"/" "$workflow_file"
    sed -i "s/^current_step:.*/current_step: 1/" "$workflow_file"

    log_success "Workflow started: $workflow_id"

    # Execute first step
    execute_step "$workflow_id" 1
}

# Execute a workflow step
execute_step() {
    local workflow_id="$1"
    local step_num="$2"
    local workflow_file="${WORKFLOW_DIR}/${workflow_id}.yaml"

    if [[ ! -f "$workflow_file" ]]; then
        log_error "Workflow not found: $workflow_id"
        return 1
    fi

    # Get step info
    local agent
    agent=$(sed -n "/^step_${step_num}:/,/^step_/p" "$workflow_file" | grep "agent:" | head -1 | awk '{print $2}' | tr -d '"')

    local task_id
    task_id=$(grep "^task_id:" "$workflow_file" | awk '{print $2}' | tr -d '"')

    if [[ -z "$agent" ]]; then
        log_error "Step ${step_num} not found"
        return 1
    fi

    log_info "Executing step ${step_num}: ${agent}"

    # Generate branch name
    local branch="feat/${task_id}-step${step_num}-${agent}"

    # Spawn worktree
    log_info "Spawning worktree for ${agent}..."
    local worktree_path
    worktree_path=$("${SCRIPT_DIR}/../worktree/spawn.sh" "$agent" "$branch" --no-devcontainer 2>&1 | grep "Worktree created at" | awk '{print $NF}' || true)

    if [[ -z "$worktree_path" ]]; then
        local repo_name
        repo_name=$(basename "${REPO_ROOT}")
        local safe_branch
        safe_branch=$(echo "$branch" | sed 's/\//-/g')
        worktree_path="$(dirname "${REPO_ROOT}")/${repo_name}-${safe_branch}"
    fi

    # Update step status
    sed -i "/^step_${step_num}:/,/^step_/{s/status: \"pending\"/status: \"running\"/}" "$workflow_file"
    sed -i "/^step_${step_num}:/,/^step_/{s/worktree: \"\"/worktree: \"${worktree_path//\//\\/}\"/}" "$workflow_file"
    sed -i "/^step_${step_num}:/,/^step_/{s/started_at: \"\"/started_at: \"$(date -Iseconds)\"/}" "$workflow_file"

    log_success "Step ${step_num} started: ${agent} at ${worktree_path}"

    echo ""
    echo "Agent worktree ready at: ${worktree_path}"
    echo ""
    echo "When the agent completes, mark the step as done:"
    echo "  ./tools/orchestrate/workflow.sh complete ${workflow_id} ${step_num}"
}

# Mark step as complete
complete_step() {
    local workflow_id="$1"
    local step_num="$2"
    local workflow_file="${WORKFLOW_DIR}/${workflow_id}.yaml"

    if [[ ! -f "$workflow_file" ]]; then
        log_error "Workflow not found: $workflow_id"
        return 1
    fi

    # Update step status
    sed -i "/^step_${step_num}:/,/^step_/{s/status: \"running\"/status: \"completed\"/}" "$workflow_file"
    sed -i "/^step_${step_num}:/,/^step_/{s/completed_at: \"\"/completed_at: \"$(date -Iseconds)\"/}" "$workflow_file"

    log_success "Step ${step_num} completed"

    # Check if there's a next step
    local total_steps
    total_steps=$(grep "^total_steps:" "$workflow_file" | awk '{print $2}')
    local next_step=$((step_num + 1))

    if [[ $next_step -le $total_steps ]]; then
        sed -i "s/^current_step:.*/current_step: ${next_step}/" "$workflow_file"
        log_info "Next step: ${next_step} of ${total_steps}"

        # Check workflow type
        local workflow_type
        workflow_type=$(grep "^type:" "$workflow_file" | awk '{print $2}' | tr -d '"')

        if [[ "$workflow_type" == "sequential" ]]; then
            echo ""
            echo "To execute the next step:"
            echo "  ./tools/orchestrate/workflow.sh step ${workflow_id}"
        fi
    else
        # Workflow complete
        sed -i "s/^status:.*/status: \"completed\"/" "$workflow_file"
        sed -i "s/^completed_at:.*/completed_at: \"$(date -Iseconds)\"/" "$workflow_file"
        log_success "Workflow completed: ${workflow_id}"
    fi
}

# Execute next step in workflow
next_step() {
    local workflow_id="$1"
    local workflow_file="${WORKFLOW_DIR}/${workflow_id}.yaml"

    if [[ ! -f "$workflow_file" ]]; then
        log_error "Workflow not found: $workflow_id"
        return 1
    fi

    local current_step
    current_step=$(grep "^current_step:" "$workflow_file" | awk '{print $2}')

    execute_step "$workflow_id" "$current_step"
}

# Show workflow status
show_status() {
    local workflow_id="$1"
    local workflow_file="${WORKFLOW_DIR}/${workflow_id}.yaml"

    if [[ ! -f "$workflow_file" ]]; then
        log_error "Workflow not found: $workflow_id"
        return 1
    fi

    echo ""
    echo -e "${CYAN}=== Workflow Status ===${NC}"
    echo ""

    local status
    status=$(grep "^status:" "$workflow_file" | awk '{print $2}' | tr -d '"')
    local task_id
    task_id=$(grep "^task_id:" "$workflow_file" | awk '{print $2}' | tr -d '"')
    local current_step
    current_step=$(grep "^current_step:" "$workflow_file" | awk '{print $2}')
    local total_steps
    total_steps=$(grep "^total_steps:" "$workflow_file" | awk '{print $2}')

    # Status color
    local status_color
    case "$status" in
        running) status_color="${GREEN}" ;;
        completed) status_color="${CYAN}" ;;
        failed) status_color="${RED}" ;;
        *) status_color="${YELLOW}" ;;
    esac

    echo "Workflow ID: $workflow_id"
    echo "Task ID:     $task_id"
    echo -e "Status:      ${status_color}${status}${NC}"
    echo "Progress:    ${current_step}/${total_steps} steps"
    echo ""

    # Show steps
    echo "Steps:"
    for i in $(seq 1 "$total_steps"); do
        local step_status
        step_status=$(sed -n "/^step_${i}:/,/^step_/p" "$workflow_file" | grep "status:" | head -1 | awk '{print $2}' | tr -d '"')
        local step_agent
        step_agent=$(sed -n "/^step_${i}:/,/^step_/p" "$workflow_file" | grep "agent:" | head -1 | awk '{print $2}' | tr -d '"')

        local step_icon
        case "$step_status" in
            completed) step_icon="${GREEN}✓${NC}" ;;
            running) step_icon="${YELLOW}▶${NC}" ;;
            pending) step_icon="○" ;;
            failed) step_icon="${RED}✗${NC}" ;;
            *) step_icon="?" ;;
        esac

        echo -e "  ${step_icon} Step ${i}: ${step_agent}"
    done
    echo ""
}

# Cancel workflow
cancel_workflow() {
    local workflow_id="$1"
    local workflow_file="${WORKFLOW_DIR}/${workflow_id}.yaml"

    if [[ ! -f "$workflow_file" ]]; then
        log_error "Workflow not found: $workflow_id"
        return 1
    fi

    sed -i "s/^status:.*/status: \"cancelled\"/" "$workflow_file"
    log_warn "Workflow cancelled: $workflow_id"
}

# List all workflows
list_workflows() {
    echo -e "${CYAN}=== Workflows ===${NC}"
    echo ""

    if [[ ! -d "${WORKFLOW_DIR}" ]]; then
        echo "No workflows found"
        return
    fi

    for wf_file in "${WORKFLOW_DIR}"/*.yaml 2>/dev/null; do
        if [[ -f "$wf_file" ]]; then
            local wf_id
            wf_id=$(basename "$wf_file" .yaml)
            local status
            status=$(grep "^status:" "$wf_file" | awk '{print $2}' | tr -d '"')
            local task_id
            task_id=$(grep "^task_id:" "$wf_file" | awk '{print $2}' | tr -d '"')

            local status_color
            case "$status" in
                running) status_color="${GREEN}" ;;
                completed) status_color="${CYAN}" ;;
                *) status_color="${YELLOW}" ;;
            esac

            echo -e "${YELLOW}${wf_id}${NC} - ${task_id} [${status_color}${status}${NC}]"
        fi
    done
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
        create)
            if [[ $# -lt 1 ]]; then
                log_error "create requires <task-id>"
                exit 1
            fi
            create_workflow "$@"
            ;;
        add-step)
            if [[ $# -lt 2 ]]; then
                log_error "add-step requires <workflow-id> <agent>"
                exit 1
            fi
            add_step "$@"
            ;;
        start)
            if [[ $# -lt 1 ]]; then
                log_error "start requires <workflow-id>"
                exit 1
            fi
            start_workflow "$1"
            ;;
        status)
            if [[ $# -lt 1 ]]; then
                log_error "status requires <workflow-id>"
                exit 1
            fi
            show_status "$1"
            ;;
        step)
            if [[ $# -lt 1 ]]; then
                log_error "step requires <workflow-id>"
                exit 1
            fi
            next_step "$1"
            ;;
        complete)
            if [[ $# -lt 2 ]]; then
                log_error "complete requires <workflow-id> <step>"
                exit 1
            fi
            complete_step "$1" "$2"
            ;;
        cancel)
            if [[ $# -lt 1 ]]; then
                log_error "cancel requires <workflow-id>"
                exit 1
            fi
            cancel_workflow "$1"
            ;;
        list)
            list_workflows
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
