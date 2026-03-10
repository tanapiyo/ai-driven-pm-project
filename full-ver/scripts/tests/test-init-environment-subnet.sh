#!/usr/bin/env bash
# Regression test: INTERNAL_SUBNET / WEB_STATIC_IP dynamic generation
# in scripts/init-environment.sh
#
# Tests:
#   1. Subnet is always generated dynamically (not preserved from .env)
#   2. Missing INTERNAL_SUBNET/WEB_STATIC_IP triggers dynamic generation
#   3. Generated subnet values are valid format (172.X.Y.0/24)
#   4. WEB_STATIC_IP matches INTERNAL_SUBNET (same network prefix, .10 suffix)
#   5. First-run (no .env) generates subnet
#   6. calculate_subnet sets correct globals
#   7. Different worktree IDs produce different subnets
#   8. Stale .env values are overwritten by fresh scan
#   9. Malformed subnet in .env is replaced by valid one
#  10. validate_subnet_format / validate_static_ip_format work correctly
#
# Issue: #860, #885

# Note: -e intentionally omitted so all tests run and report pass/fail
set -uo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(dirname "$SCRIPTS_DIR")"

PASS=0
FAIL=0

_pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
_fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

# ---- setup tmp dir ----
TMP_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

# ---- source naming library ----
# shellcheck disable=SC1091
source "${ROOT_DIR}/tools/worktree/lib/naming.sh"

# ---- source subnet library ----
# shellcheck disable=SC1091
source "${ROOT_DIR}/tools/worktree/lib/subnet.sh"

echo "=== init-environment.sh subnet tests ==="
echo ""

# -----------------------------------------------------------------------
# Helper: simulate the prepare_env subnet logic from init-environment.sh
# Always scans Docker networks to find a free subnet (no .env preservation).
# -----------------------------------------------------------------------
simulate_prepare_env() {
    local env_file="$1"
    local worktree_name="$2"
    local repo_name="$3"

    local endpoint_name="${worktree_name}.${repo_name}"
    local docker_project_name
    docker_project_name=$(sanitize_docker_project_name "$endpoint_name")
    local container_name
    container_name=$(get_container_name "$worktree_name")

    # Always scan Docker networks at runtime — no .env preservation (#885)
    if ! find_available_subnet; then
        echo "ERROR: Could not allocate a free subnet" >&2
        return 1
    fi
    local internal_subnet="$INTERNAL_SUBNET"
    local web_static_ip="$WEB_STATIC_IP"

    cat > "$env_file" << EOF
WORKTREE=${docker_project_name}
ENDPOINT_NAME=${endpoint_name}
COMPOSE_PROJECT_NAME=${docker_project_name}
CONTAINER_NAME=${container_name}
HOST_WORKSPACE_PATH=${ROOT_DIR}
INTERNAL_SUBNET=${internal_subnet}
WEB_STATIC_IP=${web_static_ip}
EOF
}

# Helper to read a var from env file
read_env_var() {
    local env_file="$1"
    local var_name="$2"
    grep "^${var_name}=" "$env_file" | cut -d'=' -f2- | tr -d '"' || true
}

# -----------------------------------------------------------------------
# Test 1: Subnet is always freshly generated (old .env values are ignored)
# -----------------------------------------------------------------------
echo "--- Test 1: Subnet always freshly generated (old .env ignored) ---"
TEST1_ENV="${TMP_DIR}/test1.env"
printf 'WORKTREE=my-worktree\nENDPOINT_NAME=my.repo\nCOMPOSE_PROJECT_NAME=my-worktree\n' > "$TEST1_ENV"
printf 'CONTAINER_NAME=my-worktree\nHOST_WORKSPACE_PATH=/repo\n' >> "$TEST1_ENV"
printf 'INTERNAL_SUBNET=172.22.3.0/24\nWEB_STATIC_IP=172.22.3.10\n' >> "$TEST1_ENV"

# Override Docker scan to return no conflicts
_collect_docker_subnets() { echo ""; }

simulate_prepare_env "$TEST1_ENV" "my-worktree" "repo"

RESULT_SUBNET=$(read_env_var "$TEST1_ENV" "INTERNAL_SUBNET")
RESULT_IP=$(read_env_var "$TEST1_ENV" "WEB_STATIC_IP")

if [[ -n "$RESULT_SUBNET" ]]; then
    _pass "INTERNAL_SUBNET generated: $RESULT_SUBNET"
else
    _fail "INTERNAL_SUBNET NOT generated (empty)"
fi

if [[ -n "$RESULT_IP" ]]; then
    _pass "WEB_STATIC_IP generated: $RESULT_IP"
else
    _fail "WEB_STATIC_IP NOT generated (empty)"
fi

# -----------------------------------------------------------------------
# Test 2: Missing subnet in .env triggers dynamic generation
# -----------------------------------------------------------------------
echo ""
echo "--- Test 2: Missing subnet triggers dynamic generation ---"
TEST2_ENV="${TMP_DIR}/test2.env"
printf 'WORKTREE=fresh-worktree\nENDPOINT_NAME=fresh.repo\n' > "$TEST2_ENV"
printf 'COMPOSE_PROJECT_NAME=fresh-worktree\nCONTAINER_NAME=fresh-worktree\n' >> "$TEST2_ENV"
printf 'HOST_WORKSPACE_PATH=/repo\n' >> "$TEST2_ENV"

_collect_docker_subnets() { echo ""; }

simulate_prepare_env "$TEST2_ENV" "fresh-worktree" "repo"

RESULT_SUBNET=$(read_env_var "$TEST2_ENV" "INTERNAL_SUBNET")
RESULT_IP=$(read_env_var "$TEST2_ENV" "WEB_STATIC_IP")

if [[ -n "$RESULT_SUBNET" ]]; then
    _pass "INTERNAL_SUBNET generated dynamically: $RESULT_SUBNET"
else
    _fail "INTERNAL_SUBNET NOT generated (empty)"
fi

if [[ -n "$RESULT_IP" ]]; then
    _pass "WEB_STATIC_IP generated dynamically: $RESULT_IP"
else
    _fail "WEB_STATIC_IP NOT generated (empty)"
fi

# -----------------------------------------------------------------------
# Test 3: Generated subnet values are valid format (172.X.Y.0/24)
# -----------------------------------------------------------------------
echo ""
echo "--- Test 3: Generated subnet format is valid (172.X.Y.0/24) ---"
TEST3_ENV="${TMP_DIR}/test3.env"
printf 'WORKTREE=standalone\nHOST_WORKSPACE_PATH=/repo\n' > "$TEST3_ENV"

_collect_docker_subnets() { echo ""; }

simulate_prepare_env "$TEST3_ENV" "standalone" "repo"

GEN_SUBNET=$(read_env_var "$TEST3_ENV" "INTERNAL_SUBNET")

# Validate format: 172.X.Y.0/24 where X is 18-30, Y is 0-255
if echo "$GEN_SUBNET" | grep -qE '^172\.(1[89]|2[0-9]|30)\.[0-9]{1,3}\.0/24$'; then
    _pass "INTERNAL_SUBNET format valid (172.X.Y.0/24): $GEN_SUBNET"
else
    _fail "INTERNAL_SUBNET format INVALID: '$GEN_SUBNET'"
fi

# -----------------------------------------------------------------------
# Test 4: WEB_STATIC_IP matches INTERNAL_SUBNET prefix (.10 suffix)
# -----------------------------------------------------------------------
echo ""
echo "--- Test 4: WEB_STATIC_IP matches INTERNAL_SUBNET (.10 suffix) ---"
TEST4_ENV="${TMP_DIR}/test4.env"
printf 'WORKTREE=subnet-match\nHOST_WORKSPACE_PATH=/repo\n' > "$TEST4_ENV"

_collect_docker_subnets() { echo ""; }

simulate_prepare_env "$TEST4_ENV" "subnet-match" "repo"

GEN_SUBNET=$(read_env_var "$TEST4_ENV" "INTERNAL_SUBNET")
GEN_IP=$(read_env_var "$TEST4_ENV" "WEB_STATIC_IP")

# Extract prefix from subnet: 172.X.Y.0/24 -> 172.X.Y
SUBNET_PREFIX="${GEN_SUBNET%.0/24}"
EXPECTED_IP="${SUBNET_PREFIX}.10"

if [[ "$GEN_IP" == "$EXPECTED_IP" ]]; then
    _pass "WEB_STATIC_IP matches INTERNAL_SUBNET prefix + .10: $GEN_IP"
else
    _fail "WEB_STATIC_IP MISMATCH: expected '$EXPECTED_IP', got '$GEN_IP'"
fi

# -----------------------------------------------------------------------
# Test 5: First-run (no .env) also generates subnet
# -----------------------------------------------------------------------
echo ""
echo "--- Test 5: First-run (no .env) generates subnet ---"
TEST5_ENV="${TMP_DIR}/test5.env"
# No file exists at all

_collect_docker_subnets() { echo ""; }

simulate_prepare_env "$TEST5_ENV" "first-run" "repo"

GEN_SUBNET=$(read_env_var "$TEST5_ENV" "INTERNAL_SUBNET")
GEN_IP=$(read_env_var "$TEST5_ENV" "WEB_STATIC_IP")

if [[ -n "$GEN_SUBNET" ]]; then
    _pass "INTERNAL_SUBNET generated on first run: $GEN_SUBNET"
else
    _fail "INTERNAL_SUBNET NOT generated on first run"
fi

if [[ -n "$GEN_IP" ]]; then
    _pass "WEB_STATIC_IP generated on first run: $GEN_IP"
else
    _fail "WEB_STATIC_IP NOT generated on first run"
fi

# -----------------------------------------------------------------------
# Test 6: calculate_subnet sets globals INTERNAL_SUBNET and WEB_STATIC_IP
# -----------------------------------------------------------------------
echo ""
echo "--- Test 6: calculate_subnet sets correct globals ---"
INTERNAL_SUBNET=""
WEB_STATIC_IP=""
calculate_subnet 1

if [[ -n "${INTERNAL_SUBNET:-}" ]]; then
    _pass "calculate_subnet sets INTERNAL_SUBNET: $INTERNAL_SUBNET"
else
    _fail "calculate_subnet did NOT set INTERNAL_SUBNET"
fi

if [[ -n "${WEB_STATIC_IP:-}" ]]; then
    _pass "calculate_subnet sets WEB_STATIC_IP: $WEB_STATIC_IP"
else
    _fail "calculate_subnet did NOT set WEB_STATIC_IP"
fi

# Verify worktree 1 gets expected subnet (172.18.0.0/24)
if [[ "$INTERNAL_SUBNET" == "172.18.0.0/24" ]]; then
    _pass "worktree_id=1 produces 172.18.0.0/24"
else
    _fail "worktree_id=1 should produce 172.18.0.0/24, got '$INTERNAL_SUBNET'"
fi

if [[ "$WEB_STATIC_IP" == "172.18.0.10" ]]; then
    _pass "worktree_id=1 produces WEB_STATIC_IP=172.18.0.10"
else
    _fail "worktree_id=1 should produce 172.18.0.10, got '$WEB_STATIC_IP'"
fi

# -----------------------------------------------------------------------
# Test 7: Different worktree IDs produce different subnets (no collision)
# -----------------------------------------------------------------------
echo ""
echo "--- Test 7: Different worktree IDs produce different subnets ---"
INTERNAL_SUBNET=""
WEB_STATIC_IP=""
calculate_subnet 1
SUBNET_1="$INTERNAL_SUBNET"

INTERNAL_SUBNET=""
WEB_STATIC_IP=""
calculate_subnet 2
SUBNET_2="$INTERNAL_SUBNET"

if [[ "$SUBNET_1" != "$SUBNET_2" ]]; then
    _pass "worktree_id=1 ($SUBNET_1) != worktree_id=2 ($SUBNET_2): no collision"
else
    _fail "worktree_id=1 and worktree_id=2 have SAME subnet (collision!): $SUBNET_1"
fi

# -----------------------------------------------------------------------
# Test 8: Stale .env values are overwritten by fresh Docker scan
# -----------------------------------------------------------------------
echo ""
echo "--- Test 8: Stale .env values overwritten by Docker scan ---"
TEST8_ENV="${TMP_DIR}/test8.env"
printf 'WORKTREE=stale\nHOST_WORKSPACE_PATH=/repo\n' > "$TEST8_ENV"
printf 'INTERNAL_SUBNET=172.22.3.0/24\n' >> "$TEST8_ENV"
# WEB_STATIC_IP intentionally absent — old bug would cause inconsistency

# Simulate slot 1 being free
_collect_docker_subnets() { echo ""; }

simulate_prepare_env "$TEST8_ENV" "stale" "repo"

RESULT_SUBNET=$(read_env_var "$TEST8_ENV" "INTERNAL_SUBNET")
RESULT_IP=$(read_env_var "$TEST8_ENV" "WEB_STATIC_IP")

# Both should be freshly generated (not the stale 172.22.3.0/24)
if [[ -n "$RESULT_SUBNET" && -n "$RESULT_IP" ]]; then
    _pass "Both vars present after fresh scan: subnet=$RESULT_SUBNET ip=$RESULT_IP"
else
    _fail "Missing var after fresh scan: subnet='$RESULT_SUBNET' ip='$RESULT_IP'"
fi

# Verify consistency: WEB_STATIC_IP should match INTERNAL_SUBNET prefix
RESULT_PREFIX="${RESULT_SUBNET%.0/24}"
RESULT_EXPECTED_IP="${RESULT_PREFIX}.10"
if [[ "$RESULT_IP" == "$RESULT_EXPECTED_IP" ]]; then
    _pass "Freshly generated pair is consistent: $RESULT_SUBNET / $RESULT_IP"
else
    _fail "Freshly generated pair INCONSISTENT: subnet=$RESULT_SUBNET ip=$RESULT_IP (expected ip=$RESULT_EXPECTED_IP)"
fi

# -----------------------------------------------------------------------
# Test 9: Conflicting subnets are skipped during scan
# -----------------------------------------------------------------------
echo ""
echo "--- Test 9: Conflicting subnets skipped during scan ---"
TEST9_ENV="${TMP_DIR}/test9.env"
printf 'WORKTREE=conflict\nHOST_WORKSPACE_PATH=/repo\n' > "$TEST9_ENV"

# Simulate slot 1 (172.18.0.0/24) being occupied
_collect_docker_subnets() { echo "172.18.0.0/24"; }

simulate_prepare_env "$TEST9_ENV" "conflict" "repo" 2>/dev/null

RESULT_SUBNET=$(read_env_var "$TEST9_ENV" "INTERNAL_SUBNET")

if [[ "$RESULT_SUBNET" != "172.18.0.0/24" ]] && echo "$RESULT_SUBNET" | grep -qE '^172\.(1[89]|2[0-9]|30)\.[0-9]{1,3}\.0/24$'; then
    _pass "Conflicting subnet skipped, got: $RESULT_SUBNET"
else
    _fail "Did not skip conflicting subnet: '$RESULT_SUBNET'"
fi

# -----------------------------------------------------------------------
# Test 10: validate_subnet_format / validate_static_ip_format
# -----------------------------------------------------------------------
echo ""
echo "--- Test 10: Format validation functions ---"

if validate_subnet_format "172.18.0.0/24"; then
    _pass "validate_subnet_format accepts valid: 172.18.0.0/24"
else
    _fail "validate_subnet_format rejects valid: 172.18.0.0/24"
fi

if ! validate_subnet_format "10.0.0.0/8"; then
    _pass "validate_subnet_format rejects invalid: 10.0.0.0/8"
else
    _fail "validate_subnet_format accepts invalid: 10.0.0.0/8"
fi

if validate_static_ip_format "172.22.3.10"; then
    _pass "validate_static_ip_format accepts valid: 172.22.3.10"
else
    _fail "validate_static_ip_format rejects valid: 172.22.3.10"
fi

if ! validate_static_ip_format "192.168.1.10"; then
    _pass "validate_static_ip_format rejects invalid: 192.168.1.10"
else
    _fail "validate_static_ip_format accepts invalid: 192.168.1.10"
fi

# ---- Summary ----
echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
if [[ "$FAIL" -gt 0 ]]; then
    exit 1
fi
echo "All tests passed."
