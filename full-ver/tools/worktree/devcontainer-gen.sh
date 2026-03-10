#!/usr/bin/env bash
# tools/worktree/devcontainer-gen.sh
# Generate DevContainer configuration for worktree
#
# Creates a worktree-specific devcontainer.json with:
# - Unique container name based on worktree ID
# - Allocated port range
# - Agent-specific extensions
# - Isolated volumes
#
# Usage:
#   ./tools/worktree/devcontainer-gen.sh <worktree-path> <agent> <worktree-id> <port-base>

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[OK]${NC} $*"; }

show_usage() {
    cat << EOF
Usage: $(basename "$0") <worktree-path> <agent> <worktree-id> <port-base>

Arguments:
  worktree-path   Path to the worktree
  agent           Agent type (pdm, architect, designer, implementer, qa, reviewer)
  worktree-id     Unique worktree identifier
  port-base       Base port for the worktree (e.g., 3100)

Example:
  $(basename "$0") ../my-repo-feat-auth implementer 1 3100
EOF
}

# Get extensions for agent
get_agent_extensions() {
    local agent="$1"

    # Common extensions
    local common=(
        '"anthropic.claude-code"'
        '"eamodio.gitlens"'
        '"EditorConfig.EditorConfig"'
        '"streetsidesoftware.code-spell-checker"'
    )

    # Agent-specific extensions
    local specific=()
    case "$agent" in
        pdm|architect)
            specific+=('"yzhang.markdown-all-in-one"')
            specific+=('"bierner.markdown-mermaid"')
            ;;
        designer)
            specific+=('"yzhang.markdown-all-in-one"')
            ;;
        implementer)
            # Will be augmented based on stack
            ;;
        qa)
            specific+=('"hbenl.vscode-test-explorer"')
            ;;
        reviewer)
            specific+=('"GitHub.vscode-pull-request-github"')
            ;;
    esac

    # Combine
    local all_extensions=("${common[@]}" "${specific[@]}")
    local result=""
    for ext in "${all_extensions[@]}"; do
        if [[ -n "$result" ]]; then
            result="${result},"$'\n'"        ${ext}"
        else
            result="${ext}"
        fi
    done
    echo "$result"
}

# Main
main() {
    if [[ $# -lt 4 ]]; then
        show_usage
        exit 1
    fi

    local worktree_path="$1"
    local agent="$2"
    local worktree_id="$3"
    local port_base="$4"

    log_info "Generating DevContainer config for worktree..."
    log_info "  Path: $worktree_path"
    log_info "  Agent: $agent"
    log_info "  ID: $worktree_id"
    log_info "  Ports: ${port_base}-$((port_base + 99))"

    # Create .devcontainer directory
    local devcontainer_dir="${worktree_path}/.devcontainer"
    mkdir -p "$devcontainer_dir"

    # Copy base files from main repo
    if [[ -f "${REPO_ROOT}/.devcontainer/Dockerfile" ]]; then
        cp "${REPO_ROOT}/.devcontainer/Dockerfile" "$devcontainer_dir/"
    fi
    if [[ -f "${REPO_ROOT}/.devcontainer/init-firewall.sh" ]]; then
        cp "${REPO_ROOT}/.devcontainer/init-firewall.sh" "$devcontainer_dir/"
    fi
    if [[ -f "${REPO_ROOT}/.devcontainer/init-gh-token.sh" ]]; then
        cp "${REPO_ROOT}/.devcontainer/init-gh-token.sh" "$devcontainer_dir/"
    fi
    if [[ -f "${REPO_ROOT}/.devcontainer/allowlist.domains" ]]; then
        cp "${REPO_ROOT}/.devcontainer/allowlist.domains" "$devcontainer_dir/"
    fi
    if [[ -f "${REPO_ROOT}/.devcontainer/.env.devcontainer" ]]; then
        cp "${REPO_ROOT}/.devcontainer/.env.devcontainer" "$devcontainer_dir/"
    fi

    # Get extensions
    local extensions
    extensions=$(get_agent_extensions "$agent")

    # Generate devcontainer.json
    local container_name="worktree-${worktree_id}-${agent}"

    cat > "${devcontainer_dir}/devcontainer.json" << EOF
{
  "name": "Worktree ${worktree_id} - ${agent}",
  "build": {
    "dockerfile": "Dockerfile",
    "args": {
      "TZ": "\${localEnv:TZ:Asia/Tokyo}",
      "CLAUDE_CODE_VERSION": "latest",
      "GIT_DELTA_VERSION": "0.18.2",
      "ZSH_IN_DOCKER_VERSION": "1.2.0"
    }
  },
  "features": {
    "ghcr.io/devcontainers/features/common-utils:2": {
      "installZsh": false,
      "configureZshAsDefaultShell": false,
      "username": "node",
      "userUid": "1000",
      "userGid": "1000"
    },
    "ghcr.io/devcontainers/features/git:1": {
      "version": "latest",
      "ppa": false
    },
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "initializeCommand": ".devcontainer/init-gh-token.sh",
  "runArgs": [
    "--cap-add=NET_ADMIN",
    "--cap-add=NET_RAW",
    "--env-file",
    ".devcontainer/.env.devcontainer",
    "--name",
    "${container_name}",
    "--label",
    "worktree.id=${worktree_id}",
    "--label",
    "worktree.agent=${agent}",
    "--label",
    "devcontainer.local_folder=${worktree_path}"
  ],
  "appPort": [
    "${port_base}:${port_base}",
    "$((port_base + 1)):$((port_base + 1))",
    "$((port_base + 2)):$((port_base + 2))",
    "$((port_base + 3)):$((port_base + 3))",
    "$((port_base + 4)):$((port_base + 4))"
  ],
  "customizations": {
    "vscode": {
      "extensions": [
        ${extensions}
      ],
      "settings": {
        "terminal.integrated.defaultProfile.linux": "zsh",
        "terminal.integrated.profiles.linux": {
          "bash": {
            "path": "bash",
            "icon": "terminal-bash"
          },
          "zsh": {
            "path": "zsh"
          }
        }
      }
    }
  },
  "remoteUser": "node",
  "mounts": [
    "source=worktree-${worktree_id}-bashhistory,target=/commandhistory,type=volume",
    "source=worktree-${worktree_id}-claude-config,target=/home/node/.claude,type=volume",
    "source=\${localEnv:SSH_AUTH_SOCK},target=/ssh-agent,type=bind"
  ],
  "containerEnv": {
    "CLAUDE_CONFIG_DIR": "/home/node/.claude",
    "DEVCONTAINER_FIREWALL_MODE": "strict",
    "POWERLEVEL9K_DISABLE_GITSTATUS": "true",
    "SSH_AUTH_SOCK": "/ssh-agent",
    "WORKTREE_ID": "${worktree_id}",
    "WORKTREE_AGENT": "${agent}",
    "WORKTREE_PORT_BASE": "${port_base}"
  },
  "workspaceMount": "source=${worktree_path},target=/workspace,type=bind,consistency=delegated",
  "workspaceFolder": "/workspace",
  "postStartCommand": "sudo /usr/local/bin/init-firewall.sh && gh auth setup-git",
  "waitFor": "postStartCommand"
}
EOF

    log_success "DevContainer config created: ${devcontainer_dir}/devcontainer.json"
    echo ""
    echo "To start the DevContainer:"
    echo "  code ${worktree_path}"
    echo "  # Then: Reopen in Container"
    echo ""
    echo "Or via CLI:"
    echo "  devcontainer up --workspace-folder ${worktree_path}"
}

main "$@"
