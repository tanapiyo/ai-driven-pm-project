#!/bin/bash
# ==============================================================================
# init-claude-auth.sh - Transfer Claude Code & Codex CLI auth to DevContainer
#
# Runs on HOST before container start (initializeCommand).
# Writes environment variables to .devcontainer/.env.devcontainer and
# copies Codex CLI auth.json for container-side setup.
#
# Claude Code Auth Strategy:
#   1. Check if CLAUDE_CODE_OAUTH_TOKEN is already in .env.devcontainer
#   2. Try ~/.claude/.credentials.json (Linux/file-based auth)
#   3. If not found, warn user to run `claude setup-token` manually
#
#   On macOS, credentials are in Electron Safe Storage (Keychain) and
#   cannot be extracted from shell. Users must run:
#     claude setup-token
#   Then add the output to .devcontainer/.env.devcontainer:
#     CLAUDE_CODE_OAUTH_TOKEN=<token>
#
# Codex CLI Auth:
#   Copies ~/.codex/auth.json to .devcontainer/.codex-auth.json
#
# Both are optional — missing auth produces a warning, not an error.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/.env.devcontainer"

# Ensure env file exists (init-gh-token.sh may or may not have run yet)
touch "$ENV_FILE"

# ==============================================================================
# 1. Claude Code OAuth Token
# ==============================================================================
CLAUDE_CREDENTIALS="${HOME}/.claude/.credentials.json"

# Check if token is already configured in .env.devcontainer
if grep -q "^CLAUDE_CODE_OAUTH_TOKEN=." "$ENV_FILE" 2>/dev/null; then
    echo "[init-claude-auth] Claude Code: OAuth token already configured in .env.devcontainer"
elif [ -f "$CLAUDE_CREDENTIALS" ]; then
    # File-based auth (Linux or explicit credentials file)
    CLAUDE_TOKEN=$(python3 -c "
import json, sys
try:
    with open(sys.argv[1]) as f:
        data = json.load(f)
    token = data.get('claudeAiOauth', {}).get('accessToken', '')
    if token:
        print(token, end='')
    else:
        sys.exit(1)
except Exception:
    sys.exit(1)
" "$CLAUDE_CREDENTIALS" 2>/dev/null) || true

    if [ -n "${CLAUDE_TOKEN:-}" ]; then
        echo "CLAUDE_CODE_OAUTH_TOKEN=${CLAUDE_TOKEN}" >> "$ENV_FILE"
        echo "[init-claude-auth] Claude Code: OAuth token extracted from credentials file"
    else
        echo "[init-claude-auth] WARNING: Claude Code credentials file found but token extraction failed"
    fi
else
    # macOS: credentials are in Electron Safe Storage (Keychain), not extractable
    echo "[init-claude-auth] WARNING: Claude Code OAuth token not configured"
    echo "[init-claude-auth]   To set up:"
    echo "[init-claude-auth]   1. Run: claude setup-token"
    echo "[init-claude-auth]   2. Add to .devcontainer/.env.devcontainer:"
    echo "[init-claude-auth]      CLAUDE_CODE_OAUTH_TOKEN=<token>"
fi

# ==============================================================================
# 2. Codex CLI Auth Transfer
# ==============================================================================
CODEX_AUTH="${HOME}/.codex/auth.json"
CODEX_AUTH_DEST="${SCRIPT_DIR}/.codex-auth.json"

if [ -f "$CODEX_AUTH" ]; then
    cp "$CODEX_AUTH" "$CODEX_AUTH_DEST"
    chmod 600 "$CODEX_AUTH_DEST"
    echo "[init-claude-auth] Codex CLI: auth.json copied"
else
    # Clean up stale copy if Codex is no longer authenticated
    rm -f "$CODEX_AUTH_DEST"
    echo "[init-claude-auth] WARNING: Codex CLI not authenticated (~/.codex/auth.json not found)"
    echo "[init-claude-auth]   Run 'codex login' on host to authenticate"
fi

echo "[init-claude-auth] Done"
