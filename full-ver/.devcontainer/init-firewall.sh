#!/bin/bash
# ==============================================================================
# init-firewall.sh - Secure outbound firewall for devcontainer
# 
# Implements deny-by-default outbound network policy with allowlist.
# Based on: https://github.com/anthropics/claude-code/.devcontainer/
#
# Environment Variables:
#   DEVCONTAINER_FIREWALL_MODE - "strict" (default) or "balanced"
#   DEVCONTAINER_ALLOW_GITHUB  - "true" (default) or "false"
#   DEVCONTAINER_ALLOW_SSH     - "true" (default) or "false"
#
# Exit Codes:
#   0 - Success
#   1 - Configuration error (DNS resolution, GitHub API, etc.)
#   2 - Verification failed (security check did not pass)
# ==============================================================================
set -euo pipefail
IFS=$'\n\t'

# Configuration
ALLOWLIST_FILE="${DEVCONTAINER_ALLOWLIST_FILE:-/usr/local/etc/devcontainer/allowlist.domains}"
FIREWALL_MODE="${DEVCONTAINER_FIREWALL_MODE:-strict}"
ALLOW_GITHUB="${DEVCONTAINER_ALLOW_GITHUB:-true}"
ALLOW_SSH="${DEVCONTAINER_ALLOW_SSH:-true}"

echo "=============================================="
echo "Initializing devcontainer firewall"
echo "Mode: ${FIREWALL_MODE}"
echo "Allow GitHub: ${ALLOW_GITHUB}"
echo "Allow SSH: ${ALLOW_SSH}"
echo "Allowlist: ${ALLOWLIST_FILE}"
echo "=============================================="

# ------------------------------------------------------------------------------
# 1. Preserve Docker DNS rules BEFORE flushing
# ------------------------------------------------------------------------------
echo "[1/7] Extracting Docker DNS rules..."
DOCKER_DNS_RULES=$(iptables-save -t nat | grep "127\.0\.0\.11" || true)

# Flush existing rules and delete existing ipsets
iptables -F
iptables -X 2>/dev/null || true
iptables -t nat -F
iptables -t nat -X 2>/dev/null || true
iptables -t mangle -F
iptables -t mangle -X 2>/dev/null || true
ipset destroy allowed-domains 2>/dev/null || true

# ------------------------------------------------------------------------------
# 2. Restore Docker DNS resolution (CRITICAL: don't break container DNS)
# ------------------------------------------------------------------------------
echo "[2/7] Restoring Docker DNS rules..."
if [ -n "$DOCKER_DNS_RULES" ]; then
    iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
    iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
    echo "$DOCKER_DNS_RULES" | xargs -L 1 iptables -t nat
    echo "  Docker DNS rules restored"
else
    echo "  No Docker DNS rules found (may be non-Docker environment)"
fi

# ------------------------------------------------------------------------------
# 3. Setup base rules (DNS, localhost, SSH)
# ------------------------------------------------------------------------------
echo "[3/7] Setting up base network rules..."

# Allow outbound/inbound DNS (required for domain resolution)
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p udp --sport 53 -j ACCEPT

# Allow SSH if enabled
if [ "$ALLOW_SSH" = "true" ]; then
    iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
    iptables -A INPUT -p tcp --sport 22 -m state --state ESTABLISHED -j ACCEPT
    echo "  SSH (port 22) allowed"
fi

# Allow localhost
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Create ipset for allowed domains (with CIDR support)
ipset create allowed-domains hash:net

# ------------------------------------------------------------------------------
# 4. Add GitHub IPs if enabled
# ------------------------------------------------------------------------------
if [ "$ALLOW_GITHUB" = "true" ]; then
    echo "[4/7] Fetching GitHub IP ranges..."
    gh_ranges=$(curl -s --connect-timeout 10 https://api.github.com/meta) || {
        echo "ERROR: Failed to fetch GitHub IP ranges"
        echo "  Check network connectivity and DNS resolution"
        exit 1
    }

    if ! echo "$gh_ranges" | jq -e '.web and .api and .git' >/dev/null 2>&1; then
        echo "ERROR: GitHub API response missing required fields"
        echo "  Response may be rate-limited or malformed"
        exit 1
    fi

    echo "  Processing GitHub IPs..."
    while read -r cidr; do
        if [[ ! "$cidr" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/[0-9]{1,2}$ ]]; then
            echo "ERROR: Invalid CIDR range from GitHub meta: $cidr"
            exit 1
        fi
        ipset add allowed-domains "$cidr" 2>/dev/null || true
    done < <(echo "$gh_ranges" | jq -r '(.web + .api + .git)[]' | aggregate -q)
    echo "  GitHub IPs added to allowlist"
else
    echo "[4/7] Skipping GitHub (ALLOW_GITHUB=false)"
fi

# ------------------------------------------------------------------------------
# 5. Resolve and add domains from allowlist file
# ------------------------------------------------------------------------------
echo "[5/7] Processing allowlist domains..."
if [ -f "$ALLOWLIST_FILE" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip empty lines and comments
        [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
        
        domain=$(echo "$line" | xargs)  # Trim whitespace
        [ -z "$domain" ] && continue
        
        echo "  Resolving $domain..."
        ips=$(dig +noall +answer A "$domain" 2>/dev/null | awk '$4 == "A" {print $5}')
        
        if [ -z "$ips" ]; then
            if [ "$FIREWALL_MODE" = "strict" ]; then
                echo "ERROR: Failed to resolve $domain"
                echo "  In strict mode, all domains must resolve"
                exit 1
            else
                echo "  WARNING: Failed to resolve $domain (balanced mode: continuing)"
                continue
            fi
        fi
        
        while read -r ip; do
            if [[ "$ip" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
                ipset add allowed-domains "$ip" 2>/dev/null || true
            else
                echo "  WARNING: Invalid IP for $domain: $ip"
            fi
        done < <(echo "$ips")
    done < "$ALLOWLIST_FILE"
else
    echo "  WARNING: Allowlist file not found: $ALLOWLIST_FILE"
    if [ "$FIREWALL_MODE" = "strict" ]; then
        echo "  In strict mode, allowlist file is required"
        exit 1
    fi
fi

# ------------------------------------------------------------------------------
# 6. Setup host network access and default policies
# ------------------------------------------------------------------------------
echo "[6/7] Configuring host network access..."

# Get host IP from default route
HOST_IP=$(ip route | grep default | cut -d" " -f3)
if [ -z "$HOST_IP" ]; then
    echo "ERROR: Failed to detect host IP"
    echo "  Container may not have proper network configuration"
    exit 1
fi

HOST_NETWORK=$(echo "$HOST_IP" | sed "s/\.[0-9]*$/.0\/24/")
echo "  Host network: $HOST_NETWORK"

# Allow host network communication
iptables -A INPUT -s "$HOST_NETWORK" -j ACCEPT
iptables -A OUTPUT -d "$HOST_NETWORK" -j ACCEPT

# Set default policies to DROP
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow traffic to allowed domains
iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT

# Reject other traffic with immediate feedback
iptables -A OUTPUT -j REJECT --reject-with icmp-admin-prohibited

echo "  Firewall rules applied (default: DENY)"

# ------------------------------------------------------------------------------
# 7. Verification
# ------------------------------------------------------------------------------
echo "[7/7] Verifying firewall configuration..."

# Test: example.com should be blocked
echo "  Testing block: example.com..."
if curl --connect-timeout 5 https://example.com >/dev/null 2>&1; then
    echo "ERROR: Firewall verification FAILED"
    echo "  Was able to reach https://example.com (should be blocked)"
    exit 2
else
    echo "  ✓ example.com blocked as expected"
fi

# Test: GitHub should be accessible (if enabled)
if [ "$ALLOW_GITHUB" = "true" ]; then
    echo "  Testing allow: api.github.com..."
    if ! curl --connect-timeout 5 https://api.github.com/zen >/dev/null 2>&1; then
        echo "ERROR: Firewall verification FAILED"
        echo "  Unable to reach https://api.github.com (should be allowed)"
        exit 2
    else
        echo "  ✓ api.github.com accessible as expected"
    fi
fi

echo "=============================================="
echo "Firewall initialization complete"
echo "Mode: ${FIREWALL_MODE} | Status: ACTIVE"
echo "=============================================="
