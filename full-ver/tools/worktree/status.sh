#!/usr/bin/env bash
# tools/worktree/status.sh
# Worktree の一覧と状態を表示する
#
# Usage:
#   ./tools/worktree/status.sh [options]
#
# Options:
#   --json    JSON形式で出力
#   --brief   簡潔な表示

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STATE_DIR="${REPO_ROOT}/.worktree-state"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }

show_usage() {
    cat << EOF
Usage: $(basename "$0") [options]

Options:
  --json      Output in JSON format
  --brief     Brief output (path and branch only)
  -h, --help  Show this help message
EOF
}

# Check if a DevContainer is running for a worktree
check_devcontainer_status() {
    local worktree_path="$1"

    if ! command -v docker &> /dev/null; then
        echo "unknown"
        return
    fi

    # Look for container with matching label or volume
    local container_id
    container_id=$(docker ps --filter "label=devcontainer.local_folder=${worktree_path}" --format "{{.ID}}" 2>/dev/null | head -1)

    if [[ -n "$container_id" ]]; then
        echo "running"
    else
        echo "stopped"
    fi
}

# Get worktree status from state file
get_state_info() {
    local worktree_path="$1"
    local state_file="${STATE_DIR}/$(basename "${worktree_path}").yaml"

    if [[ -f "$state_file" ]]; then
        cat "$state_file"
    fi
}

# Parse YAML value (simple parser)
parse_yaml_value() {
    local file="$1"
    local key="$2"
    grep -E "^${key}:" "$file" 2>/dev/null | sed 's/^[^:]*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//'
}

# Output in JSON format
output_json() {
    echo "{"
    echo '  "worktrees": ['

    local first=true
    while IFS= read -r line; do
        local worktree_path branch commit
        worktree_path=$(echo "$line" | awk '{print $1}')
        commit=$(echo "$line" | awk '{print $2}')
        branch=$(echo "$line" | awk '{print $3}' | sed 's/^\[//' | sed 's/\]$//')

        local agent="unknown"
        local port_base="0"
        local status="unknown"
        local devcontainer_status

        devcontainer_status=$(check_devcontainer_status "$worktree_path")

        local state_file="${STATE_DIR}/$(basename "${worktree_path}").yaml"
        if [[ -f "$state_file" ]]; then
            agent=$(parse_yaml_value "$state_file" "agent")
            port_base=$(parse_yaml_value "$state_file" "port_base")
            status=$(parse_yaml_value "$state_file" "status")
        fi

        if [[ "$first" == true ]]; then
            first=false
        else
            echo ","
        fi

        cat << EOF
    {
      "path": "${worktree_path}",
      "branch": "${branch}",
      "commit": "${commit}",
      "agent": "${agent}",
      "port_base": ${port_base},
      "status": "${status}",
      "devcontainer": "${devcontainer_status}"
    }
EOF
    done < <(git -C "${REPO_ROOT}" worktree list 2>/dev/null | tail -n +1)

    echo ""
    echo "  ]"
    echo "}"
}

# Output brief format
output_brief() {
    git -C "${REPO_ROOT}" worktree list 2>/dev/null | while IFS= read -r line; do
        local worktree_path branch
        worktree_path=$(echo "$line" | awk '{print $1}')
        branch=$(echo "$line" | awk '{print $3}' | sed 's/^\[//' | sed 's/\]$//')
        echo "${worktree_path} ${branch}"
    done
}

# Output detailed format
output_detailed() {
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                       Git Worktrees Status                          ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    local count=0
    local main_worktree=""

    while IFS= read -r line; do
        local worktree_path commit branch
        worktree_path=$(echo "$line" | awk '{print $1}')
        commit=$(echo "$line" | awk '{print $2}')
        branch=$(echo "$line" | awk '{print $3}' | sed 's/^\[//' | sed 's/\]$//')

        count=$((count + 1))

        # Main worktree detection
        if [[ "$worktree_path" == "${REPO_ROOT}" ]]; then
            main_worktree="$worktree_path"
            echo -e "${GREEN}[MAIN]${NC} $worktree_path"
            echo -e "       Branch: ${YELLOW}${branch}${NC}"
            echo -e "       Commit: ${commit:0:7}"
            echo ""
            continue
        fi

        # Get state info
        local agent="unknown"
        local port_base="0"
        local status="unknown"
        local created_at=""

        local state_file="${STATE_DIR}/$(basename "${worktree_path}").yaml"
        if [[ -f "$state_file" ]]; then
            agent=$(parse_yaml_value "$state_file" "agent")
            port_base=$(parse_yaml_value "$state_file" "port_base")
            status=$(parse_yaml_value "$state_file" "status")
            created_at=$(parse_yaml_value "$state_file" "created_at")
        fi

        # Check DevContainer status
        local devcontainer_status
        devcontainer_status=$(check_devcontainer_status "$worktree_path")

        # Status color
        local status_color
        case "$devcontainer_status" in
            running) status_color="${GREEN}" ;;
            stopped) status_color="${YELLOW}" ;;
            *) status_color="${RED}" ;;
        esac

        echo -e "${BLUE}[WORKTREE]${NC} $worktree_path"
        echo -e "       Branch:      ${YELLOW}${branch}${NC}"
        echo -e "       Commit:      ${commit:0:7}"
        echo -e "       Agent:       ${CYAN}${agent}${NC}"
        echo -e "       DevContainer: ${status_color}${devcontainer_status}${NC}"
        echo -e "       Ports:       ${port_base}-$((port_base + 99))"
        [[ -n "$created_at" ]] && echo -e "       Created:     ${created_at}"
        echo ""

    done < <(git -C "${REPO_ROOT}" worktree list 2>/dev/null)

    echo -e "${CYAN}────────────────────────────────────────────────────────────────────${NC}"
    echo -e "Total worktrees: ${count}"
    echo ""

    # Show state files without corresponding worktree (orphaned)
    if [[ -d "${STATE_DIR}" ]]; then
        local orphaned=0
        for state_file in "${STATE_DIR}"/*.yaml 2>/dev/null; do
            if [[ -f "$state_file" ]]; then
                local wt_path
                wt_path=$(parse_yaml_value "$state_file" "worktree_path")
                if [[ -n "$wt_path" && ! -d "$wt_path" ]]; then
                    if [[ $orphaned -eq 0 ]]; then
                        echo -e "${YELLOW}Orphaned state files (worktree deleted):${NC}"
                    fi
                    orphaned=$((orphaned + 1))
                    echo -e "  ${RED}✗${NC} $(basename "$state_file")"
                fi
            fi
        done
        if [[ $orphaned -gt 0 ]]; then
            echo ""
            echo "Run './tools/worktree/cleanup.sh --prune' to remove orphaned state files."
            echo ""
        fi
    fi
}

# Main
main() {
    local output_format="detailed"

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            --json)
                output_format="json"
                shift
                ;;
            --brief)
                output_format="brief"
                shift
                ;;
            *)
                log_info "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    case "$output_format" in
        json) output_json ;;
        brief) output_brief ;;
        detailed) output_detailed ;;
    esac
}

main "$@"
