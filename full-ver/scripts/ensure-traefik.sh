#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_NAME="traefik-public"

find_infra_dir() {
    local check_dir="$(dirname "$SCRIPT_DIR")"
    if [[ -d "$check_dir/infra" ]]; then
        echo "$check_dir/infra"
        return 0
    fi
    if [[ -f "$check_dir/.git" ]]; then
        local git_common_dir=$(git -C "$check_dir" rev-parse --git-common-dir 2>/dev/null)
        local repo_root=$(dirname "$git_common_dir")
        if [[ -d "$repo_root/infra" ]]; then
            echo "$repo_root/infra"
            return 0
        fi
    fi
    echo ""
    return 1
}

if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
    echo "📡 Creating network: $NETWORK_NAME"
    docker network create "$NETWORK_NAME"
fi

if docker ps --format '{{.Names}}' | grep -q '^traefik$'; then
    echo "✅ Traefik already running"
else
    echo "🔄 Starting Traefik..."
    INFRA_DIR=$(find_infra_dir)
    if [[ -z "$INFRA_DIR" ]]; then
        echo "❌ Cannot find infra directory"
        exit 1
    fi
    cd "$INFRA_DIR"
    docker compose -f docker-compose.traefik.yml up -d
    echo "✅ Traefik started (Dashboard: http://localhost:8080)"
fi
