---
description: Audit dependencies for vulnerabilities and updates
allowed-tools: Bash, Read, Grep, Task
---

# Dependency Audit

Comprehensive dependency security and health check.

## Instructions

### Step 1: Run Audit Commands

Execute these commands (can run in parallel):

```bash
# Check for known vulnerabilities
./tools/contract audit --json 2>/dev/null || ./tools/contract audit

# List outdated packages
./tools/contract outdated

# Check lock file integrity (read-only, blocked by pre-bash.sh on host)
# Run inside DevContainer if needed: devcontainer exec pnpm install --frozen-lockfile --dry-run
```

### Step 2: Security Scan (parallel)

Launch security-auditor agent:
- Prompt: "Scan dependencies for: supply chain risks, typosquatting, deprecated packages, known malicious packages."

### Step 3: Generate Report

```markdown
## Dependency Audit Report

### Vulnerabilities
| Severity | Package | CVE | Fix Available |
|----------|---------|-----|---------------|

### Outdated Packages
| Package | Current | Latest | Type |
|---------|---------|--------|------|

### Recommendations
1. **Critical** (fix immediately): ...
2. **High** (fix soon): ...
3. **Medium** (plan upgrade): ...
4. **Low** (informational): ...

### Unused Dependencies
- [ ] Package to remove: ...
```

## Review Points

1. **Critical CVEs**: Must fix before merge
2. **High CVEs**: Should fix within sprint
3. **Outdated majors**: Plan upgrade path (may have breaking changes)
4. **Unused deps**: Remove to reduce attack surface
5. **Deprecated deps**: Plan migration to alternatives
