#!/usr/bin/env bash
# tools/worktree/health.sh
# Check health status of all worktrees

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STATE_DIR="${REPO_ROOT}/.worktree-state"

# Source container health check library
source "${SCRIPT_DIR}/lib/container-health.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

check_worktree() {
    local worktree_path="$1"
    local state_file="${STATE_DIR}/$(basename "${worktree_path}").yaml"

    echo -e "${BLUE}Checking:${NC} $(basename "$worktree_path")"

    local issues=0

    # Check 1: Directory exists
    if [[ ! -d "$worktree_path" ]]; then
        echo -e "  ${RED}[FAIL]${NC} Directory missing"
        ((issues++))
    else
        echo -e "  ${GREEN}[OK]${NC} Directory exists"
    fi

    # Check 2: Git worktree tracked
    if ! git -C "${REPO_ROOT}" worktree list | grep -q "^${worktree_path} "; then
        echo -e "  ${YELLOW}[WARN]${NC} Not tracked by git"
        ((issues++))
    else
        echo -e "  ${GREEN}[OK]${NC} Git worktree tracked"
    fi

    # Check 3: State file exists
    if [[ ! -f "$state_file" ]]; then
        echo -e "  ${YELLOW}[WARN]${NC} No state file"
    else
        echo -e "  ${GREEN}[OK]${NC} State file exists"

        # Check 4: Container running
        local worktree_id
        worktree_id=$(grep "^worktree_id:" "$state_file" 2>/dev/null | awk '{print $2}' || echo "")
        local container_id=""

        if [[ -n "$worktree_id" ]]; then
            container_id=$(get_container_id_by_worktree "$worktree_id" "$worktree_path" 2>/dev/null || echo "")
        fi

        if [[ -z "$container_id" ]]; then
            echo -e "  ${RED}[FAIL]${NC} Container not running"
            echo -e "    ${YELLOW}Fix:${NC} cd ${worktree_path} && devcontainer up --workspace-folder ."
            ((issues++))
        else
            echo -e "  ${GREEN}[OK]${NC} Container running: $container_id"

            # Check 5: Container health
            if check_container_health "$container_id" 5; then
                echo -e "  ${GREEN}[OK]${NC} Container healthy"
            else
                echo -e "  ${YELLOW}[WARN]${NC} Container not healthy"
                echo -e "    ${YELLOW}Check:${NC} docker logs $container_id"
                ((issues++))
            fi
        fi
    fi

    echo ""
    return $issues
}

main() {
    echo "=== Worktree Health Check ==="
    echo ""

    local total_issues=0
    local worktree_count=0

    while IFS= read -r line; do
        local worktree_path
        worktree_path=$(echo "$line" | awk '{print $1}')

        # Skip main repo
        if [[ "$worktree_path" == "${REPO_ROOT}" ]]; then
            continue
        fi

        ((worktree_count++))
        check_worktree "$worktree_path" || true
        local check_result=$?
        ((total_issues += check_result))
    done < <(git -C "${REPO_ROOT}" worktree list 2>/dev/null || echo "")

    echo "=== Summary ==="
    echo "Total worktrees: $worktree_count"

    if [[ $total_issues -eq 0 ]]; then
        echo -e "${GREEN}All worktrees healthy!${NC}"
        exit 0
    else
        echo -e "${RED}Found $total_issues issue(s)${NC}"
        exit 1
    fi
}

main "$@"
