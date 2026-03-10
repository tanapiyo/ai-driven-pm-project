#!/usr/bin/env bash
# ==============================================================================
# check_pr_contract.sh - DocDD Policy Check
#
# Validates that required documentation artifacts exist in the repository.
# This is a minimal check to ensure DocDD compliance.
#
# Exit Codes:
#   0 - All required artifacts exist
#   2 - Missing required artifacts
# ==============================================================================
set -euo pipefail

echo "=============================================="
echo "DocDD Policy Check"
echo "=============================================="
echo ""

# Required artifacts for DocDD compliance
required_files=(
  "AGENTS.md"
  "docs/00_process/process.md"
  "docs/00_process/git_and_pr_governance.md"
  "docs/01_product/identity.md"
  "docs/01_product/prd.md"
  "docs/03_quality/template_acceptance_criteria.md"
  "docs/04_delivery/release_process.md"
)

# Required directories
required_dirs=(
  "docs/02_architecture/adr"
)

missing=0

echo "Checking required files..."
for file in "${required_files[@]}"; do
  if [[ -f "${file}" ]]; then
    echo "  ✓ ${file}"
  else
    echo "  ✗ ${file} (MISSING)"
    missing=1
  fi
done

echo ""
echo "Checking required directories..."
for dir in "${required_dirs[@]}"; do
  if [[ -d "${dir}" ]]; then
    echo "  ✓ ${dir}/"
  else
    echo "  ✗ ${dir}/ (MISSING)"
    missing=1
  fi
done

echo ""
echo "Checking Issue template frontend fields..."
for template in ".github/ISSUE_TEMPLATE/feature_request.yml" ".github/ISSUE_TEMPLATE/task.yml"; do
  if [[ -f "${template}" ]]; then
    for field in "screen-id" "acceptance-criteria-gwt" "ui-state-perspectives"; do
      if grep -q "id: ${field}" "${template}"; then
        echo "  ✓ ${template}: ${field}"
      else
        echo "  ✗ ${template}: ${field} (MISSING)"
        missing=1
      fi
    done
  fi
done

echo ""
echo "Checking PR template AC verification..."
pr_template=".github/pull_request_template.md"
if [[ -f "${pr_template}" ]]; then
  if grep -q "AC Verification" "${pr_template}"; then
    echo "  ✓ ${pr_template}: AC Verification section"
  else
    echo "  ✗ ${pr_template}: AC Verification section (MISSING)"
    missing=1
  fi
fi

echo ""

if [[ "${missing}" -ne 0 ]]; then
  echo "=============================================="
  echo "DocDD Policy FAILED"
  echo "=============================================="
  echo ""
  echo "Missing required artifacts. Please ensure all DocDD documents exist."
  echo "See: docs/00_process/process.md for details."
  exit 2
fi

echo "=============================================="
echo "DocDD Policy OK"
echo "=============================================="
