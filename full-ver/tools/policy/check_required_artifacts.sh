#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${REPO_ROOT}"

required=(
  "AGENTS.md"
  "docs/00_process/process.md"
  "docs/01_product/identity.md"
  "docs/01_product/prd.md"
  "docs/02_architecture/adr"
  "docs/03_quality/template_acceptance_criteria.md"
  "docs/04_delivery/release_process.md"
)

echo "Checking required artifacts..."
echo ""

missing=0
for p in "${required[@]}"; do
  if [[ ! -e "${p}" ]]; then
    echo "  ✗ MISSING: ${p}"
    missing=1
  else
    echo "  ✓ ${p}"
  fi
done

echo ""

if [[ "${missing}" -eq 1 ]]; then
  echo "ERROR: Required artifacts missing."
  echo "Please create the missing files before proceeding."
  exit 2
fi

echo "Policy OK - All required artifacts present."
