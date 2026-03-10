#!/bin/bash
# ==============================================================================
# Git wrapper to prevent --no-verify usage
# This script intercepts git commands and blocks --no-verify flag
# ==============================================================================

# Check if --no-verify or -n (short form for commit) is used
for arg in "$@"; do
  if [[ "$arg" == "--no-verify" ]] || [[ "$arg" == "-n" && "$1" == "commit" ]]; then
    echo "=============================================="
    echo "ERROR: --no-verify is not allowed in this devcontainer"
    echo "=============================================="
    echo ""
    echo "Pre-commit hooks are mandatory for code quality."
    echo "If hooks are failing, please fix the issues instead of bypassing them."
    echo ""
    echo "If you believe this is a false positive, please contact the team."
    echo "=============================================="
    exit 1
  fi
done

# Execute the real git command
/usr/bin/git "$@"
