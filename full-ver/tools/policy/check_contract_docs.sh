#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

echo "Checking contract/docs alignment..."
echo ""

errors=0

# Check 1: If there are code changes, check for spec/adr updates
# This is a basic check - in practice you'd integrate with git diff

# Check 2: Verify all specs have required sections
if [[ -d ".specify/specs" ]]; then
  echo "Checking specs..."
  for spec in .specify/specs/*/spec.md; do
    if [[ -f "${spec}" ]]; then
      has_ac=$(grep -c "## Acceptance Criteria\|## AC" "${spec}" 2>/dev/null || echo "0")
      if [[ "${has_ac}" -eq 0 ]]; then
        echo "  ✗ ${spec}: Missing Acceptance Criteria section"
        errors=1
      else
        echo "  ✓ ${spec}"
      fi
    fi
  done
fi

# Check 3: Verify ADRs have required sections
if [[ -d "docs/02_architecture/adr" ]]; then
  echo ""
  echo "Checking ADRs..."
  for adr in docs/02_architecture/adr/*.md; do
    if [[ -f "${adr}" && "$(basename "${adr}")" != ".gitkeep" ]]; then
      has_status=$(grep -c "## Status\|Status:" "${adr}" 2>/dev/null || echo "0")
      has_context=$(grep -c "## Context" "${adr}" 2>/dev/null || echo "0")
      has_decision=$(grep -c "## Decision" "${adr}" 2>/dev/null || echo "0")
      
      if [[ "${has_status}" -eq 0 || "${has_context}" -eq 0 || "${has_decision}" -eq 0 ]]; then
        echo "  ✗ ${adr}: Missing required sections (Status/Context/Decision)"
        errors=1
      else
        echo "  ✓ ${adr}"
      fi
    fi
  done
fi

echo ""

if [[ "${errors}" -eq 1 ]]; then
  echo "ERROR: Contract/docs alignment issues found."
  exit 2
fi

echo "Contract/docs alignment OK."
