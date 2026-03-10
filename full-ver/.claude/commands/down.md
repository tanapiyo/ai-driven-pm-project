---
description: Stop development environment and remove worktree
allowed-tools: Bash
---

# Stop Development Environment

Stop the development environment and remove the specified worktree.

## Arguments

- `<branch>` - Branch name (e.g., `feat/my-feature` or `feat-my-feature`) or worktree directory name

## Instructions

### Step 1: Resolve Branch to Worktree Path

First, find the worktree path from the branch name argument.

```bash
#!/usr/bin/env bash
set -euo pipefail

BRANCH_ARG="$ARGUMENTS"

if [[ -z "$BRANCH_ARG" ]]; then
    echo "[ERROR] Branch name is required"
    echo "Usage: /down <branch-name>"
    echo ""
    echo "Examples:"
    echo "  /down feat/my-feature"
    echo "  /down feat-my-feature"
    echo "  /down chore-down-command-298"
    exit 1
fi

# Get repository root (works from both root and worktree)
if [[ -f .git ]]; then
    # We're in a worktree
    REPO_ROOT=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/.git$||')
else
    REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
fi

WORKTREES_DIR="${REPO_ROOT}/worktrees"

# Convert branch name format (feat/name → feat-name)
SAFE_BRANCH=$(echo "$BRANCH_ARG" | sed 's/\//-/g')

# Find worktree path
WORKTREE_PATH=""

# Strategy 1: Check if argument is a path
if [[ -d "$BRANCH_ARG" ]]; then
    WORKTREE_PATH="$BRANCH_ARG"
# Strategy 2: Check worktrees directory with safe branch name
elif [[ -d "${WORKTREES_DIR}/${SAFE_BRANCH}" ]]; then
    WORKTREE_PATH="${WORKTREES_DIR}/${SAFE_BRANCH}"
# Strategy 3: Check worktrees directory with original name
elif [[ -d "${WORKTREES_DIR}/${BRANCH_ARG}" ]]; then
    WORKTREE_PATH="${WORKTREES_DIR}/${BRANCH_ARG}"
# Strategy 4: Search git worktree list by branch name
else
    WORKTREE_PATH=$(git -C "${REPO_ROOT}" worktree list --porcelain 2>/dev/null | \
        grep -A2 "^worktree " | \
        grep -B1 "branch refs/heads/${BRANCH_ARG}$" | \
        grep "^worktree " | \
        sed 's/^worktree //' | \
        head -1) || true
fi

if [[ -z "$WORKTREE_PATH" || ! -d "$WORKTREE_PATH" ]]; then
    echo "[ERROR] Worktree not found for branch: $BRANCH_ARG"
    echo ""
    echo "Available worktrees:"
    git -C "${REPO_ROOT}" worktree list 2>/dev/null | grep -v "^${REPO_ROOT} " || echo "  (none)"
    exit 1
fi

# Prevent removing main repository
if [[ "$(cd "$WORKTREE_PATH" && pwd)" == "$(cd "$REPO_ROOT" && pwd)" ]]; then
    echo "[ERROR] Cannot remove main repository"
    exit 1
fi

echo "[INFO] Found worktree: $WORKTREE_PATH"
```

### Step 2: Run Cleanup Script

Call the existing cleanup script with `--force` flag to remove the worktree and its associated Docker resources.

```bash
# Run cleanup script
"${REPO_ROOT}/tools/worktree/cleanup.sh" --force "$WORKTREE_PATH"
```

### Step 3: Confirm Completion

```bash
echo ""
echo "[OK] Worktree removed successfully: $BRANCH_ARG"
echo ""
echo "The following resources were cleaned up:"
echo "  - Docker Compose services (containers, volumes, networks)"
echo "  - Git worktree directory"
echo "  - State file"
```

## Related Commands

- `/up` - Start development environment
- `./tools/worktree/spawn.sh` - Create a new worktree
- `./tools/worktree/cleanup.sh` - Manual cleanup with options
- `./tools/worktree/list.sh` - List all worktrees

## Notes

- This command uses the existing `cleanup.sh` script which handles:
  - Stopping Docker Compose services
  - Removing containers, volumes, and networks
  - Removing the git worktree
  - Cleaning up state files
- The `--force` flag is used to skip interactive confirmation
- You cannot remove the main repository or the worktree you're currently in
