#!/usr/bin/env bash
# tools/orchestrate/monitor.sh
# Workflow and Worktree Monitor
#
# Monitors active worktrees and their DevContainer status.
#
# Usage:
#   ./tools/orchestrate/monitor.sh [--watch]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STATE_DIR="${REPO_ROOT}/.worktree-state"
WORKFLOW_DIR="${STATE_DIR}/workflows"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

show_usage() {
    cat << EOF
Usage: $(basename "$0") [options]

Options:
  --watch       Continuously monitor (refresh every 5s)
  --json        Output in JSON format
  -h, --help    Show this help message
EOF
}

# Get container resource usage
get_container_stats() {
    local container_id="$1"

    if ! command -v docker &> /dev/null; then
        echo "N/A"
        return
    fi

    docker stats --no-stream --format "{{.CPUPerc}} / {{.MemUsage}}" "$container_id" 2>/dev/null || echo "N/A"
}

# Check if devcontainer is running for worktree
get_devcontainer_info() {
    local worktree_path="$1"

    if ! command -v docker &> /dev/null; then
        echo "docker-not-available"
        return
    fi

    # Find container by label or volume mount
    local container_id
    container_id=$(docker ps --filter "label=devcontainer.local_folder=${worktree_path}" --format "{{.ID}}" 2>/dev/null | head -1)

    if [[ -n "$container_id" ]]; then
        echo "$container_id"
    else
        echo "not-running"
    fi
}

# Display dashboard
show_dashboard() {
    clear

    echo -e "${CYAN}"
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════════════╗
║                        Agent Orchestrator Monitor                          ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "Last updated: ${timestamp}"
    echo ""

    # === Active Worktrees ===
    echo -e "${YELLOW}═══ Active Worktrees ═══${NC}"
    echo ""

    local worktree_count=0
    while IFS= read -r line; do
        local worktree_path commit branch
        worktree_path=$(echo "$line" | awk '{print $1}')
        commit=$(echo "$line" | awk '{print $2}')
        branch=$(echo "$line" | awk '{print $3}' | sed 's/^\[//' | sed 's/\]$//')

        # Skip main worktree
        if [[ "$worktree_path" == "${REPO_ROOT}" ]]; then
            continue
        fi

        worktree_count=$((worktree_count + 1))

        # Get agent info from state file
        local state_file="${STATE_DIR}/$(basename "${worktree_path}").yaml"
        local agent="unknown"
        local port_base="N/A"

        if [[ -f "$state_file" ]]; then
            agent=$(grep "^agent:" "$state_file" 2>/dev/null | awk '{print $2}' | tr -d '"' || echo "unknown")
            port_base=$(grep "^port_base:" "$state_file" 2>/dev/null | awk '{print $2}' || echo "N/A")
        fi

        # Get DevContainer status
        local container_info
        container_info=$(get_devcontainer_info "$worktree_path")

        local container_status
        local container_stats=""
        if [[ "$container_info" == "not-running" ]]; then
            container_status="${YELLOW}○ Stopped${NC}"
        elif [[ "$container_info" == "docker-not-available" ]]; then
            container_status="${RED}✗ Docker N/A${NC}"
        else
            container_status="${GREEN}● Running${NC}"
            container_stats=$(get_container_stats "$container_info")
        fi

        echo -e "${BLUE}┌─ ${branch}${NC}"
        echo -e "│  Agent:     ${CYAN}${agent}${NC}"
        echo -e "│  Path:      ${worktree_path}"
        echo -e "│  Container: ${container_status}"
        if [[ -n "$container_stats" && "$container_stats" != "N/A" ]]; then
            echo -e "│  Resources: ${container_stats}"
        fi
        echo -e "│  Ports:     ${port_base}"
        echo -e "${BLUE}└──────────────────────────────────────────────────${NC}"
        echo ""

    done < <(git -C "${REPO_ROOT}" worktree list 2>/dev/null)

    if [[ $worktree_count -eq 0 ]]; then
        echo "  No active worktrees"
        echo ""
    fi

    # === Active Workflows ===
    echo -e "${YELLOW}═══ Active Workflows ═══${NC}"
    echo ""

    local workflow_count=0
    if [[ -d "${WORKFLOW_DIR}" ]]; then
        for wf_file in "${WORKFLOW_DIR}"/*.yaml 2>/dev/null; do
            if [[ -f "$wf_file" ]]; then
                local status
                status=$(grep "^status:" "$wf_file" 2>/dev/null | awk '{print $2}' | tr -d '"')

                if [[ "$status" == "running" ]]; then
                    workflow_count=$((workflow_count + 1))

                    local wf_id
                    wf_id=$(basename "$wf_file" .yaml)
                    local task_id
                    task_id=$(grep "^task_id:" "$wf_file" | awk '{print $2}' | tr -d '"')
                    local current_step
                    current_step=$(grep "^current_step:" "$wf_file" | awk '{print $2}')
                    local total_steps
                    total_steps=$(grep "^total_steps:" "$wf_file" | awk '{print $2}')

                    echo -e "${GREEN}▶${NC} ${wf_id}"
                    echo "   Task: ${task_id}"
                    echo "   Progress: Step ${current_step} of ${total_steps}"
                    echo ""
                fi
            fi
        done
    fi

    if [[ $workflow_count -eq 0 ]]; then
        echo "  No active workflows"
        echo ""
    fi

    # === System Info ===
    echo -e "${YELLOW}═══ System ═══${NC}"
    echo ""

    # Disk usage
    local disk_usage
    disk_usage=$(df -h "${REPO_ROOT}" 2>/dev/null | tail -1 | awk '{print $5 " used of " $2}')
    echo "  Disk: ${disk_usage}"

    # Docker status
    if command -v docker &> /dev/null; then
        local container_count
        container_count=$(docker ps -q 2>/dev/null | wc -l)
        echo "  Docker containers: ${container_count} running"
    else
        echo -e "  Docker: ${RED}not available${NC}"
    fi

    echo ""
    echo -e "${CYAN}──────────────────────────────────────────────────────────────────────────${NC}"
    echo "Press Ctrl+C to exit"
}

# JSON output
show_json() {
    local worktrees="["
    local first=true

    while IFS= read -r line; do
        local worktree_path branch
        worktree_path=$(echo "$line" | awk '{print $1}')
        branch=$(echo "$line" | awk '{print $3}' | sed 's/^\[//' | sed 's/\]$//')

        if [[ "$worktree_path" == "${REPO_ROOT}" ]]; then
            continue
        fi

        local state_file="${STATE_DIR}/$(basename "${worktree_path}").yaml"
        local agent="unknown"
        if [[ -f "$state_file" ]]; then
            agent=$(grep "^agent:" "$state_file" 2>/dev/null | awk '{print $2}' | tr -d '"' || echo "unknown")
        fi

        local container_info
        container_info=$(get_devcontainer_info "$worktree_path")
        local container_running="false"
        if [[ "$container_info" != "not-running" && "$container_info" != "docker-not-available" ]]; then
            container_running="true"
        fi

        if [[ "$first" == true ]]; then
            first=false
        else
            worktrees="${worktrees},"
        fi

        worktrees="${worktrees}{\"path\":\"${worktree_path}\",\"branch\":\"${branch}\",\"agent\":\"${agent}\",\"container_running\":${container_running}}"

    done < <(git -C "${REPO_ROOT}" worktree list 2>/dev/null)

    worktrees="${worktrees}]"

    echo "{\"worktrees\":${worktrees},\"timestamp\":\"$(date -Iseconds)\"}"
}

# Main
main() {
    local watch_mode=false
    local json_mode=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --watch)
                watch_mode=true
                shift
                ;;
            --json)
                json_mode=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                echo "Unknown option: $1" >&2
                show_usage
                exit 1
                ;;
        esac
    done

    if [[ "$json_mode" == true ]]; then
        show_json
        exit 0
    fi

    if [[ "$watch_mode" == true ]]; then
        while true; do
            show_dashboard
            sleep 5
        done
    else
        show_dashboard
    fi
}

main "$@"
