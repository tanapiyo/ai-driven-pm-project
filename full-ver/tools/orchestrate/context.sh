#!/usr/bin/env bash
# tools/orchestrate/context.sh
# Worktree Context 操作ユーティリティ
#
# Usage:
#   source tools/orchestrate/context.sh
#   context_create <worktree_path> <agent> <task_id>
#   context_read <worktree_path>
#   context_update <worktree_path> <key> <value>
#   context_validate <worktree_path>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Context file name
CONTEXT_FILE=".worktree-context.yaml"

# === YAML Helpers ===

# Simple YAML value parser
# Usage: yaml_get <file> <key>
yaml_get() {
    local file="$1"
    local key="$2"
    grep -E "^${key}:" "$file" 2>/dev/null | sed 's/^[^:]*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//"
}

# Simple YAML nested value parser
# Usage: yaml_get_nested <file> <parent> <key>
yaml_get_nested() {
    local file="$1"
    local parent="$2"
    local key="$3"
    sed -n "/^${parent}:/,/^[a-z]/p" "$file" 2>/dev/null | grep -E "^[[:space:]]+${key}:" | sed 's/^[^:]*:[[:space:]]*//' | sed 's/^"//' | sed 's/"$//'
}

# Set YAML value (simple key: value)
# Usage: yaml_set <file> <key> <value>
yaml_set() {
    local file="$1"
    local key="$2"
    local value="$3"

    if grep -qE "^${key}:" "$file" 2>/dev/null; then
        # Update existing
        sed -i "s|^${key}:.*|${key}: \"${value}\"|" "$file"
    else
        # Append
        echo "${key}: \"${value}\"" >> "$file"
    fi
}

# === Context Operations ===

# Create a new context file
# Usage: context_create <worktree_path> <agent> <task_id> [branch]
context_create() {
    local worktree_path="$1"
    local agent="$2"
    local task_id="$3"
    local branch="${4:-}"

    local context_file="${worktree_path}/${CONTEXT_FILE}"

    if [[ -z "$branch" ]]; then
        branch=$(cd "$worktree_path" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    fi

    cat > "$context_file" << EOF
# Worktree Context
# Generated: $(date -Iseconds)
# Schema: tools/orchestrate/context-schema.yaml

task_id: "${task_id}"
parent_agent: "orchestrator"
assigned_agent: "${agent}"
branch: "${branch}"
worktree_path: "${worktree_path}"
base_branch: "main"

# DocDD Context (fill in as work progresses)
context:
  spec: ""
  plan: ""
  adr: ""
  ui_requirements: ""
  test_plan: ""

# Task Definition
task:
  title: ""
  description: ""
  original_request: ""
  scope: []

# Success Criteria
success_criteria:
  - "contract test passes"
  - "docs updated if needed"

# Completion Callback
on_complete:
  notify: "orchestrator"
  next_agent: "none"
  action: "report-status"

# Workflow Info
workflow:
  type: "sequential"
  step: 1
  total_steps: 1

# Environment
environment:
  port_base: 3000
  stack: ""
  extra_env: {}

# Spawn Metadata
_spawn_info:
  spawned_at: "$(date -Iseconds)"
  worktree_id: 0
  parent_worktree: "${REPO_ROOT}"
EOF

    echo "$context_file"
}

# Read context file and export as variables
# Usage: context_read <worktree_path>
context_read() {
    local worktree_path="$1"
    local context_file="${worktree_path}/${CONTEXT_FILE}"

    if [[ ! -f "$context_file" ]]; then
        echo "ERROR: Context file not found: $context_file" >&2
        return 1
    fi

    # Export main fields as environment variables
    export CTX_TASK_ID
    CTX_TASK_ID=$(yaml_get "$context_file" "task_id")
    export CTX_AGENT
    CTX_AGENT=$(yaml_get "$context_file" "assigned_agent")
    export CTX_BRANCH
    CTX_BRANCH=$(yaml_get "$context_file" "branch")
    export CTX_WORKTREE_PATH
    CTX_WORKTREE_PATH=$(yaml_get "$context_file" "worktree_path")
    export CTX_BASE_BRANCH
    CTX_BASE_BRANCH=$(yaml_get "$context_file" "base_branch")

    # Nested values
    export CTX_SPEC
    CTX_SPEC=$(yaml_get_nested "$context_file" "context" "spec")
    export CTX_PLAN
    CTX_PLAN=$(yaml_get_nested "$context_file" "context" "plan")
    export CTX_ADR
    CTX_ADR=$(yaml_get_nested "$context_file" "context" "adr")

    export CTX_ON_COMPLETE_NOTIFY
    CTX_ON_COMPLETE_NOTIFY=$(yaml_get_nested "$context_file" "on_complete" "notify")
    export CTX_ON_COMPLETE_NEXT
    CTX_ON_COMPLETE_NEXT=$(yaml_get_nested "$context_file" "on_complete" "next_agent")

    export CTX_PORT_BASE
    CTX_PORT_BASE=$(yaml_get_nested "$context_file" "environment" "port_base")
    export CTX_STACK
    CTX_STACK=$(yaml_get_nested "$context_file" "environment" "stack")

    echo "Context loaded from: $context_file"
}

# Update a context value
# Usage: context_update <worktree_path> <key> <value>
context_update() {
    local worktree_path="$1"
    local key="$2"
    local value="$3"
    local context_file="${worktree_path}/${CONTEXT_FILE}"

    if [[ ! -f "$context_file" ]]; then
        echo "ERROR: Context file not found: $context_file" >&2
        return 1
    fi

    yaml_set "$context_file" "$key" "$value"
    echo "Updated: $key = $value"
}

# Update context status
# Usage: context_set_status <worktree_path> <status>
context_set_status() {
    local worktree_path="$1"
    local status="$2"
    context_update "$worktree_path" "status" "$status"
}

# Add DocDD reference
# Usage: context_add_doc <worktree_path> <type> <path>
# Types: spec, plan, adr, ui_requirements, test_plan
context_add_doc() {
    local worktree_path="$1"
    local doc_type="$2"
    local doc_path="$3"
    local context_file="${worktree_path}/${CONTEXT_FILE}"

    if [[ ! -f "$context_file" ]]; then
        echo "ERROR: Context file not found: $context_file" >&2
        return 1
    fi

    # Update the context section
    sed -i "s|^  ${doc_type}:.*|  ${doc_type}: \"${doc_path}\"|" "$context_file"
    echo "Added doc reference: ${doc_type} = ${doc_path}"
}

# Validate context file against schema
# Usage: context_validate <worktree_path>
context_validate() {
    local worktree_path="$1"
    local context_file="${worktree_path}/${CONTEXT_FILE}"
    local errors=0

    if [[ ! -f "$context_file" ]]; then
        echo "ERROR: Context file not found: $context_file" >&2
        return 1
    fi

    echo "Validating: $context_file"

    # Required fields
    local required=("task_id" "assigned_agent" "branch" "worktree_path")
    for field in "${required[@]}"; do
        local value
        value=$(yaml_get "$context_file" "$field")
        if [[ -z "$value" ]]; then
            echo "ERROR: Missing required field: $field"
            errors=$((errors + 1))
        fi
    done

    # Validate agent type
    local agent
    agent=$(yaml_get "$context_file" "assigned_agent")
    local valid_agents=("pdm" "architect" "designer" "implementer" "qa" "reviewer")
    local valid=false
    for va in "${valid_agents[@]}"; do
        if [[ "$agent" == "$va" ]]; then
            valid=true
            break
        fi
    done
    if [[ "$valid" == false && -n "$agent" ]]; then
        echo "ERROR: Invalid agent type: $agent"
        errors=$((errors + 1))
    fi

    # Validate worktree path exists
    local wt_path
    wt_path=$(yaml_get "$context_file" "worktree_path")
    if [[ -n "$wt_path" && ! -d "$wt_path" ]]; then
        echo "WARNING: Worktree path does not exist: $wt_path"
    fi

    if [[ $errors -eq 0 ]]; then
        echo "OK: Context file is valid"
        return 0
    else
        echo "FAILED: $errors error(s) found"
        return 1
    fi
}

# Get context file path
# Usage: context_file_path <worktree_path>
context_file_path() {
    local worktree_path="$1"
    echo "${worktree_path}/${CONTEXT_FILE}"
}

# Check if context file exists
# Usage: context_exists <worktree_path>
context_exists() {
    local worktree_path="$1"
    [[ -f "${worktree_path}/${CONTEXT_FILE}" ]]
}

# Print context summary
# Usage: context_summary <worktree_path>
context_summary() {
    local worktree_path="$1"
    local context_file="${worktree_path}/${CONTEXT_FILE}"

    if [[ ! -f "$context_file" ]]; then
        echo "No context file found"
        return 1
    fi

    echo "=== Context Summary ==="
    echo "Task ID:    $(yaml_get "$context_file" "task_id")"
    echo "Agent:      $(yaml_get "$context_file" "assigned_agent")"
    echo "Branch:     $(yaml_get "$context_file" "branch")"
    echo "Path:       $(yaml_get "$context_file" "worktree_path")"
    echo ""
    echo "DocDD:"
    echo "  Spec:     $(yaml_get_nested "$context_file" "context" "spec" || echo "(none)")"
    echo "  Plan:     $(yaml_get_nested "$context_file" "context" "plan" || echo "(none)")"
    echo "  ADR:      $(yaml_get_nested "$context_file" "context" "adr" || echo "(none)")"
    echo ""
    echo "On Complete:"
    echo "  Notify:   $(yaml_get_nested "$context_file" "on_complete" "notify")"
    echo "  Next:     $(yaml_get_nested "$context_file" "on_complete" "next_agent")"
}

# === CLI Mode ===
# If script is run directly (not sourced), provide CLI interface
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    case "${1:-}" in
        create)
            shift
            context_create "$@"
            ;;
        read)
            shift
            context_read "$@"
            ;;
        update)
            shift
            context_update "$@"
            ;;
        validate)
            shift
            context_validate "$@"
            ;;
        summary)
            shift
            context_summary "$@"
            ;;
        add-doc)
            shift
            context_add_doc "$@"
            ;;
        *)
            echo "Usage: $(basename "$0") <command> [args]"
            echo ""
            echo "Commands:"
            echo "  create <worktree_path> <agent> <task_id> [branch]"
            echo "  read <worktree_path>"
            echo "  update <worktree_path> <key> <value>"
            echo "  validate <worktree_path>"
            echo "  summary <worktree_path>"
            echo "  add-doc <worktree_path> <type> <path>"
            exit 1
            ;;
    esac
fi
