#!/bin/bash
# PostToolUse hook for Write/Edit operations
# Runs format on changed files using ./tools/contract
#
# Input: JSON from stdin with tool_input.file_path

set -euo pipefail

# Read JSON from stdin
INPUT=$(cat)

# Parse file path from JSON input
FILE_PATH=""
if [[ -n "$INPUT" ]]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null || echo "")
  # Fall back to direct field
  if [[ -z "$FILE_PATH" ]]; then
    FILE_PATH=$(echo "$INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null || echo "")
  fi
elif [[ -n "${CLAUDE_TOOL_INPUT:-}" ]]; then
  FILE_PATH=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.file_path // .path // empty' 2>/dev/null || echo "")
fi

# Python fallback if jq is not available
if [[ -z "$FILE_PATH" ]] && command -v python3 &>/dev/null && [[ -n "$INPUT" ]]; then
  FILE_PATH=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    ti = data.get('tool_input', data)
    path = ti.get('file_path', '') or ti.get('path', '')
    print(path)
except:
    pass
" 2>/dev/null || echo "")
fi

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only run on TypeScript/JavaScript files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx|js|jsx|mts|mjs|cts|cjs)$ ]]; then
  exit 0
fi

# Check if tools/contract exists
if [[ ! -f "./tools/contract" ]]; then
  # Fall back to project root
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
  if [[ ! -f "$PROJECT_ROOT/tools/contract" ]]; then
    exit 0
  fi
  cd "$PROJECT_ROOT"
fi

# Run format via contract (Golden Commands)
# Non-blocking: don't fail the hook if format fails
./tools/contract format "$FILE_PATH" 2>/dev/null || true

exit 0
