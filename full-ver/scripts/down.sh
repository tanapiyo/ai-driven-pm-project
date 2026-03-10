#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

[[ -f .env ]] && source .env
WORKTREE="${WORKTREE:-$(basename "$ROOT_DIR")}"

echo "🛑 Stopping: $WORKTREE"
docker compose -p "$WORKTREE" -f docker-compose.worktree.yml down
echo "✅ Stopped"
