#!/usr/bin/env bash
# tools/worktree/list.sh
# Worktree 一覧を表示する
#
# Usage:
#   ./tools/worktree/list.sh [--json]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WORKTREES_DIR="${REPO_ROOT}/worktrees"
STATE_DIR="${REPO_ROOT}/.worktree-state"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

JSON_OUTPUT=false
if [[ "${1:-}" == "--json" ]]; then
    JSON_OUTPUT=true
fi

print_header() {
    if [[ "$JSON_OUTPUT" == false ]]; then
        echo -e "${BLUE}=== Git Worktrees ===${NC}"
        echo ""
    fi
}

get_worktree_info() {
    local path="$1"
    local branch commit is_main is_internal state_info

    branch=$(git -C "$path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
    commit=$(git -C "$path" rev-parse --short HEAD 2>/dev/null || echo "unknown")

    if [[ "$path" == "$REPO_ROOT" ]]; then
        is_main="true"
    else
        is_main="false"
    fi

    if [[ "$path" == "${WORKTREES_DIR}/"* ]]; then
        is_internal="true"
    else
        is_internal="false"
    fi

    # Check state file
    local safe_branch
    safe_branch=$(echo "$branch" | sed 's/\//-/g')
    local state_file="${STATE_DIR}/${safe_branch}.yaml"
    if [[ -f "$state_file" ]]; then
        local agent status
        agent=$(grep "^agent:" "$state_file" 2>/dev/null | awk '{print $2}' || echo "")
        status=$(grep "^status:" "$state_file" 2>/dev/null | awk '{print $2}' | tr -d '"' || echo "")
        state_info="${agent}:${status}"
    else
        state_file="${STATE_DIR}/$(basename "$path").yaml"
        if [[ -f "$state_file" ]]; then
            local agent status
            agent=$(grep "^agent:" "$state_file" 2>/dev/null | awk '{print $2}' || echo "")
            status=$(grep "^status:" "$state_file" 2>/dev/null | awk '{print $2}' | tr -d '"' || echo "")
            state_info="${agent}:${status}"
        else
            state_info=""
        fi
    fi

    echo "${path}|${branch}|${commit}|${is_main}|${is_internal}|${state_info}"
}

print_worktree() {
    local info="$1"
    local path branch commit is_main is_internal state_info

    IFS='|' read -r path branch commit is_main is_internal state_info <<< "$info"

    if [[ "$JSON_OUTPUT" == true ]]; then
        echo "  {"
        echo "    \"path\": \"$path\","
        echo "    \"branch\": \"$branch\","
        echo "    \"commit\": \"$commit\","
        echo "    \"is_main\": $is_main,"
        echo "    \"is_internal\": $is_internal,"
        if [[ -n "$state_info" ]]; then
            local agent status
            IFS=':' read -r agent status <<< "$state_info"
            echo "    \"agent\": \"$agent\","
            echo "    \"status\": \"$status\""
        else
            echo "    \"agent\": null,"
            echo "    \"status\": null"
        fi
        echo "  }"
    else
        local location_badge=""
        if [[ "$is_main" == "true" ]]; then
            location_badge="${GREEN}[main]${NC}"
        elif [[ "$is_internal" == "true" ]]; then
            location_badge="${CYAN}[internal]${NC}"
        else
            location_badge="${YELLOW}[external]${NC}"
        fi

        echo -e "${location_badge} ${branch} ${DIM}(${commit})${NC}"
        echo -e "    ${DIM}${path}${NC}"

        if [[ -n "$state_info" ]]; then
            local agent status
            IFS=':' read -r agent status <<< "$state_info"
            echo -e "    Agent: ${agent}, Status: ${status}"
        fi
        echo ""
    fi
}

main() {
    print_header

    local worktrees
    worktrees=$(git -C "${REPO_ROOT}" worktree list --porcelain | grep "^worktree " | sed 's/^worktree //')

    if [[ "$JSON_OUTPUT" == true ]]; then
        echo "{"
        echo "  \"worktrees_dir\": \"${WORKTREES_DIR}\","
        echo "  \"worktrees\": ["
    fi

    local first=true
    echo "$worktrees" | while read -r wt_path; do
        if [[ -z "$wt_path" ]]; then
            continue
        fi

        if [[ "$JSON_OUTPUT" == true && "$first" == false ]]; then
            echo "  ,"
        fi
        first=false

        local info
        info=$(get_worktree_info "$wt_path")
        print_worktree "$info"
    done

    if [[ "$JSON_OUTPUT" == true ]]; then
        echo "  ]"
        echo "}"
    fi
}

main "$@"
