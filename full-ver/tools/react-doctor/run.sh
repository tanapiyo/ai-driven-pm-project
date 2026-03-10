#!/usr/bin/env bash
# react-doctor QA gate — Docker-based React code health check
#
# Detects frontend changes and, when present, runs react-doctor in a Docker
# container so the host environment remains clean.
#
# Usage:
#   ./tools/react-doctor/run.sh [options]
#
# Options:
#   --base <ref>      Git base ref for change detection (default: HEAD~1 or PR base)
#   --all             Skip change detection and always run react-doctor
#   --verbose         Pass --verbose to react-doctor (per-file details)
#   --build           Force rebuild of the Docker image before running
#   --help            Show this message
#
# Environment variables:
#   REACT_DOCTOR_IMAGE   Docker image name (default: react-doctor-runner:local)
#   REACT_DOCTOR_BASE    Git base ref for change detection (overridden by --base flag)
#
# Exit codes:
#   0  react-doctor passed (or no frontend changes detected)
#   1  react-doctor reported issues
#   2  configuration/environment error

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
WEB_SRC="${REPO_ROOT}/projects/apps/web"
DOCKER_IMAGE="${REACT_DOCTOR_IMAGE:-react-doctor-runner:local}"
DOCKERFILE="${SCRIPT_DIR}/Dockerfile"

# Frontend file patterns for change detection (relative to REPO_ROOT)
FRONTEND_PATHS=(
  "projects/apps/web/src"
)
FRONTEND_EXTENSIONS=("tsx" "ts" "jsx" "js")

# ── Argument parsing ─────────────────────────────────────────────────────────

BASE_REF="${REACT_DOCTOR_BASE:-}"
RUN_ALL=false
VERBOSE=false
FORCE_BUILD=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      BASE_REF="${2:?'--base requires a git ref (e.g. HEAD~1 or origin/main)'}"
      shift 2
      ;;
    --all)
      RUN_ALL=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --build)
      FORCE_BUILD=true
      shift
      ;;
    --help|-h)
      sed -n '2,/^set /p' "$0" | grep '^#' | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "ERROR: Unknown option: $1" >&2
      echo "Run './tools/react-doctor/run.sh --help' for usage." >&2
      exit 2
      ;;
  esac
done

# ── Helpers ──────────────────────────────────────────────────────────────────

log()  { echo "[react-doctor] $*"; }
warn() { echo "[react-doctor] WARNING: $*" >&2; }
fail() { echo "[react-doctor] ERROR: $*" >&2; exit 2; }

# ── Prerequisite checks ───────────────────────────────────────────────────────

if ! command -v docker &>/dev/null; then
  fail "Docker is not installed or not in PATH. Install Docker and try again."
fi

if ! docker info &>/dev/null 2>&1; then
  fail "Docker daemon is not running. Start Docker Desktop and try again."
fi

if [[ ! -d "${WEB_SRC}" ]]; then
  fail "Frontend source directory not found: ${WEB_SRC}"
fi

# ── Change detection ─────────────────────────────────────────────────────────

resolve_base_ref() {
  local ref="${1:-}"
  if [[ -z "${ref}" ]]; then
    # In CI (GitHub Actions PR), use the PR base SHA for a fixed comparison point
    if [[ -n "${GITHUB_BASE_REF:-}" && -n "${GITHUB_EVENT_PULL_REQUEST_BASE_SHA:-}" ]]; then
      ref="${GITHUB_EVENT_PULL_REQUEST_BASE_SHA}"
    elif [[ -n "${GITHUB_BASE_REF:-}" ]]; then
      ref="origin/${GITHUB_BASE_REF}"
    else
      ref="HEAD~1"
    fi
  fi
  echo "${ref}"
}

detect_frontend_changes() {
  local base_ref="${1:-}"
  base_ref="$(resolve_base_ref "${base_ref}")"

  log "Detecting frontend changes against: ${base_ref}"

  local changed_files=""
  for path in "${FRONTEND_PATHS[@]}"; do
    local files
    files=$(git -C "${REPO_ROOT}" diff --name-only "${base_ref}" -- "${path}" 2>/dev/null || true)
    if [[ -n "${files}" ]]; then
      # Filter by extension
      local filtered
      filtered=$(echo "${files}" | grep -E "\.(tsx|ts|jsx|js)$" || true)
      if [[ -n "${filtered}" ]]; then
        changed_files="${changed_files}${filtered}"$'\n'
      fi
    fi
  done

  echo "${changed_files}"
}

# ── Docker image management ───────────────────────────────────────────────────

ensure_image() {
  if ${FORCE_BUILD} || ! docker image inspect "${DOCKER_IMAGE}" &>/dev/null 2>&1; then
    log "Building Docker image: ${DOCKER_IMAGE}"
    docker build \
      --quiet \
      -t "${DOCKER_IMAGE}" \
      -f "${DOCKERFILE}" \
      "${SCRIPT_DIR}"
    log "Image built successfully."
  else
    log "Using existing Docker image: ${DOCKER_IMAGE}"
  fi
}

# ── react-doctor execution ────────────────────────────────────────────────────

run_react_doctor() {
  local scan_dir="${WEB_SRC}"
  local args=()

  # Verbose flag
  if ${VERBOSE}; then
    args+=("--verbose")
  fi

  # NOTE: react-doctor auto-detects react-doctor.config.json in the project root.
  # No --config flag exists; the file is picked up automatically when mounted at /app.
  #
  # NOTE: --diff [base] requires git access which is unavailable inside the container
  # (only source is mounted, not .git). Change detection is handled BEFORE this
  # function by detect_frontend_changes(), so react-doctor scans all mounted files.

  # NOTE: --offline disables react-doctor's external API call (calculateScore POST).
  # --network none enforces network isolation at the Docker layer (defense-in-depth).
  # npm packages are pre-installed in the image at build time, so network is not needed at runtime.
  args+=("--offline")

  log "Running react-doctor in Docker..."
  log "  Image:   ${DOCKER_IMAGE}"
  log "  Source:  ${scan_dir}"
  log "  Args:    ${args[*]+"${args[*]}"}"
  echo ""

  # TTY flag: only if stdin is a terminal
  local tty_flag=""
  if [[ -t 0 ]]; then
    tty_flag="-t"
  fi

  set +e
  docker run --rm \
    ${tty_flag:+$tty_flag} \
    --network none \
    -v "${scan_dir}:/app:ro" \
    --tmpfs /app/.next:ro \
    --tmpfs /app/node_modules:ro \
    -w /app \
    "${DOCKER_IMAGE}" \
    "${args[@]+"${args[@]}"}"
  local exit_code=$?
  set -e

  return ${exit_code}
}

# ── Main ──────────────────────────────────────────────────────────────────────

cd "${REPO_ROOT}"

# Step 1: Determine whether to run
# Resolve BASE_REF once so that change detection and react-doctor use the same ref
BASE_REF="$(resolve_base_ref "${BASE_REF}")"

if ! ${RUN_ALL}; then
  FRONTEND_CHANGES="$(detect_frontend_changes "${BASE_REF}")"

  if [[ -z "${FRONTEND_CHANGES// /}" ]]; then
    log "No frontend changes detected in projects/apps/web/src/. Skipping react-doctor."
    exit 0
  fi

  log "Frontend changes detected:"
  echo "${FRONTEND_CHANGES}" | sed 's/^/  /'
  echo ""
fi

# Step 2: Ensure Docker image is available
ensure_image

# Step 3: Run react-doctor
run_react_doctor
EXIT_CODE=$?

echo ""
if [[ ${EXIT_CODE} -eq 0 ]]; then
  log "react-doctor passed."
else
  log "react-doctor reported issues (exit code: ${EXIT_CODE})."
  log "Review the output above and fix the reported issues."
  log "To suppress specific rules, edit: projects/apps/web/react-doctor.config.json"
fi

exit ${EXIT_CODE}
