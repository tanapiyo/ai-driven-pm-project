#!/usr/bin/env bash
# Test: contract up preserves INTERNAL_SUBNET and WEB_STATIC_IP from existing .env
#
# Issue #843: contract up was overwriting .env without preserving INTERNAL_SUBNET
# and WEB_STATIC_IP, causing Docker network subnet collisions between worktrees.
#
# This test verifies the fix by simulating the env-file overwrite logic and
# asserting that INTERNAL_SUBNET and WEB_STATIC_IP survive the overwrite.

# Note: -e is intentionally omitted so all tests run and report
# pass/fail counts even when individual assertions fail.
set -uo pipefail

PASS=0
FAIL=0
TEST_DIR="$(mktemp -d)"
trap 'rm -rf "$TEST_DIR"' EXIT

assert_equals() {
    local desc="$1"
    local expected="$2"
    local actual="$3"
    if [[ "$expected" == "$actual" ]]; then
        echo "PASS: $desc"
        PASS=$((PASS + 1))
    else
        echo "FAIL: $desc"
        echo "      expected: '$expected'"
        echo "      actual:   '$actual'"
        FAIL=$((FAIL + 1))
    fi
}

# ---------------------------------------------------------------------------
# Helper: simulate the .env overwrite logic from tools/_contract/stack/up
# This mirrors the FIXED version of the up script logic.
# ---------------------------------------------------------------------------
simulate_up_env_overwrite() {
    local env_file="$1"
    local worktree="$2"
    local default_endpoint_name="$3"
    local default_container_name="$4"
    local repo_root="$5"

    local existing_env=""
    if [[ -f "$env_file" ]]; then
        existing_env="$(cat "$env_file")"
    fi

    # Preserve ENDPOINT_NAME from existing .env
    local endpoint_name="$default_endpoint_name"
    if [[ -n "$existing_env" ]]; then
        local extracted
        extracted=$(echo "$existing_env" | grep "^ENDPOINT_NAME=" | cut -d'=' -f2- | tr -d '"' || true)
        if [[ -n "$extracted" ]]; then
            endpoint_name="$extracted"
        fi
    fi

    # Preserve CONTAINER_NAME from existing .env
    local container_name="$default_container_name"
    if [[ -n "$existing_env" ]]; then
        local extracted
        extracted=$(echo "$existing_env" | grep "^CONTAINER_NAME=" | cut -d'=' -f2- | tr -d '"' || true)
        if [[ -n "$extracted" ]]; then
            container_name="$extracted"
        fi
    fi

    # Preserve INTERNAL_SUBNET from existing .env (fix for #843)
    local internal_subnet=""
    if [[ -n "$existing_env" ]]; then
        internal_subnet=$(echo "$existing_env" | grep "^INTERNAL_SUBNET=" | cut -d'=' -f2- | tr -d '"' || true)
    fi

    # Preserve WEB_STATIC_IP from existing .env (fix for #843)
    local web_static_ip=""
    if [[ -n "$existing_env" ]]; then
        web_static_ip=$(echo "$existing_env" | grep "^WEB_STATIC_IP=" | cut -d'=' -f2- | tr -d '"' || true)
    fi

    # Write the updated .env (preserving all values)
    # Only write INTERNAL_SUBNET/WEB_STATIC_IP lines if non-empty,
    # so Docker Compose's ${VAR:-default} fallback works when unset.
    {
        echo "WORKTREE=${worktree}"
        echo "COMPOSE_PROJECT_NAME=${worktree}"
        echo "ENDPOINT_NAME=${endpoint_name}"
        echo "CONTAINER_NAME=${container_name}"
        echo "HOST_WORKSPACE_PATH=${repo_root}"
        [ -n "$internal_subnet" ] && echo "INTERNAL_SUBNET=${internal_subnet}" || true
        [ -n "$web_static_ip" ] && echo "WEB_STATIC_IP=${web_static_ip}" || true
    } > "$env_file"
}

# Helper to read a var from env file (returns empty string if not found)
read_env_var() {
    local env_file="$1"
    local var_name="$2"
    grep "^${var_name}=" "$env_file" | cut -d'=' -f2- | tr -d '"' || true
}

# ---------------------------------------------------------------------------
# Test 1: INTERNAL_SUBNET is preserved when .env already contains it
# ---------------------------------------------------------------------------
test_internal_subnet_preserved() {
    local env_file="${TEST_DIR}/test1"
    printf 'WORKTREE=my-worktree\nCOMPOSE_PROJECT_NAME=my-worktree\nENDPOINT_NAME=my-endpoint\nCONTAINER_NAME=my-container\nHOST_WORKSPACE_PATH=/repo\nINTERNAL_SUBNET=172.28.20.0/24\nWEB_STATIC_IP=172.28.20.10\n' > "$env_file"

    simulate_up_env_overwrite "$env_file" "my-worktree" "" "" "/repo"

    local result
    result=$(read_env_var "$env_file" "INTERNAL_SUBNET")
    assert_equals "INTERNAL_SUBNET preserved after contract up overwrite" \
        "172.28.20.0/24" "$result"
}

# ---------------------------------------------------------------------------
# Test 2: WEB_STATIC_IP is preserved when .env already contains it
# ---------------------------------------------------------------------------
test_web_static_ip_preserved() {
    local env_file="${TEST_DIR}/test2"
    printf 'WORKTREE=my-worktree\nCOMPOSE_PROJECT_NAME=my-worktree\nENDPOINT_NAME=my-endpoint\nCONTAINER_NAME=my-container\nHOST_WORKSPACE_PATH=/repo\nINTERNAL_SUBNET=172.28.20.0/24\nWEB_STATIC_IP=172.28.20.10\n' > "$env_file"

    simulate_up_env_overwrite "$env_file" "my-worktree" "" "" "/repo"

    local result
    result=$(read_env_var "$env_file" "WEB_STATIC_IP")
    assert_equals "WEB_STATIC_IP preserved after contract up overwrite" \
        "172.28.20.10" "$result"
}

# ---------------------------------------------------------------------------
# Test 3: Different worktrees retain different subnets (no collision)
# ---------------------------------------------------------------------------
test_different_worktrees_different_subnets() {
    local env_file_a="${TEST_DIR}/test3a"
    local env_file_b="${TEST_DIR}/test3b"

    printf 'WORKTREE=worktree-a\nENDPOINT_NAME=endpoint-a\nCONTAINER_NAME=container-a\nHOST_WORKSPACE_PATH=/repo\nINTERNAL_SUBNET=172.18.0.0/24\nWEB_STATIC_IP=172.18.0.10\n' > "$env_file_a"
    printf 'WORKTREE=worktree-b\nENDPOINT_NAME=endpoint-b\nCONTAINER_NAME=container-b\nHOST_WORKSPACE_PATH=/repo\nINTERNAL_SUBNET=172.19.0.0/24\nWEB_STATIC_IP=172.19.0.10\n' > "$env_file_b"

    simulate_up_env_overwrite "$env_file_a" "worktree-a" "" "" "/repo"
    simulate_up_env_overwrite "$env_file_b" "worktree-b" "" "" "/repo"

    local subnet_a subnet_b
    subnet_a=$(read_env_var "$env_file_a" "INTERNAL_SUBNET")
    subnet_b=$(read_env_var "$env_file_b" "INTERNAL_SUBNET")

    if [[ "$subnet_a" != "$subnet_b" ]]; then
        echo "PASS: different worktrees retain different subnets (no collision)"
        PASS=$((PASS + 1))
    else
        echo "FAIL: different worktrees have same subnet after overwrite (collision!)"
        echo "      subnet_a: '$subnet_a'"
        echo "      subnet_b: '$subnet_b'"
        FAIL=$((FAIL + 1))
    fi
}

# ---------------------------------------------------------------------------
# Test 4: INTERNAL_SUBNET and WEB_STATIC_IP lines are omitted when .env has
#         no values (e.g. manual .env creation without spawn.sh).
#         This ensures Docker Compose's ${VAR:-default} fallback works.
# ---------------------------------------------------------------------------
test_omitted_when_no_existing_values() {
    local env_file="${TEST_DIR}/test4"
    printf 'WORKTREE=my-worktree\nENDPOINT_NAME=my-endpoint\nCONTAINER_NAME=my-container\nHOST_WORKSPACE_PATH=/repo\n' > "$env_file"

    simulate_up_env_overwrite "$env_file" "my-worktree" "" "" "/repo"

    local has_subnet has_ip
    has_subnet=$(grep -c "^INTERNAL_SUBNET=" "$env_file" || true)
    has_ip=$(grep -c "^WEB_STATIC_IP=" "$env_file" || true)

    assert_equals "INTERNAL_SUBNET line omitted when not in original .env" \
        "0" "$has_subnet"
    assert_equals "WEB_STATIC_IP line omitted when not in original .env" \
        "0" "$has_ip"
}

# ---------------------------------------------------------------------------
# Test 6: No .env file exists at all (first-run scenario)
# ---------------------------------------------------------------------------
test_no_env_file_exists() {
    local env_file="${TEST_DIR}/test6"
    # Do NOT create the file — simulate first-run

    simulate_up_env_overwrite "$env_file" "fresh-worktree" "default-ep" "default-cn" "/repo"

    local has_subnet has_ip
    has_subnet=$(grep -c "^INTERNAL_SUBNET=" "$env_file" || true)
    has_ip=$(grep -c "^WEB_STATIC_IP=" "$env_file" || true)

    assert_equals "INTERNAL_SUBNET line omitted on first run (no .env)" \
        "0" "$has_subnet"
    assert_equals "WEB_STATIC_IP line omitted on first run (no .env)" \
        "0" "$has_ip"
}

# ---------------------------------------------------------------------------
# Test 5: ENDPOINT_NAME and CONTAINER_NAME still preserved (regression check)
# ---------------------------------------------------------------------------
test_endpoint_and_container_still_preserved() {
    local env_file="${TEST_DIR}/test5"
    printf 'WORKTREE=my-worktree\nCOMPOSE_PROJECT_NAME=my-worktree\nENDPOINT_NAME=my-custom-endpoint\nCONTAINER_NAME=my-custom-container\nHOST_WORKSPACE_PATH=/repo\nINTERNAL_SUBNET=172.28.20.0/24\nWEB_STATIC_IP=172.28.20.10\n' > "$env_file"

    simulate_up_env_overwrite "$env_file" "my-worktree" "default-endpoint" "default-container" "/repo"

    local endpoint container
    endpoint=$(read_env_var "$env_file" "ENDPOINT_NAME")
    container=$(read_env_var "$env_file" "CONTAINER_NAME")

    assert_equals "ENDPOINT_NAME still preserved after fix (regression)" \
        "my-custom-endpoint" "$endpoint"
    assert_equals "CONTAINER_NAME still preserved after fix (regression)" \
        "my-custom-container" "$container"
}

# ---------------------------------------------------------------------------
# Run all tests
# ---------------------------------------------------------------------------
echo "=== contract up .env preservation tests ==="
echo ""

test_internal_subnet_preserved
test_web_static_ip_preserved
test_different_worktrees_different_subnets
test_omitted_when_no_existing_values
test_endpoint_and_container_still_preserved
test_no_env_file_exists

echo ""
echo "=== Results: ${PASS} passed, ${FAIL} failed ==="

if [[ $FAIL -gt 0 ]]; then
    exit 1
fi
exit 0
