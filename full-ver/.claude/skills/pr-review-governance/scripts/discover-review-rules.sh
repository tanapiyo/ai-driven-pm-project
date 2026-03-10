#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"
cd "${ROOT_DIR}"

collect_files() {
  if command -v rg >/dev/null 2>&1; then
    {
      [[ -f AGENTS.md ]] && echo "AGENTS.md"
      rg --files docs .github .specify tools .claude/skills projects/packages/guardrails projects/packages/api-contract projects/apps/api/src/generated/oas 2>/dev/null || true
    } | sed 's#^\./##' | sort -u
    return
  fi

  {
    [[ -f AGENTS.md ]] && echo "AGENTS.md"
    find docs .github .specify tools .claude/skills projects/packages/guardrails projects/packages/api-contract projects/apps/api/src/generated/oas -type f 2>/dev/null || true
  } | sed 's#^\./##' | sort -u
}

print_section() {
  local title="$1"
  local regex="$2"
  local matches

  matches="$(printf '%s\n' "${ALL_FILES}" | grep -E "${regex}" || true)"

  printf '## %s\n' "${title}"
  if [[ -z "${matches}" ]]; then
    printf -- '- (none)\n\n'
    return
  fi

  while IFS= read -r path; do
    [[ -n "${path}" ]] && printf -- '- `%s`\n' "${path}"
  done <<< "${matches}"
  printf '\n'
}

ALL_FILES="$(collect_files)"

printf '# PR Review Rule Discovery\n\n'
printf 'Generated from current repository state. Use as review evidence links.\n\n'

print_section "Canonical Contract and Process" '^AGENTS\.md$|^docs/00_process/.*\.md$'
print_section "PR Governance and CI Policy" '^\.github/(pull_request_template\.md|PULL_REQUEST_TEMPLATE/.*\.md|workflows/(ci|policy)\.yml)$|^tools/policy/.*\.sh$'
print_section "Product Requirements and Acceptance" '^docs/01_product/.*\.md$|^docs/03_quality/.*\.md$|^\.specify/(templates|scripts)/.*$'
print_section "Architecture and API Contract" '^docs/02_architecture/.*\.(md|yaml|yml)$|^projects/packages/api-contract/openapi\.yaml$|^projects/apps/api/src/generated/oas/.*$'
print_section "Guardrails and Rule Skills" '^projects/packages/guardrails/.*\.ts$|^\.claude/skills/(repo-conventions|quality-gates|ddd-clean-architecture|fsd-frontend|security-baseline)/SKILL\.md$'
print_section "Contract Execution and Environment" '^tools/contract$|^tools/_contract/.*|^tools/worktree/.*'

printf '_Generated at %s (UTC)_\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
