#!/bin/bash
# Check instruction consistency across AGENTS.md, CLAUDE.md, and copilot-instructions.md

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

echo "=== Instruction Consistency Check ==="
echo ""

# Check 1: AGENTS.md exists and is canonical
echo "Checking AGENTS.md..."
if [ -f "${REPO_ROOT}/AGENTS.md" ]; then
    if grep -q "Canonical\|canonical\|正史\|唯一の正" "${REPO_ROOT}/AGENTS.md"; then
        echo -e "${GREEN}✓${NC} AGENTS.md exists and declares canonical status"
    else
        echo -e "${YELLOW}⚠${NC} AGENTS.md exists but may not declare canonical status"
        warnings=$((warnings + 1))
    fi
else
    echo -e "${RED}✗${NC} AGENTS.md not found"
    errors=$((errors + 1))
fi

# Check 2: CLAUDE.md references AGENTS.md
echo "Checking CLAUDE.md..."
if [ -f "${REPO_ROOT}/CLAUDE.md" ]; then
    if grep -q "AGENTS.md" "${REPO_ROOT}/CLAUDE.md"; then
        echo -e "${GREEN}✓${NC} CLAUDE.md references AGENTS.md"
    else
        echo -e "${RED}✗${NC} CLAUDE.md does not reference AGENTS.md"
        errors=$((errors + 1))
    fi
else
    echo -e "${RED}✗${NC} CLAUDE.md not found"
    errors=$((errors + 1))
fi

# Check 3: copilot-instructions.md references AGENTS.md
echo "Checking .github/copilot-instructions.md..."
if [ -f "${REPO_ROOT}/.github/copilot-instructions.md" ]; then
    if grep -q "AGENTS.md" "${REPO_ROOT}/.github/copilot-instructions.md"; then
        echo -e "${GREEN}✓${NC} copilot-instructions.md references AGENTS.md"
    else
        echo -e "${RED}✗${NC} copilot-instructions.md does not reference AGENTS.md"
        errors=$((errors + 1))
    fi
else
    echo -e "${RED}✗${NC} .github/copilot-instructions.md not found"
    errors=$((errors + 1))
fi

# Check 4: Golden Commands consistency
echo "Checking Golden Commands consistency..."
GOLDEN_COMMANDS=("format" "lint" "typecheck" "test" "build" "e2e" "migrate" "deploy-dryrun")

agents_commands=0
claude_commands=0
copilot_commands=0

for cmd in "${GOLDEN_COMMANDS[@]}"; do
    if [ -f "${REPO_ROOT}/AGENTS.md" ] && grep -q "./tools/contract ${cmd}" "${REPO_ROOT}/AGENTS.md"; then
        agents_commands=$((agents_commands + 1))
    fi
done

for cmd in "${GOLDEN_COMMANDS[@]}"; do
    if [ -f "${REPO_ROOT}/CLAUDE.md" ] && grep -q "./tools/contract ${cmd}" "${REPO_ROOT}/CLAUDE.md"; then
        claude_commands=$((claude_commands + 1))
    fi
done

for cmd in "${GOLDEN_COMMANDS[@]}"; do
    if [ -f "${REPO_ROOT}/.github/copilot-instructions.md" ] && grep -q "./tools/contract ${cmd}" "${REPO_ROOT}/.github/copilot-instructions.md"; then
        copilot_commands=$((copilot_commands + 1))
    fi
done

echo "  AGENTS.md: ${agents_commands}/${#GOLDEN_COMMANDS[@]} commands"
echo "  CLAUDE.md: ${claude_commands}/${#GOLDEN_COMMANDS[@]} commands"
echo "  copilot-instructions.md: ${copilot_commands}/${#GOLDEN_COMMANDS[@]} commands"

if [ "$agents_commands" -ge 5 ]; then
    echo -e "${GREEN}✓${NC} AGENTS.md has sufficient Golden Commands"
else
    echo -e "${RED}✗${NC} AGENTS.md missing Golden Commands"
    errors=$((errors + 1))
fi

# Check 5: Path-specific instructions exist
echo "Checking path-specific instructions..."
INSTRUCTIONS_DIR="${REPO_ROOT}/.github/instructions"
if [ -d "${INSTRUCTIONS_DIR}" ]; then
    instruction_count=$(find "${INSTRUCTIONS_DIR}" -name "*.instructions.md" | wc -l)
    if [ "$instruction_count" -ge 1 ]; then
        echo -e "${GREEN}✓${NC} Found ${instruction_count} path-specific instruction files"
    else
        echo -e "${YELLOW}⚠${NC} No path-specific instructions found"
        warnings=$((warnings + 1))
    fi

    # Check applyTo in each instruction file
    for file in "${INSTRUCTIONS_DIR}"/*.instructions.md; do
        if [ -f "$file" ]; then
            if grep -q "^---" "$file" && grep -q "applyTo:" "$file"; then
                echo -e "  ${GREEN}✓${NC} $(basename "$file") has applyTo"
            else
                echo -e "  ${YELLOW}⚠${NC} $(basename "$file") missing applyTo frontmatter"
                warnings=$((warnings + 1))
            fi
        fi
    done
else
    echo -e "${YELLOW}⚠${NC} .github/instructions directory not found"
    warnings=$((warnings + 1))
fi

# Summary
echo ""
echo "=== Summary ==="
echo "Errors: ${errors}"
echo "Warnings: ${warnings}"

if [ "$errors" -gt 0 ]; then
    echo -e "${RED}FAILED${NC}: Instruction consistency check failed"
    exit 1
else
    if [ "$warnings" -gt 0 ]; then
        echo -e "${YELLOW}PASSED with warnings${NC}"
    else
        echo -e "${GREEN}PASSED${NC}"
    fi
    exit 0
fi
