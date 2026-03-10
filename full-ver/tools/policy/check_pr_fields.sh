#!/usr/bin/env bash
# ==============================================================================
# check_pr_fields.sh - PR Body Field Validation
#
# Validates that PR body contains required fields based on branch type.
# PR body and branch name are passed via environment variables.
#
# Environment Variables:
#   PR_BODY   - The PR body text
#   PR_BRANCH - The branch name (e.g., feat/task-issue-pr-404)
#
# Exit Codes:
#   0 - Validation passed
#   2 - Validation failed
# ==============================================================================
set -euo pipefail

echo "=============================================="
echo "PR Field Validation"
echo "=============================================="
echo ""

PR_BODY="${PR_BODY:-}"
PR_BRANCH="${PR_BRANCH:-}"

if [[ -z "${PR_BODY}" ]]; then
  echo "WARNING: PR_BODY not provided, skipping validation"
  exit 0
fi

issues=0

# Check 1: Closes # format
if printf '%s' "${PR_BODY}" | grep -qiE "(closes|fixes|resolves)\s+#[0-9]+"; then
  echo "✓ Issue link (Closes #xxx) found"
else
  echo "⚠️  WARNING: PR body missing 'Closes #xxx' format"
  # Warning only, not blocking (exception: hotfix)
fi

# Check 2: AC Verification section (for feat/fix branches)
if [[ "${PR_BRANCH}" =~ ^(feat|fix)/ ]]; then
  if printf '%s' "${PR_BODY}" | grep -q "AC Verification"; then
    echo "✓ AC Verification section found"
  else
    echo "✗ ERROR: feat/fix PR missing 'AC Verification' section"
    issues=1
  fi
fi

# Check 3: Screenshot section (if frontend impact)
if printf '%s' "${PR_BODY}" | grep -q "UI / フロントエンド"; then
  if printf '%s' "${PR_BODY}" | grep -qE "(スクリーンショット|Screenshot)"; then
    echo "✓ Screenshot section found"
  else
    echo "⚠️  WARNING: UI change detected but no screenshot section"
  fi
fi

echo ""

if [[ "${issues}" -ne 0 ]]; then
  echo "=============================================="
  echo "PR field validation FAILED"
  echo "=============================================="
  exit 2
fi

echo "=============================================="
echo "PR field validation OK"
echo "=============================================="
