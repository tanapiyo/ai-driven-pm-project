#!/usr/bin/env bash
#
# DevContainer 実行コンテキスト判定・実行ヘルパー
#
# Usage:
#   source "$(dirname "${BASH_SOURCE[0]}")/lib/devcontainer-exec.sh"
#   devcontainer_exec "pnpm test"
#
set -euo pipefail

# DevContainer 内かどうかを判定
is_inside_devcontainer() {
  [[ -f "/.dockerenv" ]] || [[ -n "${REMOTE_CONTAINERS:-}" ]] || [[ -n "${DEVCONTAINER:-}" ]]
}

# Worktree 名を取得（ディレクトリ名から）
# ワークツリーとメインリポジトリを厳密に区別
get_worktree_name() {
  local repo_root="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

  # .git がファイル（worktree）かディレクトリ（メインリポジトリ）かで判定
  if [[ -f "${repo_root}/.git" ]]; then
    # Worktree: ディレクトリ名を使用
    basename "${repo_root}"
  else
    # メインリポジトリの場合、デバッグ情報を出力して警告
    # 本来 worktree 内でのみ実行されるべき
    echo "ERROR: Not in a worktree. Main repository execution is forbidden." >&2
    return 1
  fi
}

# リポジトリ名を取得
get_repo_name_for_docker() {
  local repo_root="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
  local repo_name

  # For worktrees, get repo name from parent
  if [[ -f "${repo_root}/.git" ]]; then
    local parent_repo
    parent_repo=$(cd "${repo_root}" && git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/.git$||' || echo "")
    if [[ -n "$parent_repo" ]]; then
      repo_name=$(basename "${parent_repo}")
    else
      repo_name=$(basename "${repo_root}")
    fi
  else
    repo_name=$(basename "${repo_root}")
  fi

  # Sanitize for Docker/DNS
  echo "$repo_name" | sed 's/[^a-zA-Z0-9\/-]/-/g' | sed 's/\//-/g' | tr '[:upper:]' '[:lower:]'
}

# Docker プロジェクト名を取得（一貫した命名）
# worktree 固有のプロジェクト名を生成
get_docker_project_name() {
  local repo_root="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
  local worktree_name

  # get_worktree_name が失敗した場合（main repo の場合）
  worktree_name=$(get_worktree_name "${repo_root}" 2>/dev/null) || {
    echo "ERROR: Cannot get docker project name outside worktree" >&2
    return 1
  }

  # worktree 名そのものをプロジェクト名として使用
  # これで worktree ごとに完全に隔離された環境が実現される
  echo "${worktree_name}"
}

# DevContainer が起動中か確認
is_devcontainer_running() {
  local repo_root="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

  # SAFETY CHECK: Only check for worktree containers
  if [[ -d "${repo_root}/.git" ]]; then
    return 1  # Main repo doesn't have running containers
  fi

  local docker_project_name
  docker_project_name="$(get_docker_project_name "${repo_root}")" || return 1
  local container_name="${docker_project_name}-dev"

  docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container_name}$"
}

# DevContainer を起動
# CRITICAL: worktree 内でのみ実行される
start_devcontainer() {
  local repo_root="${1:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"

  # SAFETY CHECK: Ensure we're in a worktree
  if [[ -d "${repo_root}/.git" ]]; then
    echo "ERROR: start_devcontainer must be run from a worktree directory." >&2
    return 1
  fi

  local worktree_name
  worktree_name="$(get_worktree_name "${repo_root}")" || return 1
  local docker_project_name
  docker_project_name="$(get_docker_project_name "${repo_root}")" || return 1

  echo "[INFO] Starting DevContainer (${docker_project_name})..."

  # Use contract up script to ensure consistent startup
  (cd "${repo_root}" && ./tools/contract up)

  # 起動確認（最大30秒待機）
  local max_wait=30
  local waited=0
  while ! is_devcontainer_running "${repo_root}"; do
    if [[ ${waited} -ge ${max_wait} ]]; then
      echo "ERROR: DevContainer startup timed out after ${max_wait} seconds." >&2
      return 1
    fi
    sleep 1
    ((waited++))
  done

  echo "[OK] DevContainer is ready."
}

# ホストパスをコンテナ内パスに変換
convert_to_container_path() {
  local host_path="$1"
  local repo_root
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

  # ホストパスがリポジトリ内のパスであれば /workspace に変換
  if [[ "${host_path}" == "${repo_root}"* ]]; then
    echo "/workspace${host_path#${repo_root}}"
  else
    echo "${host_path}"
  fi
}

# DevContainer 内でコマンドを実行
# 引数: 実行するコマンド（文字列または配列）
# CRITICAL: worktree 内でのみ実行される
devcontainer_exec() {
  local repo_root
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

  # SAFETY CHECK: Ensure we're in a worktree (not main repository)
  if [[ -d "${repo_root}/.git" ]]; then
    echo "ERROR: devcontainer_exec must be run from a worktree directory." >&2
    echo "" >&2
    echo "  You are currently in the main repository root, but contract commands" >&2
    echo "  must be executed from inside a worktree." >&2
    echo "" >&2
    echo "  To fix this, create a worktree first:" >&2
    echo "    ./tools/worktree/spawn.sh implementer --issue <N>" >&2
    echo "  Then navigate into the worktree and run the command again:" >&2
    echo "    cd ./worktrees/<branch-name>" >&2
    echo "    ./tools/contract <command>" >&2
    echo "" >&2
    echo "  See: docs/devcontainer.md#品質ゲートの実行手順" >&2
    echo "" >&2
    return 1
  fi

  # DevContainer 内なら直接実行
  if is_inside_devcontainer; then
    exec "$@"
  fi

  local docker_project_name
  docker_project_name="$(get_docker_project_name "${repo_root}")" || return 1
  local container_name="${docker_project_name}-dev"

  # Docker daemon accessibility check (catches docker.sock permission errors early)
  if ! docker info >/dev/null 2>&1; then
    local docker_err
    docker_err=$(docker info 2>&1 || true)
    if echo "${docker_err}" | grep -q "permission denied"; then
      echo "ERROR: Permission denied when connecting to Docker socket." >&2
      echo "" >&2
      echo "  Possible fixes:" >&2
      echo "    macOS: Ensure Docker Desktop is running. Restart Docker Desktop if needed." >&2
      echo "    Linux: Add your user to the docker group, then log out and back in:" >&2
      echo "      sudo usermod -aG docker \$USER" >&2
      echo "      newgrp docker  # or log out/log back in" >&2
      echo "    Verify with: docker info" >&2
      echo "" >&2
      echo "  See: docs/devcontainer.md#トラブルシューティング" >&2
      echo "" >&2
    else
      echo "ERROR: Docker daemon is not accessible." >&2
      echo "" >&2
      echo "  Ensure Docker Desktop (macOS/Windows) or the Docker daemon (Linux) is running." >&2
      echo "  Verify with: docker info" >&2
      echo "" >&2
      echo "  See: docs/devcontainer.md#トラブルシューティング" >&2
      echo "" >&2
    fi
    return 1
  fi

  # DevContainer が起動していなければ起動
  if ! is_devcontainer_running "${repo_root}"; then
    start_devcontainer "${repo_root}"
  fi

  # docker exec で実行
  # TTY が利用可能かどうかで -t フラグを切り替え
  local tty_flag=""
  if [[ -t 0 ]]; then
    tty_flag="-t"
  fi

  # 引数のパスを変換
  local converted_args=()
  for arg in "$@"; do
    converted_args+=("$(convert_to_container_path "${arg}")")
  done

  # コンテナ内で git が動作しないため、REPO_ROOT を環境変数として渡す
  # また、GIT_DIR を無効化してエラーを防ぐ
  docker exec -i ${tty_flag} \
    -e REPO_ROOT=/workspace \
    -e GIT_DIR="" \
    -e GIT_WORK_TREE="" \
    -w /workspace \
    "${container_name}" \
    "${converted_args[@]}"
}

# コマンドを DevContainer 内で実行するかどうかを判定して実行
# 使い方: run_in_context "pnpm" "test"
run_in_context() {
  devcontainer_exec "$@"
}
