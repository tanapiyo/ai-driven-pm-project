#!/usr/bin/env bash
# Unit tests for find_available_subnet() in tools/worktree/lib/subnet.sh
#
# Tests:
#   1.  No Docker conflicts — returns the requested slot immediately
#   2.  One conflict — skips to next slot
#   3.  Multiple consecutive conflicts — skips to first free slot
#   4.  All slots exhausted — exits with error (exit code 1)
#   5.  INTERNAL_SUBNET and WEB_STATIC_IP are set correctly on success
#   6.  start_id > 1 — searches from the given slot, not from 1
#   7.  Conflict on the very last slot (3328) — exhaustion is detected
#   8.  Invalid start_id — returns error without looping
#   9.  Docker not available — no conflict assumed, first slot used
#  10.  Conflict list contains extra whitespace / empty lines — still works
#
# Issue: #885

# Note: -e intentionally omitted so all tests run and report pass/fail
set -uo pipefail

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(dirname "$SCRIPTS_DIR")"

PASS=0
FAIL=0

_pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
_fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

# ---- source the library under test ----
# shellcheck disable=SC1091
source "${ROOT_DIR}/tools/worktree/lib/subnet.sh"

echo "=== find_available_subnet() unit tests ==="
echo ""

# -----------------------------------------------------------------------
# Helper: override _collect_docker_subnets via a local function so we can
# inject test fixtures without requiring Docker.
# We simply redefine the function in the test's subshell scope.
# -----------------------------------------------------------------------

# -----------------------------------------------------------------------
# Test 1: No conflicts — first slot returned immediately
# -----------------------------------------------------------------------
echo "--- Test 1: No conflicts — returns requested slot ---"
(
    _collect_docker_subnets() { echo ""; }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    find_available_subnet 1
    if [[ "$INTERNAL_SUBNET" == "172.18.0.0/24" ]]; then
        echo "PASS: INTERNAL_SUBNET=172.18.0.0/24"
    else
        echo "FAIL: expected 172.18.0.0/24, got '$INTERNAL_SUBNET'"
        exit 1
    fi
) && _pass "No conflicts — returns requested slot" \
  || _fail "No conflicts — returns requested slot"

# -----------------------------------------------------------------------
# Test 2: One conflict on slot 1 — skips to slot 2
# -----------------------------------------------------------------------
echo ""
echo "--- Test 2: One conflict on slot 1 — skips to slot 2 ---"
(
    _collect_docker_subnets() { echo "172.18.0.0/24"; }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    find_available_subnet 1 2>/dev/null
    # Slot 2 is 172.19.0.0/24
    if [[ "$INTERNAL_SUBNET" == "172.19.0.0/24" ]]; then
        echo "PASS: skipped to 172.19.0.0/24"
    else
        echo "FAIL: expected 172.19.0.0/24, got '$INTERNAL_SUBNET'"
        exit 1
    fi
) && _pass "One conflict — skips to next slot" \
  || _fail "One conflict — skips to next slot"

# -----------------------------------------------------------------------
# Test 3: Multiple consecutive conflicts — finds first free slot
# -----------------------------------------------------------------------
echo ""
echo "--- Test 3: Multiple consecutive conflicts ---"
(
    _collect_docker_subnets() {
        echo "172.18.0.0/24"
        echo "172.19.0.0/24"
        echo "172.20.0.0/24"
    }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    find_available_subnet 1 2>/dev/null
    # Slot 4 is 172.21.0.0/24
    if [[ "$INTERNAL_SUBNET" == "172.21.0.0/24" ]]; then
        echo "PASS: found first free slot 172.21.0.0/24"
    else
        echo "FAIL: expected 172.21.0.0/24, got '$INTERNAL_SUBNET'"
        exit 1
    fi
) && _pass "Multiple consecutive conflicts — finds first free slot" \
  || _fail "Multiple consecutive conflicts — finds first free slot"

# -----------------------------------------------------------------------
# Test 4: All 3328 slots in use — returns exit code 1
# -----------------------------------------------------------------------
echo ""
echo "--- Test 4: All slots exhausted — exits with error ---"
(
    # Generate all 3328 subnets as conflicts
    used_subnets=""
    for id in $(seq 1 3328); do
        INTERNAL_SUBNET=""
        calculate_subnet "$id"
        used_subnets="${used_subnets}${INTERNAL_SUBNET}"$'\n'
    done
    _collect_docker_subnets() { printf '%s' "$used_subnets"; }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    if find_available_subnet 1 2>/dev/null; then
        echo "FAIL: expected error exit but got success"
        exit 1
    else
        echo "PASS: exited with error when all slots exhausted"
    fi
) && _pass "All slots exhausted — exits with error (rc=1)" \
  || _fail "All slots exhausted — exits with error (rc=1)"

# -----------------------------------------------------------------------
# Test 5: INTERNAL_SUBNET and WEB_STATIC_IP are consistent on success
# -----------------------------------------------------------------------
echo ""
echo "--- Test 5: Globals are consistent (same /24 subnet) ---"
(
    _collect_docker_subnets() { echo ""; }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    find_available_subnet 5
    # Extract prefix from INTERNAL_SUBNET (e.g. 172.22.0.0/24 -> 172.22.0)
    prefix="${INTERNAL_SUBNET%.0/24}"
    expected_ip="${prefix}.10"
    if [[ "$WEB_STATIC_IP" == "$expected_ip" ]]; then
        echo "PASS: WEB_STATIC_IP=$WEB_STATIC_IP matches INTERNAL_SUBNET=$INTERNAL_SUBNET"
    else
        echo "FAIL: WEB_STATIC_IP=$WEB_STATIC_IP != expected $expected_ip (subnet=$INTERNAL_SUBNET)"
        exit 1
    fi
) && _pass "Globals consistent: WEB_STATIC_IP matches INTERNAL_SUBNET" \
  || _fail "Globals consistent: WEB_STATIC_IP matches INTERNAL_SUBNET"

# -----------------------------------------------------------------------
# Test 6: start_id > 1 — does not start from 1
# -----------------------------------------------------------------------
echo ""
echo "--- Test 6: start_id > 1 — search starts from given slot ---"
(
    _collect_docker_subnets() { echo ""; }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    find_available_subnet 10
    # Slot 10 is 172.18.0.9 — wait, let's calculate:
    # second = 18 + (10-1) % 13 = 18 + 9 = 27
    # third  = (10-1) / 13 = 0
    # -> 172.27.0.0/24
    expected="172.27.0.0/24"
    if [[ "$INTERNAL_SUBNET" == "$expected" ]]; then
        echo "PASS: start_id=10 produces $INTERNAL_SUBNET"
    else
        echo "FAIL: expected $expected, got '$INTERNAL_SUBNET'"
        exit 1
    fi
) && _pass "start_id=10 produces correct subnet without starting from 1" \
  || _fail "start_id=10 produces correct subnet without starting from 1"

# -----------------------------------------------------------------------
# Test 7: Conflict on the very last valid slot (3328) — still exhausted
# -----------------------------------------------------------------------
echo ""
echo "--- Test 7: Last slot (3328) also conflicted — exhaustion detected ---"
(
    # Generate slots 3327 and 3328 as conflicts (start from 3327)
    INTERNAL_SUBNET=""
    calculate_subnet 3327
    subnet_3327="$INTERNAL_SUBNET"
    INTERNAL_SUBNET=""
    calculate_subnet 3328
    subnet_3328="$INTERNAL_SUBNET"
    _collect_docker_subnets() {
        echo "$subnet_3327"
        echo "$subnet_3328"
    }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    if find_available_subnet 3327 2>/dev/null; then
        echo "FAIL: expected error exit (slot 3329 > max) but got success"
        exit 1
    else
        echo "PASS: detected exhaustion at slot 3329"
    fi
) && _pass "Exhaustion detected when last-two slots conflict and start_id=3327" \
  || _fail "Exhaustion detected when last-two slots conflict and start_id=3327"

# -----------------------------------------------------------------------
# Test 8: Invalid start_id — returns error without looping
# -----------------------------------------------------------------------
echo ""
echo "--- Test 8: Invalid start_id — returns error ---"
(
    _collect_docker_subnets() { echo ""; }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    if find_available_subnet "abc" 2>/dev/null; then
        echo "FAIL: expected error for invalid start_id"
        exit 1
    else
        echo "PASS: rejected invalid start_id 'abc'"
    fi
) && _pass "Invalid start_id returns error" \
  || _fail "Invalid start_id returns error"

# -----------------------------------------------------------------------
# Test 9: Docker not available — no conflict assumed, first slot used
# -----------------------------------------------------------------------
echo ""
echo "--- Test 9: Docker unavailable — first slot used ---"
(
    # Simulate docker being absent by making _collect_docker_subnets return empty
    _collect_docker_subnets() { return 0; }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    find_available_subnet 1
    if [[ -n "$INTERNAL_SUBNET" ]]; then
        echo "PASS: allocated subnet $INTERNAL_SUBNET despite docker being unavailable"
    else
        echo "FAIL: INTERNAL_SUBNET not set"
        exit 1
    fi
) && _pass "Docker unavailable — first slot allocated without error" \
  || _fail "Docker unavailable — first slot allocated without error"

# -----------------------------------------------------------------------
# Test 9b: No args — defaults to start_id=1
# -----------------------------------------------------------------------
echo ""
echo "--- Test 9b: No args — defaults to slot 1 ---"
(
    _collect_docker_subnets() { echo ""; }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    find_available_subnet
    if [[ "$INTERNAL_SUBNET" == "172.18.0.0/24" ]]; then
        echo "PASS: no-arg defaults to slot 1 (172.18.0.0/24)"
    else
        echo "FAIL: expected 172.18.0.0/24, got '$INTERNAL_SUBNET'"
        exit 1
    fi
) && _pass "No args defaults to slot 1" \
  || _fail "No args defaults to slot 1"

# -----------------------------------------------------------------------
# Test 9c: No args with conflicts — skips to first free
# -----------------------------------------------------------------------
echo ""
echo "--- Test 9c: No args with conflicts — finds first free ---"
(
    _collect_docker_subnets() {
        echo "172.18.0.0/24"
        echo "172.19.0.0/24"
    }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    find_available_subnet 2>/dev/null
    if [[ "$INTERNAL_SUBNET" == "172.20.0.0/24" ]]; then
        echo "PASS: no-arg skipped 2 conflicts, got 172.20.0.0/24"
    else
        echo "FAIL: expected 172.20.0.0/24, got '$INTERNAL_SUBNET'"
        exit 1
    fi
) && _pass "No args with conflicts — skips to first free slot" \
  || _fail "No args with conflicts — skips to first free slot"

# -----------------------------------------------------------------------
# Test 10: Conflict list contains empty lines — still works correctly
# -----------------------------------------------------------------------
echo ""
echo "--- Test 10: Conflict list with empty lines handled ---"
(
    _collect_docker_subnets() {
        echo ""
        echo "172.18.0.0/24"
        echo ""
        echo ""
    }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    find_available_subnet 1 2>/dev/null
    if [[ "$INTERNAL_SUBNET" == "172.19.0.0/24" ]]; then
        echo "PASS: correctly skipped conflict and picked 172.19.0.0/24"
    else
        echo "FAIL: expected 172.19.0.0/24, got '$INTERNAL_SUBNET'"
        exit 1
    fi
) && _pass "Empty lines in conflict list handled correctly" \
  || _fail "Empty lines in conflict list handled correctly"

# -----------------------------------------------------------------------
# Test 11: _cidrs_overlap — /16 overlaps /24
# -----------------------------------------------------------------------
echo ""
echo "--- Test 11: _cidrs_overlap — /16 overlaps contained /24 ---"
(
    if _cidrs_overlap "172.18.0.0/16" "172.18.5.0/24"; then
        echo "PASS: 172.18.0.0/16 overlaps 172.18.5.0/24"
    else
        echo "FAIL: should overlap"
        exit 1
    fi
) && _pass "_cidrs_overlap: /16 overlaps /24" \
  || _fail "_cidrs_overlap: /16 overlaps /24"

# -----------------------------------------------------------------------
# Test 12: _cidrs_overlap — different /24 do not overlap
# -----------------------------------------------------------------------
echo ""
echo "--- Test 12: _cidrs_overlap — different /24 subnets ---"
(
    if _cidrs_overlap "172.19.22.0/24" "172.19.0.0/24"; then
        echo "FAIL: different /24 should not overlap"
        exit 1
    else
        echo "PASS: 172.19.22.0/24 does not overlap 172.19.0.0/24"
    fi
) && _pass "_cidrs_overlap: different /24 no overlap" \
  || _fail "_cidrs_overlap: different /24 no overlap"

# -----------------------------------------------------------------------
# Test 13: _cidrs_overlap — exact match
# -----------------------------------------------------------------------
echo ""
echo "--- Test 13: _cidrs_overlap — exact match ---"
(
    if _cidrs_overlap "172.19.22.0/24" "172.19.22.0/24"; then
        echo "PASS: exact match overlaps"
    else
        echo "FAIL: exact match should overlap"
        exit 1
    fi
) && _pass "_cidrs_overlap: exact match" \
  || _fail "_cidrs_overlap: exact match"

# -----------------------------------------------------------------------
# Test 14: /16 conflict skips all /24 in that range
# -----------------------------------------------------------------------
echo ""
echo "--- Test 14: /16 conflict — find_available_subnet skips range ---"
(
    _collect_docker_subnets() {
        echo "172.18.0.0/16"
    }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    find_available_subnet 1 2>/dev/null
    # Slot 1 = 172.18.0.0/24 (blocked by /16)
    # Slot 2 = 172.19.0.0/24 (free)
    if [[ "$INTERNAL_SUBNET" == "172.19.0.0/24" ]]; then
        echo "PASS: skipped /16 range, got 172.19.0.0/24"
    else
        echo "FAIL: expected 172.19.0.0/24, got '$INTERNAL_SUBNET'"
        exit 1
    fi
) && _pass "/16 conflict causes skip to next second-octet" \
  || _fail "/16 conflict causes skip to next second-octet"

# -----------------------------------------------------------------------
# Test 15: Multiple /16 conflicts — real-world scenario
# -----------------------------------------------------------------------
echo ""
echo "--- Test 15: Multiple /16 + /24 conflicts (real-world) ---"
(
    _collect_docker_subnets() {
        echo "172.17.0.0/16"
        echo "172.18.0.0/16"
        echo "172.19.22.0/24"
        echo "172.20.0.0/16"
    }
    INTERNAL_SUBNET=""
    WEB_STATIC_IP=""
    find_available_subnet 1 2>/dev/null
    # Slot 1 = 172.18.0.0/24 → blocked by 172.18.0.0/16
    # Slot 2 = 172.19.0.0/24 → free (172.19.22.0/24 is different /24)
    if [[ "$INTERNAL_SUBNET" == "172.19.0.0/24" ]]; then
        echo "PASS: found 172.19.0.0/24 (skipped /16 conflicts)"
    else
        echo "FAIL: expected 172.19.0.0/24, got '$INTERNAL_SUBNET'"
        exit 1
    fi
) && _pass "Multiple /16 + /24 conflicts — real-world scenario" \
  || _fail "Multiple /16 + /24 conflicts — real-world scenario"

# ---- Summary ----
echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="
if [[ "$FAIL" -gt 0 ]]; then
    exit 1
fi
echo "All tests passed."
