#!/bin/bash
# PreToolUse hook for Bash commands
# Exit codes: 0 = allow, 2 = block, other = warning
#
# Input: JSON from stdin with tool_input.command
# Output: stderr message (shown to user if blocked/warned)

set -euo pipefail

# Read JSON from stdin
INPUT=$(cat)

# Parse command from JSON input (supports both env var and stdin)
# Try stdin first, fall back to env var for backwards compatibility
if [[ -n "$INPUT" ]]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")
  # Fall back to direct command field
  if [[ -z "$COMMAND" ]]; then
    COMMAND=$(echo "$INPUT" | jq -r '.command // empty' 2>/dev/null || echo "")
  fi
elif [[ -n "${CLAUDE_TOOL_INPUT:-}" ]]; then
  COMMAND=$(echo "$CLAUDE_TOOL_INPUT" | jq -r '.command // empty' 2>/dev/null || echo "")
fi

# If jq is not available, try Python as fallback
if [[ -z "${COMMAND:-}" ]] && command -v python3 &>/dev/null; then
  if [[ -n "$INPUT" ]]; then
    COMMAND=$(echo "$INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    cmd = data.get('tool_input', {}).get('command', '') or data.get('command', '')
    print(cmd)
except:
    pass
" 2>/dev/null || echo "")
  fi
fi

if [[ -z "${COMMAND:-}" ]]; then
  exit 0
fi

# === Layer B: Defense Guardrails ===

# Block main branch operations
if [[ "$COMMAND" =~ git\ (push|checkout|switch).*main ]] || \
   [[ "$COMMAND" =~ git\ (push|checkout|switch).*master ]]; then
  echo "BLOCKED: Direct operations on main/master branch are forbidden." >&2
  echo "Use worktree and PR workflow instead." >&2
  echo "Reason: AGENTS.md Non-negotiable #1" >&2
  exit 2
fi

# Block force push (all variants)
# Match -f or --force only as standalone flags (space or end of string after)
if [[ "$COMMAND" =~ git\ push.*\ (-f|--force|--force-with-lease)(\ |$) ]]; then
  echo "BLOCKED: Force push is forbidden." >&2
  echo "Reason: AGENTS.md Autonomy Configuration - safe mode" >&2
  exit 2
fi

# Block hard reset (destructive)
if [[ "$COMMAND" =~ git\ reset\ --hard ]]; then
  echo "BLOCKED: git reset --hard is forbidden." >&2
  echo "Use git stash or git checkout -- instead." >&2
  exit 2
fi

# Block dangerous rm commands
if [[ "$COMMAND" =~ rm\ -rf\ [./]*$ ]] || \
   [[ "$COMMAND" =~ rm\ -rf\ /[^\ ]* ]] || \
   [[ "$COMMAND" =~ rm\ -rf\ \~ ]]; then
  echo "BLOCKED: Recursive delete of root, current, or home directory." >&2
  exit 2
fi

# Block sudo (no privilege escalation)
PIPE_SUDO_PATTERN='[|][ ]*sudo'
if [[ "$COMMAND" =~ ^sudo\  ]] || [[ "$COMMAND" =~ $PIPE_SUDO_PATTERN ]]; then
  echo "BLOCKED: sudo is not allowed." >&2
  exit 2
fi

# Block pipe to shell execution (RCE prevention)
if [[ "$COMMAND" =~ curl.*\|.*(bash|sh|zsh|python|node) ]] || \
   [[ "$COMMAND" =~ wget.*\|.*(bash|sh|zsh|python|node) ]]; then
  echo "BLOCKED: Piping download to shell execution is forbidden." >&2
  echo "Reason: Supply chain security" >&2
  exit 2
fi

# Block secret exfiltration attempts
if [[ "$COMMAND" =~ echo.*\$[A-Z_]*KEY ]] || \
   [[ "$COMMAND" =~ echo.*\$[A-Z_]*SECRET ]] || \
   [[ "$COMMAND" =~ echo.*\$[A-Z_]*TOKEN ]] || \
   [[ "$COMMAND" =~ printenv.*SECRET ]] || \
   [[ "$COMMAND" =~ printenv.*KEY ]] || \
   [[ "$COMMAND" =~ printenv.*TOKEN ]]; then
  echo "BLOCKED: Potential secret exfiltration detected." >&2
  exit 2
fi

# Block reading sensitive files
if [[ "$COMMAND" =~ cat.*\.env ]] || \
   [[ "$COMMAND" =~ cat.*\.pem ]] || \
   [[ "$COMMAND" =~ cat.*\.key ]] || \
   [[ "$COMMAND" =~ cat.*/secrets/ ]]; then
  echo "BLOCKED: Reading sensitive files is not allowed." >&2
  exit 2
fi

# Block raw package manager commands (MUST use ./tools/contract)
# Broad block: all pnpm/npm/yarn/bun/npx subcommands are blocked
# Exceptions: pnpm audit, pnpm outdated (read-only dependency checks, also available via contract)
PKG_MGR_PATTERN='^(pnpm|npm|yarn|bun|npx)[[:space:]]'
AUDIT_PATTERN='^(pnpm|npm) (audit|outdated)'
if [[ "$COMMAND" =~ $PKG_MGR_PATTERN ]] && \
   ! [[ "$COMMAND" =~ $AUDIT_PATTERN ]]; then
  echo "BLOCKED: Use './tools/contract' instead of raw package manager commands." >&2
  echo "Command: $COMMAND" >&2
  echo "" >&2
  echo "Correct commands:" >&2
  echo "  ./tools/contract test             # Instead of: pnpm test" >&2
  echo "  ./tools/contract lint             # Instead of: pnpm lint" >&2
  echo "  ./tools/contract build            # Instead of: pnpm build" >&2
  echo "  ./tools/contract format           # Instead of: pnpm format" >&2
  echo "  ./tools/contract typecheck        # Instead of: pnpm typecheck" >&2
  echo "  ./tools/contract openapi-generate # Instead of: pnpm openapi:generate" >&2
  echo "  ./tools/contract migrate          # Instead of: pnpm prisma migrate" >&2
  echo "  ./tools/contract audit            # Instead of: pnpm audit" >&2
  echo "  ./tools/contract outdated         # Instead of: pnpm outdated" >&2
  echo "" >&2
  echo "Exceptions (allowed): pnpm audit, pnpm outdated, npm audit, npm outdated" >&2
  echo "Reason: AGENTS.md Non-negotiable #3" >&2
  exit 2
fi

# All checks passed
exit 0
