#!/bin/bash
# Check DocDD minimum requirements



SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

echo "=== DocDD Minimum Requirements Check ==="
echo ""

# Required files
REQUIRED_FILES=(
    "AGENTS.md"
    "docs/00_process/process.md"
    "docs/01_product/identity.md"
    "docs/01_product/prd.md"
)

# Required directories
REQUIRED_DIRS=(
    "docs/00_process"
    "docs/01_product"
    "docs/02_architecture/adr"
    "docs/03_quality"
    "docs/04_delivery"
    ".github/PULL_REQUEST_TEMPLATE"
    "tools/contract"
    "tools/policy"
)

# Optional but recommended
RECOMMENDED_FILES=(
    "CLAUDE.md"
    ".github/copilot-instructions.md"
    "docs/00_process/agent_operating_model.md"
    "docs/00_process/skills_catalog.md"
)

echo "Checking required files..."
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "${REPO_ROOT}/${file}" ]; then
        echo -e "${GREEN}✓${NC} ${file}"
    else
        echo -e "${RED}✗${NC} ${file} not found"
        errors=$((errors + 1))
    fi
done

echo ""
echo "Checking required directories..."
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "${REPO_ROOT}/${dir}" ]; then
        echo -e "${GREEN}✓${NC} ${dir}/"
    else
        echo -e "${RED}✗${NC} ${dir}/ not found"
        errors=$((errors + 1))
    fi
done

echo ""
echo "Checking recommended files..."
for file in "${RECOMMENDED_FILES[@]}"; do
    if [ -f "${REPO_ROOT}/${file}" ]; then
        echo -e "${GREEN}✓${NC} ${file}"
    else
        echo -e "${YELLOW}⚠${NC} ${file} not found (recommended)"
        warnings=$((warnings + 1))
    fi
done

echo ""
echo "Checking Spec/Plan template locations..."

# Check for .specify directory or template
if [ -d "${REPO_ROOT}/.specify" ]; then
    echo -e "${GREEN}✓${NC} .specify/ directory exists"

    if [ -d "${REPO_ROOT}/.specify/specs" ]; then
        echo -e "${GREEN}✓${NC} .specify/specs/ directory exists"
    else
        echo -e "${YELLOW}⚠${NC} .specify/specs/ directory not found"
        warnings=$((warnings + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} .specify/ directory not found (create for feature specs)"
    warnings=$((warnings + 1))
fi

echo ""
echo "Checking PR template..."
PR_TEMPLATE_DIR="${REPO_ROOT}/.github/PULL_REQUEST_TEMPLATE"
if [ -d "${PR_TEMPLATE_DIR}" ]; then
    template_count=$(find "${PR_TEMPLATE_DIR}" -name "*.md" | wc -l)
    if [ "$template_count" -ge 1 ]; then
        echo -e "${GREEN}✓${NC} Found ${template_count} PR template(s)"
    else
        echo -e "${YELLOW}⚠${NC} No PR templates found in PULL_REQUEST_TEMPLATE/"
        warnings=$((warnings + 1))
    fi
fi

# Also check for single PR template
if [ -f "${REPO_ROOT}/.github/pull_request_template.md" ]; then
    echo -e "${GREEN}✓${NC} .github/pull_request_template.md exists"
fi

echo ""
echo "Checking tools/contract..."
CONTRACT_SCRIPT="${REPO_ROOT}/tools/contract"
if [ -f "${CONTRACT_SCRIPT}" ]; then
    if [ -x "${CONTRACT_SCRIPT}" ]; then
        echo -e "${GREEN}✓${NC} tools/contract is executable"
    else
        echo -e "${YELLOW}⚠${NC} tools/contract exists but is not executable"
        warnings=$((warnings + 1))
    fi
else
    echo -e "${RED}✗${NC} tools/contract not found"
    errors=$((errors + 1))
fi

echo ""
echo "Checking ADR presence..."
ADR_DIR="${REPO_ROOT}/docs/02_architecture/adr"
if [ -d "${ADR_DIR}" ]; then
    adr_count=$(find "${ADR_DIR}" -name "*.md" | wc -l)
    if [ "$adr_count" -ge 1 ]; then
        echo -e "${GREEN}✓${NC} Found ${adr_count} ADR(s)"
    else
        echo -e "${YELLOW}⚠${NC} No ADRs found (add ADRs for architecture decisions)"
        warnings=$((warnings + 1))
    fi
fi

# Summary
echo ""
echo "=== Summary ==="
echo "Errors: ${errors}"
echo "Warnings: ${warnings}"

if [ "$errors" -gt 0 ]; then
    echo -e "${RED}FAILED${NC}: DocDD minimum requirements not met"
    exit 1
else
    if [ "$warnings" -gt 0 ]; then
        echo -e "${YELLOW}PASSED with warnings${NC}"
    else
        echo -e "${GREEN}PASSED${NC}"
    fi
    exit 0
fi
