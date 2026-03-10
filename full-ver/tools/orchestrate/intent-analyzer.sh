#!/usr/bin/env bash
# tools/orchestrate/intent-analyzer.sh
# AI-based Intent Analyzer for nuanced routing
#
# Uses Claude/GPT to understand the nuance of user requests
# and determine the appropriate workflow.
#
# Usage:
#   ./tools/orchestrate/intent-analyzer.sh "<user request>"
#   ./tools/orchestrate/intent-analyzer.sh --with-context "<request>"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INTENT]${NC} $*" >&2; }

# Intent categories with descriptions
declare -A INTENT_CATEGORIES=(
    ["new_feature"]="New functionality, adding capabilities, creating something new"
    ["bug_fix"]="Fixing errors, resolving issues, correcting behavior"
    ["refactor"]="Improving code structure without changing behavior"
    ["optimization"]="Performance improvements, efficiency gains"
    ["documentation"]="Adding or updating documentation"
    ["testing"]="Adding tests, improving coverage"
    ["security"]="Security fixes, vulnerability patches"
    ["ui_change"]="User interface modifications"
    ["config_change"]="Configuration updates, settings changes"
    ["dependency"]="Updating libraries, managing dependencies"
)

# Generate analysis prompt for AI
generate_analysis_prompt() {
    local request="$1"
    local context="$2"

    cat << EOF
あなたはソフトウェア開発のタスクルーターです。
ユーザーのリクエストを分析し、適切なワークフローを決定してください。

## ユーザーリクエスト
"${request}"

## 既存のDocDDコンテキスト
${context}

## 判定基準

### Intent（意図）
以下から最も適切なものを1つ選択:
- new_feature: 新機能追加、新しい機能の実装
- bug_fix: バグ修正、エラー解決
- refactor: リファクタリング、コード改善
- optimization: パフォーマンス最適化
- documentation: ドキュメント更新
- testing: テスト追加・改善
- security: セキュリティ対応
- ui_change: UI/UX変更
- config_change: 設定変更
- dependency: 依存関係更新

### Scope（影響範囲）
- small: 1-2ファイル、単純な変更
- medium: 複数ファイル、1機能内
- large: 複数機能、アーキテクチャ影響

### Urgency（緊急度）
- low: 通常の開発サイクル
- medium: 早めに対応したい
- high: 緊急対応が必要

### Required Steps（必要なステップ）
DocDDの原則に基づき、必要なステップを判定:
- pdm: Specが必要（新機能、大きな変更）
- architect: Plan/ADRが必要（設計変更、アーキテクチャ影響）
- designer: UI要件が必要（UI変更）
- implementer: 実装が必要
- qa: テストが必要
- reviewer: レビューが必要

## 出力フォーマット（JSON）
{
  "intent": "<intent>",
  "scope": "<scope>",
  "urgency": "<urgency>",
  "confidence": <0.0-1.0>,
  "reasoning": "<日本語で判断理由>",
  "required_steps": ["<step1>", "<step2>", ...],
  "start_from": "<最初のステップ>",
  "skip_steps": ["<スキップするステップ>"],
  "suggested_task_id": "<推奨タスクID>",
  "related_docs": ["<関連ドキュメントパス>"]
}

JSONのみを出力してください。
EOF
}

# Fallback: keyword-based intent detection
detect_intent_keywords() {
    local request="$1"
    local lower_request
    lower_request=$(echo "$request" | tr '[:upper:]' '[:lower:]')

    # Check patterns in order of specificity
    if echo "$lower_request" | grep -qE 'バグ|bug|fix|修正|直して|エラー|error|動かない|壊れ'; then
        echo "bug_fix"
    elif echo "$lower_request" | grep -qE 'セキュリティ|security|脆弱性|vulnerability|認証|auth'; then
        echo "security"
    elif echo "$lower_request" | grep -qE 'リファクタ|refactor|整理|改善|きれいに'; then
        echo "refactor"
    elif echo "$lower_request" | grep -qE 'パフォーマンス|performance|高速|optimize|遅い|速く'; then
        echo "optimization"
    elif echo "$lower_request" | grep -qE 'ui|ux|画面|デザイン|レイアウト|表示'; then
        echo "ui_change"
    elif echo "$lower_request" | grep -qE 'ドキュメント|doc|readme|説明|ガイド'; then
        echo "documentation"
    elif echo "$lower_request" | grep -qE 'テスト|test|検証|coverage'; then
        echo "testing"
    elif echo "$lower_request" | grep -qE '設定|config|環境変数|env'; then
        echo "config_change"
    elif echo "$lower_request" | grep -qE '依存|dependency|ライブラリ|update|upgrade'; then
        echo "dependency"
    else
        echo "new_feature"
    fi
}

# Determine scope from keywords
detect_scope_keywords() {
    local request="$1"
    local lower_request
    lower_request=$(echo "$request" | tr '[:upper:]' '[:lower:]')

    if echo "$lower_request" | grep -qE 'アーキテクチャ|全体|システム|大規模|architecture'; then
        echo "large"
    elif echo "$lower_request" | grep -qE '機能|feature|モジュール|コンポーネント'; then
        echo "medium"
    else
        echo "small"
    fi
}

# Map intent to required steps
intent_to_steps() {
    local intent="$1"
    local scope="$2"
    local has_spec="$3"
    local has_plan="$4"

    local steps=()

    case "$intent" in
        new_feature)
            [[ "$has_spec" != "true" ]] && steps+=("pdm")
            [[ "$has_plan" != "true" && "$scope" != "small" ]] && steps+=("architect")
            steps+=("implementer" "qa" "reviewer")
            ;;
        bug_fix)
            steps+=("implementer" "qa" "reviewer")
            ;;
        refactor|optimization)
            [[ "$scope" == "large" && "$has_plan" != "true" ]] && steps+=("architect")
            steps+=("implementer" "qa" "reviewer")
            ;;
        security)
            [[ "$has_plan" != "true" ]] && steps+=("architect")
            steps+=("implementer" "qa" "reviewer")
            ;;
        ui_change)
            [[ "$has_spec" != "true" ]] && steps+=("designer")
            steps+=("implementer" "qa" "reviewer")
            ;;
        documentation)
            steps+=("implementer" "reviewer")
            ;;
        testing)
            steps+=("qa" "implementer" "reviewer")
            ;;
        config_change|dependency)
            steps+=("implementer" "qa" "reviewer")
            ;;
        *)
            steps+=("pdm" "architect" "implementer" "qa" "reviewer")
            ;;
    esac

    echo "${steps[*]}"
}

# Analyze intent (main function)
analyze_intent() {
    local request="$1"
    local use_ai="${2:-false}"
    local context="${3:-}"

    log_info "Analyzing intent: $request"

    # Get DocDD context if not provided
    if [[ -z "$context" ]]; then
        local task_id
        task_id=$("${SCRIPT_DIR}/docdd-scanner.sh" --find-related "$request" 2>/dev/null || true)

        if [[ -n "$task_id" ]]; then
            context=$("${SCRIPT_DIR}/docdd-scanner.sh" --json "$task_id" 2>/dev/null || echo "{}")
        else
            context="{\"task_id\": \"new\", \"artifacts\": {}}"
        fi
    fi

    # Parse context
    local has_spec="false"
    local has_plan="false"

    if echo "$context" | jq -e '.artifacts.spec != null' >/dev/null 2>&1; then
        has_spec="true"
    fi
    if echo "$context" | jq -e '.artifacts.plan != null' >/dev/null 2>&1; then
        has_plan="true"
    fi

    # Detect intent and scope
    local intent
    local scope
    intent=$(detect_intent_keywords "$request")
    scope=$(detect_scope_keywords "$request")

    # Get required steps based on intent and existing artifacts
    local steps
    steps=$(intent_to_steps "$intent" "$scope" "$has_spec" "$has_plan")

    # Determine start_from
    local start_from
    start_from=$(echo "$steps" | awk '{print $1}')

    # Calculate confidence (higher if we have more context)
    local confidence="0.7"
    if [[ -n "$context" && "$context" != "{}" ]]; then
        confidence="0.85"
    fi

    # Generate output
    local steps_json
    steps_json=$(echo "$steps" | tr ' ' '\n' | jq -R . | jq -s .)

    cat << EOF
{
  "intent": "${intent}",
  "scope": "${scope}",
  "urgency": "medium",
  "confidence": ${confidence},
  "reasoning": "キーワード分析による判定。Intent: ${intent}, Scope: ${scope}。既存Spec: ${has_spec}, 既存Plan: ${has_plan}",
  "required_steps": ${steps_json},
  "start_from": "${start_from}",
  "skip_steps": [],
  "docdd_context": ${context}
}
EOF
}

# Main
main() {
    local request=""
    local use_ai=false
    local with_context=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --ai)
                use_ai=true
                shift
                ;;
            --with-context)
                with_context=true
                shift
                ;;
            -h|--help)
                cat << EOF
Usage: $(basename "$0") [options] "<user request>"

Options:
  --ai              Use AI for deeper analysis (requires API)
  --with-context    Include DocDD context in analysis
  -h, --help        Show this help

Examples:
  $(basename "$0") "認証機能を追加して"
  $(basename "$0") --with-context "GH-123のバグを修正"
EOF
                exit 0
                ;;
            *)
                request="$1"
                shift
                ;;
        esac
    done

    if [[ -z "$request" ]]; then
        echo "Error: No request provided" >&2
        exit 1
    fi

    analyze_intent "$request" "$use_ai"
}

main "$@"
