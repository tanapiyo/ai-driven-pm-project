#!/bin/bash
# ==============================================================================
# setup-ai-auth.sh - Configure Claude Code & Codex CLI auth inside DevContainer
#
# Runs INSIDE the container as postCreateCommand.
# Sets up config files needed for headless operation.
#
# Expects:
#   - CLAUDE_CODE_OAUTH_TOKEN env var (set via .env.devcontainer)
#   - /workspace/.devcontainer/.codex-auth.json (copied by init-claude-auth.sh)
# ==============================================================================
set -euo pipefail

# ==============================================================================
# 1. Claude Code - onboarding skip + config
# ==============================================================================
CLAUDE_CONFIG_DIR="${CLAUDE_CONFIG_DIR:-/home/node/.claude}"
CLAUDE_JSON="${CLAUDE_CONFIG_DIR}/.claude.json"

mkdir -p "$CLAUDE_CONFIG_DIR"

if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
    # Set hasCompletedOnboarding to skip interactive setup wizard
    if [ -f "$CLAUDE_JSON" ]; then
        if command -v jq &>/dev/null; then
            tmp=$(mktemp)
            jq '.hasCompletedOnboarding = true' "$CLAUDE_JSON" > "$tmp" && mv "$tmp" "$CLAUDE_JSON"
        else
            # Fallback: python3
            python3 -c "
import json
try:
    with open('${CLAUDE_JSON}') as f:
        data = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    data = {}
data['hasCompletedOnboarding'] = True
with open('${CLAUDE_JSON}', 'w') as f:
    json.dump(data, f, indent=2)
"
        fi
    else
        echo '{"hasCompletedOnboarding":true}' > "$CLAUDE_JSON"
    fi
    echo "[setup-ai-auth] Claude Code: onboarding skip configured"
    echo "[setup-ai-auth] Claude Code: CLAUDE_CODE_OAUTH_TOKEN is set"
else
    echo "[setup-ai-auth] WARNING: CLAUDE_CODE_OAUTH_TOKEN not set"
    echo "[setup-ai-auth]   Claude Code will require interactive login"
fi

# ==============================================================================
# 2. Codex CLI - auth.json transfer
# ==============================================================================
CODEX_AUTH_SRC="/workspace/.devcontainer/.codex-auth.json"
CODEX_CONFIG_DIR="${HOME}/.codex"
CODEX_AUTH_DEST="${CODEX_CONFIG_DIR}/auth.json"

if [ -f "$CODEX_AUTH_SRC" ]; then
    mkdir -p "$CODEX_CONFIG_DIR"
    cp "$CODEX_AUTH_SRC" "$CODEX_AUTH_DEST"
    chmod 600 "$CODEX_AUTH_DEST"
    echo "[setup-ai-auth] Codex CLI: auth.json installed to ${CODEX_AUTH_DEST}"
else
    echo "[setup-ai-auth] WARNING: Codex CLI auth not found"
    echo "[setup-ai-auth]   Run 'codex login' on host, then rebuild container"
fi

echo "[setup-ai-auth] Done"
