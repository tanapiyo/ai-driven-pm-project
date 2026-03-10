#!/usr/bin/env bash
# tools/orchestrate/router.sh
# Request Routing Engine
#
# Analyzes user request and determines the appropriate agent and workflow.
# Supports:
#   - Keyword-based routing (fast, default)
#   - Intent-based routing (nuanced analysis)
#   - DocDD-aware routing (skips steps if artifacts exist)
#
# Usage:
#   ./tools/orchestrate/router.sh "<user request>"
#   ./tools/orchestrate/router.sh --smart "<user request>"  # DocDD-aware
#   ./tools/orchestrate/router.sh --json "<user request>"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
RULES_FILE="${SCRIPT_DIR}/routing-rules.yaml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*" >&2; }
log_debug() { [[ "${DEBUG:-}" == "1" ]] && echo -e "${CYAN}[DEBUG]${NC} $*" >&2 || true; }

show_usage() {
    cat << EOF
Usage: $(basename "$0") [options] "<user request>"

Options:
  --json        Output in JSON format
  --smart       Enable DocDD-aware smart routing (skips completed steps)
  --intent      Show intent analysis details
  --task-id <id> Specify task ID for DocDD lookup
  --list-rules  List all routing rules
  --list-agents List all agents
  -h, --help    Show this help message

Examples:
  $(basename "$0") "認証機能を追加して"
  $(basename "$0") --smart "GH-123 の続きを実装"
  $(basename "$0") --json "fix the login bug"
EOF
}

# Parse YAML value (simple)
yaml_get() {
    local file="$1"
    local key="$2"
    grep -E "^${key}:" "$file" 2>/dev/null | sed 's/^[^:]*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//'
}

# Extract rules from YAML
extract_rules() {
    # This is a simplified parser for our specific YAML structure
    # Returns: id|patterns|exclude_patterns|agent|workflow

    local in_rules=false
    local current_id=""
    local current_patterns=""
    local current_exclude=""
    local current_agent=""
    local current_workflow=""

    while IFS= read -r line; do
        # Detect rules section
        if [[ "$line" == "rules:" ]]; then
            in_rules=true
            continue
        fi

        # Exit rules section
        if [[ "$in_rules" == true && "$line" =~ ^[a-z]+: && ! "$line" =~ ^[[:space:]] ]]; then
            # Output last rule if exists
            if [[ -n "$current_id" ]]; then
                echo "${current_id}|${current_patterns}|${current_exclude}|${current_agent}|${current_workflow}"
            fi
            break
        fi

        if [[ "$in_rules" != true ]]; then
            continue
        fi

        # New rule
        if [[ "$line" =~ ^[[:space:]]{2}-[[:space:]]id: ]]; then
            # Output previous rule
            if [[ -n "$current_id" ]]; then
                echo "${current_id}|${current_patterns}|${current_exclude}|${current_agent}|${current_workflow}"
            fi
            current_id=$(echo "$line" | sed 's/.*id:[[:space:]]*//' | sed 's/"//g')
            current_patterns=""
            current_exclude=""
            current_agent=""
            current_workflow=""
            continue
        fi

        # Parse patterns
        if [[ "$line" =~ ^[[:space:]]+patterns: ]]; then
            continue
        fi

        if [[ "$line" =~ ^[[:space:]]+exclude_patterns: ]]; then
            continue
        fi

        # Pattern item
        if [[ "$line" =~ ^[[:space:]]{6}-[[:space:]]\" ]]; then
            local pattern
            pattern=$(echo "$line" | sed 's/.*- "//' | sed 's/"$//')
            if [[ -n "$current_patterns" ]]; then
                current_patterns="${current_patterns},${pattern}"
            else
                current_patterns="$pattern"
            fi
            continue
        fi

        # Agent
        if [[ "$line" =~ ^[[:space:]]+agent:[[:space:]] ]]; then
            current_agent=$(echo "$line" | sed 's/.*agent:[[:space:]]*//' | sed 's/"//g')
            continue
        fi

        # Workflow
        if [[ "$line" =~ ^[[:space:]]+workflow:[[:space:]] ]]; then
            current_workflow=$(echo "$line" | sed 's/.*workflow:[[:space:]]*//' | sed 's/"//g')
            continue
        fi

    done < "$RULES_FILE"
}

# Match request against patterns
match_patterns() {
    local request="$1"
    local patterns="$2"

    # Convert request to lowercase
    local lower_request
    lower_request=$(echo "$request" | tr '[:upper:]' '[:lower:]')

    # Check each pattern
    IFS=',' read -ra pattern_array <<< "$patterns"
    for pattern in "${pattern_array[@]}"; do
        local lower_pattern
        lower_pattern=$(echo "$pattern" | tr '[:upper:]' '[:lower:]')

        if [[ "$lower_request" == *"$lower_pattern"* ]]; then
            log_debug "Matched pattern: $pattern"
            return 0
        fi
    done

    return 1
}

# Route request to appropriate agent
route_request() {
    local request="$1"
    local output_json="${2:-false}"

    log_debug "Routing request: $request"

    local matched_id=""
    local matched_agent=""
    local matched_workflow=""

    while IFS='|' read -r id patterns exclude agent workflow; do
        log_debug "Checking rule: $id"

        # Skip if no patterns
        [[ -z "$patterns" ]] && continue

        # Check exclude patterns first
        if [[ -n "$exclude" ]]; then
            if match_patterns "$request" "$exclude"; then
                log_debug "Excluded by pattern in rule: $id"
                continue
            fi
        fi

        # Check patterns
        if match_patterns "$request" "$patterns"; then
            matched_id="$id"
            matched_agent="$agent"
            matched_workflow="$workflow"
            log_debug "Matched rule: $id -> agent: $agent, workflow: $workflow"
            break
        fi

    done < <(extract_rules)

    # Use fallback if no match
    if [[ -z "$matched_id" ]]; then
        matched_id="fallback"
        matched_agent="pdm"
        matched_workflow="sequential"
        log_debug "Using fallback rule"
    fi

    # Get pipeline for matched rule
    local pipeline
    pipeline=$(get_pipeline "$matched_id")

    if [[ "$output_json" == true ]]; then
        cat << EOF
{
  "rule_id": "${matched_id}",
  "agent": "${matched_agent}",
  "workflow": "${matched_workflow}",
  "pipeline": ${pipeline},
  "request": $(echo "$request" | jq -Rs .),
  "smart_routing": false
}
EOF
    else
        echo -e "${GREEN}Routing Decision${NC}"
        echo "─────────────────────────────"
        echo -e "Rule:     ${CYAN}${matched_id}${NC}"
        echo -e "Agent:    ${YELLOW}${matched_agent}${NC}"
        echo -e "Workflow: ${matched_workflow}"
        echo ""
        echo "Pipeline:"
        echo "$pipeline" | jq -r '.[] | "  \(.step). \(.agent) -> \(.output)"' 2>/dev/null || echo "  (single step)"
    fi
}

# Get pipeline for a rule
get_pipeline() {
    local rule_id="$1"

    # Parse pipeline from YAML (simplified)
    local in_rule=false
    local in_pipeline=false
    local step=0
    local pipeline="["

    while IFS= read -r line; do
        if [[ "$line" =~ id:[[:space:]]*\"?${rule_id}\"? ]]; then
            in_rule=true
            continue
        fi

        if [[ "$in_rule" == true && "$line" =~ ^[[:space:]]{2}-[[:space:]]id: ]]; then
            # Next rule, stop
            break
        fi

        if [[ "$in_rule" == true && "$line" =~ ^[[:space:]]+pipeline: ]]; then
            in_pipeline=true
            continue
        fi

        if [[ "$in_pipeline" == true && "$line" =~ ^[[:space:]]{6}-[[:space:]]agent: ]]; then
            step=$((step + 1))
            local agent
            agent=$(echo "$line" | sed 's/.*agent:[[:space:]]*//' | sed 's/"//g')
            if [[ $step -gt 1 ]]; then
                pipeline="${pipeline},"
            fi
            pipeline="${pipeline}{\"step\":${step},\"agent\":\"${agent}\""
        fi

        if [[ "$in_pipeline" == true && "$line" =~ ^[[:space:]]+output: ]]; then
            local output
            output=$(echo "$line" | sed 's/.*output:[[:space:]]*//' | sed 's/"//g')
            pipeline="${pipeline},\"output\":\"${output}\""
        fi

        if [[ "$in_pipeline" == true && "$line" =~ ^[[:space:]]+description: ]]; then
            local desc
            desc=$(echo "$line" | sed 's/.*description:[[:space:]]*//' | sed 's/"//g')
            pipeline="${pipeline},\"description\":\"${desc}\"}"
        fi

        # Exit pipeline on next section
        if [[ "$in_pipeline" == true && "$line" =~ ^[[:space:]]{4}[a-z]+: && ! "$line" =~ ^[[:space:]]{6} ]]; then
            break
        fi

    done < "$RULES_FILE"

    pipeline="${pipeline}]"
    echo "$pipeline"
}

# List all rules
list_rules() {
    echo -e "${CYAN}Available Routing Rules${NC}"
    echo "════════════════════════════════════════"

    while IFS='|' read -r id patterns _ agent workflow; do
        echo -e "${YELLOW}${id}${NC}"
        echo "  Agent: $agent"
        echo "  Workflow: $workflow"
        echo "  Patterns: ${patterns:0:60}..."
        echo ""
    done < <(extract_rules)
}

# List all agents
list_agents() {
    echo -e "${CYAN}Available Agents${NC}"
    echo "════════════════════════════════════════"

    local agents=("pdm:Product Manager" "architect:Architect" "designer:Product Designer" "implementer:Implementer" "qa:QA Engineer" "reviewer:Code Reviewer")

    for agent_info in "${agents[@]}"; do
        local id="${agent_info%%:*}"
        local name="${agent_info#*:}"
        local prompt="prompts/agents/${id}.md"
        local exists=""
        if [[ -f "${REPO_ROOT}/${prompt}" ]]; then
            exists="${GREEN}✓${NC}"
        else
            exists="${RED}✗${NC}"
        fi
        echo -e "${YELLOW}${id}${NC} - ${name} ${exists}"
        echo "  Prompt: ${prompt}"
        echo ""
    done
}

# Smart routing with DocDD awareness
# Analyzes existing artifacts and adjusts pipeline accordingly
smart_route_request() {
    local request="$1"
    local output_json="${2:-false}"
    local task_id="${3:-}"

    log_info "Smart routing with DocDD awareness..."

    # Step 1: Intent analysis
    log_debug "Analyzing intent..."
    local intent_result
    intent_result=$("${SCRIPT_DIR}/intent-analyzer.sh" "$request" 2>/dev/null || echo "{}")

    local intent
    local scope
    intent=$(echo "$intent_result" | jq -r '.intent // "new_feature"')
    scope=$(echo "$intent_result" | jq -r '.scope // "medium"')

    # Step 2: Find related task/spec
    if [[ -z "$task_id" ]]; then
        task_id=$("${SCRIPT_DIR}/docdd-scanner.sh" --find-related "$request" 2>/dev/null || true)
    fi

    # Step 3: Scan DocDD artifacts
    local docdd_context="{}"
    local steps_done="[]"
    local steps_needed="[]"
    local start_from="pdm"

    if [[ -n "$task_id" ]]; then
        log_debug "Found related task: $task_id"
        docdd_context=$("${SCRIPT_DIR}/docdd-scanner.sh" --json "$task_id" 2>/dev/null || echo "{}")

        steps_done=$(echo "$docdd_context" | jq -r '.steps_done // []')
        steps_needed=$(echo "$docdd_context" | jq -r '.steps_needed // []')
        start_from=$(echo "$docdd_context" | jq -r '.start_from // "pdm"')
    else
        # No existing task, use intent-based steps
        steps_needed=$(echo "$intent_result" | jq -r '.required_steps // ["pdm", "architect", "implementer", "qa", "reviewer"]')
        start_from=$(echo "$intent_result" | jq -r '.start_from // "pdm"')
    fi

    # Step 4: Build optimized pipeline
    local optimized_pipeline="["
    local step=0

    # Map agents to outputs
    declare -A agent_outputs=(
        ["pdm"]="spec"
        ["architect"]="plan"
        ["designer"]="ui_requirements"
        ["implementer"]="code"
        ["qa"]="test"
        ["reviewer"]="review"
    )

    # Build pipeline from steps_needed
    local first=true
    for agent in $(echo "$steps_needed" | jq -r '.[]' 2>/dev/null); do
        step=$((step + 1))
        local output="${agent_outputs[$agent]:-output}"

        if [[ "$first" == true ]]; then
            first=false
        else
            optimized_pipeline="${optimized_pipeline},"
        fi

        optimized_pipeline="${optimized_pipeline}{\"step\":${step},\"agent\":\"${agent}\",\"output\":\"${output}\"}"
    done
    optimized_pipeline="${optimized_pipeline}]"

    # Generate routing decision
    if [[ "$output_json" == true ]]; then
        cat << EOF
{
  "rule_id": "smart",
  "intent": "${intent}",
  "scope": "${scope}",
  "agent": "${start_from}",
  "workflow": "sequential",
  "pipeline": ${optimized_pipeline},
  "request": $(echo "$request" | jq -Rs .),
  "smart_routing": true,
  "task_id": $(if [[ -n "$task_id" ]]; then echo "\"$task_id\""; else echo "null"; fi),
  "docdd_context": {
    "steps_done": ${steps_done},
    "steps_needed": ${steps_needed}
  }
}
EOF
    else
        echo -e "${GREEN}Smart Routing Decision${NC}"
        echo "═══════════════════════════════════════"
        echo ""
        echo -e "${CYAN}Intent Analysis:${NC}"
        echo -e "  Intent:    ${intent}"
        echo -e "  Scope:     ${scope}"
        [[ -n "$task_id" ]] && echo -e "  Task ID:   ${YELLOW}${task_id}${NC}"
        echo ""
        echo -e "${CYAN}DocDD Status:${NC}"
        echo -e "  Done:      ${GREEN}$(echo "$steps_done" | jq -r 'join(", ") // "none"')${NC}"
        echo -e "  Needed:    ${YELLOW}$(echo "$steps_needed" | jq -r 'join(", ") // "none"')${NC}"
        echo ""
        echo -e "${CYAN}Optimized Pipeline:${NC}"
        echo -e "  Start From: ${GREEN}${start_from}${NC}"
        echo ""
        echo "Steps:"
        echo "$optimized_pipeline" | jq -r '.[] | "  \(.step). \(.agent) → \(.output)"' 2>/dev/null || echo "  (unable to parse)"
        echo ""

        if [[ -n "$task_id" ]]; then
            echo -e "${CYAN}Related Documents:${NC}"
            local spec_file
            spec_file=$(echo "$docdd_context" | jq -r '.artifacts.spec // empty')
            local plan_file
            plan_file=$(echo "$docdd_context" | jq -r '.artifacts.plan // empty')
            [[ -n "$spec_file" ]] && echo "  Spec: $spec_file"
            [[ -n "$plan_file" ]] && echo "  Plan: $plan_file"
            echo ""
        fi
    fi
}

# Main
main() {
    local output_json=false
    local smart_mode=false
    local show_intent=false
    local task_id=""
    local request=""

    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_usage
                exit 0
                ;;
            --json)
                output_json=true
                shift
                ;;
            --smart)
                smart_mode=true
                shift
                ;;
            --intent)
                show_intent=true
                shift
                ;;
            --task-id)
                task_id="$2"
                shift 2
                ;;
            --list-rules)
                list_rules
                exit 0
                ;;
            --list-agents)
                list_agents
                exit 0
                ;;
            -*)
                echo "Unknown option: $1" >&2
                show_usage
                exit 1
                ;;
            *)
                request="$1"
                shift
                ;;
        esac
    done

    if [[ -z "$request" ]]; then
        echo "Error: No request provided" >&2
        show_usage
        exit 1
    fi

    if [[ "$show_intent" == true ]]; then
        "${SCRIPT_DIR}/intent-analyzer.sh" "$request"
        exit 0
    fi

    if [[ "$smart_mode" == true ]]; then
        smart_route_request "$request" "$output_json" "$task_id"
    else
        route_request "$request" "$output_json"
    fi
}

main "$@"
