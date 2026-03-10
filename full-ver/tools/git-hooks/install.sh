#!/usr/bin/env bash
# tools/git-hooks/install.sh
# Git hooks をインストールするスクリプト

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
HOOKS_SOURCE="${REPO_ROOT}/.git-hooks"
HOOKS_TARGET="${REPO_ROOT}/.git/hooks"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }

echo "Installing Git hooks..."

# Ensure hooks directory exists
mkdir -p "${HOOKS_TARGET}"

# Install each hook
for hook in "${HOOKS_SOURCE}"/*; do
    if [[ -f "$hook" ]]; then
        hook_name=$(basename "$hook")
        target="${HOOKS_TARGET}/${hook_name}"
        
        cp "$hook" "$target"
        chmod +x "$target"
        log_success "Installed: ${hook_name}"
    fi
done

echo ""
log_success "Git hooks installation complete!"
echo ""
echo "Installed hooks:"
echo "  - pre-commit: Blocks commits to protected branches"
echo "  - pre-push: Blocks pushes to protected branches"
