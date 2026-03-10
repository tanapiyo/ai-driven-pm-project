#!/usr/bin/env bash
# tools/worktree/lib/subnet.sh
# Shared subnet allocation utilities for worktree isolation
#
# Extracted from spawn.sh to allow reuse in init-environment.sh and
# other scripts that need to allocate or preserve unique Docker subnets.
#
# Prevents "Pool overlaps" Docker errors when multiple worktrees run
# simultaneously by assigning each worktree a unique /24 subnet.
#
# NOTE: This file is designed to be `source`d by other scripts.
# Do NOT put `set -euo pipefail` here — let the caller control error behavior.
#
# Issue: #860

SUBNET_STATE_DIR="${SUBNET_STATE_DIR:-${REPO_ROOT:+${REPO_ROOT}/.worktree-state}}"

# CIDR format regex for subnet validation (172.18-30.0-255.0/24)
_SUBNET_CIDR_RE='^172\.(1[89]|2[0-9]|30)\.[0-9]{1,3}\.0/24$'
# IP format regex for WEB_STATIC_IP validation (172.18-30.0-255.10)
_SUBNET_IP_RE='^172\.(1[89]|2[0-9]|30)\.[0-9]{1,3}\.10$'

# Validate that a value is a positive integer (guards against arithmetic injection).
# Args:
#   $1 - value to validate
# Returns:
#   0 if valid, 1 if invalid
_is_positive_integer() {
    [[ "$1" =~ ^[0-9]+$ ]] && [[ "$1" -gt 0 ]]
}

# Calculate unique subnet for worktree to avoid Docker network collisions.
# Each worktree gets a /24 subnet within the 172.16.0.0/12 private range.
# Range: 172.18.0.0/24 ~ 172.30.255.0/24 (13 x 256 = 3,328 slots)
# Avoided: 172.17.x.x (Docker default bridge), 172.31.0.x (manual fallback default).
# Sets globals: INTERNAL_SUBNET, WEB_STATIC_IP (read by caller after invocation).
#
# Args:
#   $1 - worktree_id: positive integer (1-based)
calculate_subnet() {
    local worktree_id="$1"

    # Guard: worktree_id must be a positive integer (prevents arithmetic injection)
    if ! _is_positive_integer "$worktree_id"; then
        echo "[ERROR] Invalid worktree_id: '${worktree_id}' (must be a positive integer)" >&2
        return 1
    fi

    local subnet_second=$((18 + (worktree_id - 1) % 13))
    local subnet_third=$(( (worktree_id - 1) / 13 ))

    # Guard: subnet_third must be a valid IPv4 octet (0-255)
    if [[ "$subnet_third" -gt 255 ]]; then
        echo "[ERROR] Worktree ID ${worktree_id} exceeds subnet pool capacity (max 3328)" >&2
        return 1
    fi

    INTERNAL_SUBNET="172.${subnet_second}.${subnet_third}.0/24"
    WEB_STATIC_IP="172.${subnet_second}.${subnet_third}.10"
}

# Validate that a subnet value matches the expected CIDR format.
# Used to verify preserved values from .env before reuse.
# Args:
#   $1 - subnet value (e.g., "172.18.0.0/24")
# Returns:
#   0 if valid, 1 if invalid
validate_subnet_format() {
    [[ "$1" =~ $_SUBNET_CIDR_RE ]]
}

# Validate that a WEB_STATIC_IP value matches the expected format.
# Args:
#   $1 - IP value (e.g., "172.18.0.10")
# Returns:
#   0 if valid, 1 if invalid
validate_static_ip_format() {
    [[ "$1" =~ $_SUBNET_IP_RE ]]
}

# Get next available worktree ID with atomic allocation.
# Uses .worktree-state/*.yaml files to track allocated IDs.
# Falls back to ID 1 if state directory is not available.
#
# Returns:
#   Next available worktree ID (stdout)
get_next_worktree_id() {
    local state_dir="${SUBNET_STATE_DIR}"

    # If state dir is not set or inaccessible, fall back to ID 1
    if [[ -z "$state_dir" ]]; then
        echo "1"
        return 0
    fi

    local lock_dir="${state_dir}/.id-lock.d"
    mkdir -p "${state_dir}"

    # Acquire exclusive lock with timeout (cross-platform)
    # Use mkdir for atomic lock (works on macOS and Linux)
    local retries=0
    local max_retries=100  # 10 seconds with 0.1s sleep

    while ! mkdir "$lock_dir" 2>/dev/null; do
        retries=$((retries + 1))
        if [[ $retries -ge $max_retries ]]; then
            echo "[ERROR] Failed to acquire lock for ID allocation (timeout)" >&2
            return 1
        fi
        sleep 0.1
    done

    # Save existing EXIT trap and install lock-release trap
    local _old_exit_trap
    _old_exit_trap=$(trap -p EXIT || true)
    trap 'rmdir "$lock_dir" 2>/dev/null || true' EXIT

    local max_id=0
    if [[ -d "${state_dir}" ]]; then
        for f in "${state_dir}"/*.yaml; do
            if [[ -f "$f" ]]; then
                local id
                id=$(grep -E "^worktree_id:" "$f" 2>/dev/null | awk '{print $2}' || echo "0")
                # Validate that id is a non-negative integer (skip corrupted entries)
                if [[ "$id" =~ ^[0-9]+$ ]] && [[ "$id" -gt "$max_id" ]]; then
                    max_id="$id"
                fi
            fi
        done
    fi

    local new_id=$((max_id + 1))

    # Release lock and restore caller's EXIT trap
    rmdir "$lock_dir" 2>/dev/null || true
    if [[ -n "$_old_exit_trap" ]]; then
        eval "$_old_exit_trap"
    else
        trap - EXIT
    fi

    echo "$new_id"
}

# Collect all subnets currently used by Docker networks on this host.
# Requires Docker to be available; returns empty string per network on failure.
# Returns:
#   Newline-separated list of CIDR subnets (e.g. "172.18.0.0/24\n172.19.1.0/24")
_collect_docker_subnets() {
    if ! command -v docker &>/dev/null; then
        return 0
    fi
    local nets
    nets=$(docker network ls --format '{{.Name}}' 2>/dev/null) || return 0
    while read -r net; do
        [[ -z "$net" ]] && continue
        docker network inspect "$net" \
            --format '{{range .IPAM.Config}}{{.Subnet}}{{end}}' 2>/dev/null || true
    done <<< "$nets"
}

# Check if two CIDR ranges overlap.
# Handles /16 vs /24 overlap (e.g. 172.18.0.0/16 overlaps 172.18.5.0/24).
# Args:
#   $1 - existing CIDR (e.g. "172.18.0.0/16")
#   $2 - candidate CIDR (e.g. "172.18.5.0/24")
# Returns:
#   0 if they overlap, 1 if they don't
_cidrs_overlap() {
    local existing="$1" candidate="$2"

    # Fast path: exact match
    if [[ "$existing" == "$candidate" ]]; then
        return 0
    fi

    # Parse CIDR: address/prefix
    local e_addr="${existing%/*}" e_prefix="${existing#*/}"
    local c_addr="${candidate%/*}" c_prefix="${candidate#*/}"

    # Same prefix length but different address = no overlap
    if [[ "$e_prefix" == "$c_prefix" ]]; then
        return 1
    fi

    # Use the shorter (wider) prefix for comparison
    local min_prefix="$e_prefix"
    if [[ "$c_prefix" -lt "$e_prefix" ]]; then
        min_prefix="$c_prefix"
    fi

    # Convert IPs to integers for bitwise comparison
    local e_int c_int
    IFS='.' read -r a b c d <<< "$e_addr"
    e_int=$(( (a << 24) + (b << 16) + (c << 8) + d ))
    IFS='.' read -r a b c d <<< "$c_addr"
    c_int=$(( (a << 24) + (b << 16) + (c << 8) + d ))

    # Mask from the wider prefix
    local mask=$(( 0xFFFFFFFF << (32 - min_prefix) ))

    # Overlap if network addresses match under the wider mask
    [[ $(( e_int & mask )) -eq $(( c_int & mask )) ]]
}

# Find the first available (non-conflicting) subnet by scanning Docker networks.
# Starting from the given start_id (default: 1), increments until a free slot is found.
# Sets globals: INTERNAL_SUBNET, WEB_STATIC_IP (same as calculate_subnet).
#
# NEVER kills or stops conflicting containers — only logs a warning and moves on.
#
# Args:
#   $1 - start_id (optional): positive integer (1-based) — the preferred starting slot.
#        Defaults to 1 if omitted. Useful as a hint to spread allocations.
# Returns:
#   0 on success (globals set), 1 if all 3,328 slots are exhausted
#
# Issue: #885
find_available_subnet() {
    local start_id="${1:-1}"
    local _fas_max_slots=3328

    # Guard: start_id must be a positive integer
    if ! _is_positive_integer "$start_id"; then
        echo "[ERROR] Invalid start_id: '${start_id}' (must be a positive integer)" >&2
        return 1
    fi

    # Collect existing Docker subnets once (avoid repeated docker calls).
    # Use a prefixed name to avoid shadowing variables in caller's closure
    # when this function's locals are visible to command-substitution subshells.
    local _fas_subnets
    _fas_subnets=$(_collect_docker_subnets)

    local _fas_id="$start_id"
    while true; do
        # Check slot overflow
        if [[ "$_fas_id" -gt "$_fas_max_slots" ]]; then
            echo "[ERROR] All ${_fas_max_slots} subnet slots are exhausted — cannot allocate a free subnet" >&2
            return 1
        fi

        # Calculate candidate subnet
        if ! calculate_subnet "$_fas_id"; then
            return 1
        fi

        local _fas_candidate="$INTERNAL_SUBNET"

        # Check if this candidate conflicts with any existing Docker network.
        # Uses CIDR overlap detection to catch /16 networks overlapping /24
        # candidates (e.g. traefik 172.18.0.0/16 blocks 172.18.*.0/24).
        local _fas_conflict=false
        while IFS= read -r _fas_existing; do
            [[ -z "$_fas_existing" ]] && continue
            if _cidrs_overlap "$_fas_existing" "$_fas_candidate"; then
                _fas_conflict=true
                break
            fi
        done <<< "$_fas_subnets"

        if [[ "$_fas_conflict" == false ]]; then
            # Found a free slot — INTERNAL_SUBNET and WEB_STATIC_IP are already set
            # by calculate_subnet above
            return 0
        fi

        echo "[WARN] Subnet ${_fas_candidate} conflicts with an existing Docker network" \
            "— trying next slot (id=$((_fas_id + 1)))" >&2
        _fas_id=$((_fas_id + 1))
    done
}

# Get worktree ID from .worktree-state for the current worktree path.
# Used by init-environment.sh to find the ID assigned by spawn.sh.
#
# Args:
#   $1 - worktree_path: path to the worktree directory
# Returns:
#   worktree_id (stdout), or empty string if not found
get_worktree_id_from_state() {
    local worktree_path="$1"
    local state_dir="${SUBNET_STATE_DIR}"

    if [[ -z "$state_dir" || ! -d "$state_dir" ]]; then
        echo ""
        return 0
    fi

    local worktree_name
    worktree_name=$(basename "$worktree_path")

    # Validate worktree_name is safe (alphanumerics, hyphens, underscores, dots)
    if ! [[ "$worktree_name" =~ ^[a-zA-Z0-9._-]+$ ]]; then
        echo ""
        return 0
    fi

    local state_file="${state_dir}/${worktree_name}.yaml"

    if [[ -f "$state_file" ]]; then
        local id
        id=$(grep -E "^worktree_id:" "$state_file" 2>/dev/null | awk '{print $2}' || echo "")
        # Validate that id is a positive integer before returning
        if [[ -n "$id" ]] && [[ "$id" =~ ^[0-9]+$ ]]; then
            echo "$id"
        else
            echo ""
        fi
    else
        echo ""
    fi
}
