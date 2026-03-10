#!/usr/bin/env bash
# tools/orchestrate/docdd-scanner.sh
# DocDD アーティファクトをスキャンし、必要なステップを判定する
#
# Usage:
#   ./tools/orchestrate/docdd-scanner.sh [--task-id <id>] [--json]
#
# スキャンするアーティファクト:
#   - .specify/specs/<id>/spec.md       → PdM完了
#   - .specify/specs/<id>/plan.md       → Architect完了
#   - docs/02_architecture/adr/*.md     → ADR存在
#   - docs/01_product/design/*.md       → Designer完了
#   - docs/03_quality/test-plan/*.md    → QA計画完了

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[SCAN]${NC} $*" >&2; }

show_usage() {
    cat << EOF
Usage: $(basename "$0") [options]

Scans existing DocDD artifacts to determine which workflow steps are needed.

Options:
  --task-id <id>    Specific task/spec ID to scan
  --spec-dir <dir>  Specific spec directory to scan
  --json            Output in JSON format
  -h, --help        Show this help

Output:
  Lists which agents' work is already complete based on existing artifacts.
EOF
}

# Check if spec exists
check_spec() {
    local task_id="$1"
    local spec_file="${REPO_ROOT}/.specify/specs/${task_id}/spec.md"
    [[ -f "$spec_file" ]] && echo "$spec_file"
}

# Check if plan exists
check_plan() {
    local task_id="$1"
    local plan_file="${REPO_ROOT}/.specify/specs/${task_id}/plan.md"
    [[ -f "$plan_file" ]] && echo "$plan_file"
}

# Check if ADR exists for task
check_adr() {
    local task_id="$1"
    local adr_pattern="${REPO_ROOT}/docs/02_architecture/adr/*${task_id}*.md"
    # shellcheck disable=SC2086
    ls $adr_pattern 2>/dev/null | head -1 || true
}

# Check if UI requirements exist
check_ui_requirements() {
    local task_id="$1"
    # Check for task-specific or general UI requirements
    local ui_file="${REPO_ROOT}/docs/01_product/design/ui_requirements.md"
    [[ -f "$ui_file" ]] && echo "$ui_file"
}

# Check if test plan exists
check_test_plan() {
    local task_id="$1"
    local test_plan="${REPO_ROOT}/docs/03_quality/test-plan/${task_id}.md"
    [[ -f "$test_plan" ]] && echo "$test_plan"
}

# Check implementation status (are there code files?)
check_implementation() {
    local task_id="$1"
    # Look for recent commits mentioning the task ID
    if git -C "${REPO_ROOT}" log --oneline -1 --grep="$task_id" -- "src/" "apps/" "packages/" 2>/dev/null | grep -q . 2>/dev/null; then
        echo "implemented"
    fi
    true  # Always succeed
}

# Scan all DocDD artifacts for a task
scan_task() {
    local task_id="$1"
    local output_json="${2:-false}"

    log_info "Scanning DocDD artifacts for: $task_id"

    local spec_file=""
    local plan_file=""
    local adr_file=""
    local ui_file=""
    local test_plan=""
    local impl_status=""

    spec_file=$(check_spec "$task_id" || true)
    plan_file=$(check_plan "$task_id" || true)
    adr_file=$(check_adr "$task_id" || true)
    ui_file=$(check_ui_requirements "$task_id" || true)
    test_plan=$(check_test_plan "$task_id" || true)
    impl_status=$(check_implementation "$task_id" || true)

    # Determine which steps are needed
    local steps_needed=()
    local steps_done=()

    if [[ -z "$spec_file" ]]; then
        steps_needed+=("pdm")
    else
        steps_done+=("pdm")
    fi

    if [[ -z "$plan_file" && -z "$adr_file" ]]; then
        steps_needed+=("architect")
    else
        steps_done+=("architect")
    fi

    # Designer is optional, only if UI-related
    # steps_needed+=("designer")

    if [[ -z "$impl_status" ]]; then
        steps_needed+=("implementer")
    else
        steps_done+=("implementer")
    fi

    if [[ -z "$test_plan" ]]; then
        steps_needed+=("qa")
    else
        steps_done+=("qa")
    fi

    # Reviewer is always needed for new changes
    steps_needed+=("reviewer")

    if [[ "$output_json" == true ]]; then
        local steps_done_json=""
        local steps_needed_json=""
        
        if [[ ${#steps_done[@]} -gt 0 ]]; then
            steps_done_json=$(printf '"%s",' "${steps_done[@]}" | sed 's/,$//')
        fi
        
        if [[ ${#steps_needed[@]} -gt 0 ]]; then
            steps_needed_json=$(printf '"%s",' "${steps_needed[@]}" | sed 's/,$//')
        fi
        
        cat << EOF
{
  "task_id": "${task_id}",
  "artifacts": {
    "spec": $(if [[ -n "$spec_file" ]]; then echo "\"$spec_file\""; else echo "null"; fi),
    "plan": $(if [[ -n "$plan_file" ]]; then echo "\"$plan_file\""; else echo "null"; fi),
    "adr": $(if [[ -n "$adr_file" ]]; then echo "\"$adr_file\""; else echo "null"; fi),
    "ui_requirements": $(if [[ -n "$ui_file" ]]; then echo "\"$ui_file\""; else echo "null"; fi),
    "test_plan": $(if [[ -n "$test_plan" ]]; then echo "\"$test_plan\""; else echo "null"; fi)
  },
  "steps_done": [${steps_done_json}],
  "steps_needed": [${steps_needed_json}],
  "start_from": "${steps_needed[0]:-reviewer}"
}
EOF
    else
        echo ""
        echo -e "${CYAN}=== DocDD Artifact Scan ===${NC}"
        echo "Task ID: $task_id"
        echo ""
        echo "Artifacts Found:"
        [[ -n "$spec_file" ]] && echo -e "  ${GREEN}✓${NC} Spec: $spec_file" || echo -e "  ${YELLOW}○${NC} Spec: (not found)"
        [[ -n "$plan_file" ]] && echo -e "  ${GREEN}✓${NC} Plan: $plan_file" || echo -e "  ${YELLOW}○${NC} Plan: (not found)"
        [[ -n "$adr_file" ]] && echo -e "  ${GREEN}✓${NC} ADR: $adr_file" || echo -e "  ${YELLOW}○${NC} ADR: (not found)"
        [[ -n "$ui_file" ]] && echo -e "  ${GREEN}✓${NC} UI Req: $ui_file" || echo -e "  ${YELLOW}○${NC} UI Req: (not found)"
        [[ -n "$test_plan" ]] && echo -e "  ${GREEN}✓${NC} Test Plan: $test_plan" || echo -e "  ${YELLOW}○${NC} Test Plan: (not found)"
        echo ""
        echo "Workflow Decision:"
        echo -e "  Steps Done: ${GREEN}${steps_done[*]:-none}${NC}"
        echo -e "  Steps Needed: ${YELLOW}${steps_needed[*]}${NC}"
        echo -e "  Start From: ${CYAN}${steps_needed[0]:-reviewer}${NC}"
        echo ""
    fi
}

# Scan all specs in .specify/specs/
scan_all() {
    local output_json="$1"

    log_info "Scanning all specs..."

    if [[ ! -d "${REPO_ROOT}/.specify/specs" ]]; then
        echo "No specs directory found"
        return
    fi

    for spec_dir in "${REPO_ROOT}/.specify/specs"/*/; do
        if [[ -d "$spec_dir" ]]; then
            local task_id
            task_id=$(basename "$spec_dir")
            scan_task "$task_id" "$output_json"
            echo ""
        fi
    done
}

# Find related spec from request text
find_related_spec() {
    local request="$1"

    # Extract potential task IDs from request
    local gh_id
    gh_id=$(echo "$request" | grep -oE 'GH-[0-9]+' | head -1 || true)

    if [[ -n "$gh_id" ]]; then
        echo "$gh_id"
        return
    fi

    # Search specs for matching keywords
    if [[ -d "${REPO_ROOT}/.specify/specs" ]]; then
        for spec_dir in "${REPO_ROOT}/.specify/specs"/*/; do
            if [[ -d "$spec_dir" ]]; then
                local spec_file="${spec_dir}/spec.md"
                if [[ -f "$spec_file" ]]; then
                    # Simple keyword match in spec title/content
                    if grep -qi "$(echo "$request" | cut -c1-30)" "$spec_file" 2>/dev/null; then
                        basename "$spec_dir"
                        return
                    fi
                fi
            fi
        done
    fi

    echo ""
}

# Main
main() {
    local task_id=""
    local spec_dir=""
    local output_json=false
    local scan_all_flag=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --task-id)
                task_id="$2"
                shift 2
                ;;
            --spec-dir)
                spec_dir="$2"
                shift 2
                ;;
            --json)
                output_json=true
                shift
                ;;
            --all)
                scan_all_flag=true
                shift
                ;;
            --find-related)
                find_related_spec "$2"
                exit 0
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                # Treat as task_id if no flag
                task_id="$1"
                shift
                ;;
        esac
    done

    if [[ "$scan_all_flag" == true ]]; then
        scan_all "$output_json"
    elif [[ -n "$task_id" ]]; then
        scan_task "$task_id" "$output_json"
    elif [[ -n "$spec_dir" ]]; then
        task_id=$(basename "$spec_dir")
        scan_task "$task_id" "$output_json"
    else
        show_usage
        exit 1
    fi
}

main "$@"
