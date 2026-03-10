# ==============================================================================
# Makefile - DevContainer and Development Tools
# ==============================================================================

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_:-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

# ==============================================================================
# DevContainer Commands
# ==============================================================================

.PHONY: devcontainer\:doctor
devcontainer\:doctor: ## Run diagnostic checks for devcontainer environment
	@echo "=============================================="
	@echo "DevContainer Diagnostic Report"
	@echo "=============================================="
	@echo ""
	@echo "1. Required Tools"
	@echo "   ----------------"
	@command -v iptables >/dev/null 2>&1 && echo "   ✓ iptables: $$(iptables --version 2>/dev/null | head -1)" || echo "   ✗ iptables: NOT FOUND"
	@command -v ipset >/dev/null 2>&1 && echo "   ✓ ipset: $$(ipset --version 2>/dev/null | head -1)" || echo "   ✗ ipset: NOT FOUND"
	@command -v dig >/dev/null 2>&1 && echo "   ✓ dig: available" || echo "   ✗ dig: NOT FOUND (install dnsutils)"
	@command -v jq >/dev/null 2>&1 && echo "   ✓ jq: $$(jq --version 2>/dev/null)" || echo "   ✗ jq: NOT FOUND"
	@command -v aggregate >/dev/null 2>&1 && echo "   ✓ aggregate: available" || echo "   ✗ aggregate: NOT FOUND"
	@command -v gh >/dev/null 2>&1 && echo "   ✓ gh: $$(gh --version 2>/dev/null | head -1)" || echo "   ✗ gh: NOT FOUND"
	@command -v curl >/dev/null 2>&1 && echo "   ✓ curl: $$(curl --version 2>/dev/null | head -1)" || echo "   ✗ curl: NOT FOUND"
	@echo ""
	@echo "2. DNS Resolution"
	@echo "   ----------------"
	@dig +short api.github.com >/dev/null 2>&1 && echo "   ✓ DNS resolution working (api.github.com)" || echo "   ✗ DNS resolution FAILED"
	@echo ""
	@echo "3. GitHub API Access"
	@echo "   ----------------"
	@curl -s --connect-timeout 5 https://api.github.com/meta >/dev/null 2>&1 && echo "   ✓ GitHub Meta API accessible" || echo "   ✗ GitHub Meta API NOT accessible"
	@echo ""
	@echo "4. Environment"
	@echo "   ----------------"
	@echo "   DEVCONTAINER: $${DEVCONTAINER:-not set}"
	@echo "   DEVCONTAINER_FIREWALL_MODE: $${DEVCONTAINER_FIREWALL_MODE:-not set}"
	@echo "   CLAUDE_CONFIG_DIR: $${CLAUDE_CONFIG_DIR:-not set}"
	@echo ""
	@echo "5. File Permissions"
	@echo "   ----------------"
	@test -x /usr/local/bin/init-firewall.sh 2>/dev/null && echo "   ✓ init-firewall.sh is executable" || echo "   ✗ init-firewall.sh not found or not executable"
	@test -f /usr/local/etc/devcontainer/allowlist.domains 2>/dev/null && echo "   ✓ allowlist.domains exists" || echo "   ✗ allowlist.domains not found"
	@echo ""
	@echo "=============================================="

.PHONY: devcontainer\:firewall\:status
devcontainer\:firewall\:status: ## Show current firewall status and rules
	@echo "=============================================="
	@echo "Firewall Status"
	@echo "=============================================="
	@echo ""
	@echo "IPTables Rules (filter table):"
	@echo "------------------------------"
	@sudo iptables -L -n -v 2>/dev/null || echo "ERROR: Cannot read iptables (need sudo or not in container)"
	@echo ""
	@echo "IPSet (allowed-domains):"
	@echo "------------------------"
	@sudo ipset list allowed-domains 2>/dev/null || echo "IPSet 'allowed-domains' not found or cannot be read"
	@echo ""

.PHONY: devcontainer\:firewall\:logs
devcontainer\:firewall\:logs: ## Show recent blocked connections (requires logging setup)
	@echo "=============================================="
	@echo "Blocked Connection Attempts"
	@echo "=============================================="
	@echo ""
	@echo "Note: Standard setup uses REJECT (immediate feedback)."
	@echo "For logging, add: iptables -A OUTPUT -j LOG --log-prefix 'BLOCKED: '"
	@echo ""
	@echo "Checking kernel messages for network blocks..."
	@dmesg 2>/dev/null | grep -i "blocked\|reject\|drop" | tail -20 || echo "No kernel messages available (may need elevated permissions)"
	@echo ""

.PHONY: devcontainer\:firewall\:verify
devcontainer\:firewall\:verify: ## Verify firewall is working correctly
	@echo "=============================================="
	@echo "Firewall Verification"
	@echo "=============================================="
	@echo ""
	@echo "Test 1: Block check (example.com should fail)"
	@echo "---------------------------------------------"
	@if curl --connect-timeout 5 -s https://example.com >/dev/null 2>&1; then \
		echo "✗ FAIL: example.com is reachable (should be blocked)"; \
		exit 1; \
	else \
		echo "✓ PASS: example.com is blocked as expected"; \
	fi
	@echo ""
	@echo "Test 2: Allow check (api.github.com should succeed)"
	@echo "---------------------------------------------------"
	@if curl --connect-timeout 5 -s https://api.github.com/zen >/dev/null 2>&1; then \
		echo "✓ PASS: api.github.com is reachable"; \
	else \
		echo "✗ FAIL: api.github.com is NOT reachable (should be allowed)"; \
		exit 1; \
	fi
	@echo ""
	@echo "Test 3: Allow check (api.anthropic.com should succeed)"
	@echo "------------------------------------------------------"
	@if curl --connect-timeout 5 -s https://api.anthropic.com >/dev/null 2>&1; then \
		echo "✓ PASS: api.anthropic.com is reachable"; \
	else \
		echo "⚠ WARN: api.anthropic.com may not be reachable (check DNS)"; \
	fi
	@echo ""
	@echo "=============================================="
	@echo "Verification Complete"
	@echo "=============================================="

.PHONY: devcontainer\:allowlist\:check
devcontainer\:allowlist\:check: ## Validate allowlist.domains file
	@echo "=============================================="
	@echo "Allowlist Validation"
	@echo "=============================================="
	@echo ""
	@ALLOWLIST="/usr/local/etc/devcontainer/allowlist.domains"; \
	if [ ! -f "$$ALLOWLIST" ]; then \
		echo "ERROR: Allowlist file not found: $$ALLOWLIST"; \
		exit 1; \
	fi; \
	echo "Checking domains in $$ALLOWLIST..."; \
	echo ""; \
	ERRORS=0; \
	while IFS= read -r line || [ -n "$$line" ]; do \
		case "$$line" in \
			""|\#*) continue ;; \
		esac; \
		domain=$$(echo "$$line" | xargs); \
		[ -z "$$domain" ] && continue; \
		if dig +short A "$$domain" >/dev/null 2>&1 && [ -n "$$(dig +short A "$$domain")" ]; then \
			echo "✓ $$domain"; \
		else \
			echo "✗ $$domain (DNS resolution failed)"; \
			ERRORS=$$((ERRORS + 1)); \
		fi; \
	done < "$$ALLOWLIST"; \
	echo ""; \
	if [ $$ERRORS -gt 0 ]; then \
		echo "WARNING: $$ERRORS domain(s) failed DNS resolution"; \
	else \
		echo "All domains resolved successfully"; \
	fi

# ==============================================================================
# Contract Commands (delegated to tools/contract)
# ==============================================================================

.PHONY: format lint typecheck test build e2e migrate deploy-dryrun

format: ## Run formatter via contract
	./tools/contract format

lint: ## Run linter via contract
	./tools/contract lint

typecheck: ## Run type checker via contract
	./tools/contract typecheck

test: ## Run tests via contract
	./tools/contract test

build: ## Build project via contract
	./tools/contract build

e2e: ## Run E2E tests via contract
	./tools/contract e2e

migrate: ## Run database migrations via contract
	./tools/contract migrate

deploy-dryrun: ## Run deployment dry-run via contract
	./tools/contract deploy-dryrun
