---
description: Full-auto development - Issue to PR with zero interaction
allowed-tools: Bash, Read, Grep, Glob, Task
---

# Autopilot Development

Fully automated pipeline: Issue -> Worktree -> Route Selection -> Implementation -> Quality Gates -> PR -> Review.

## Task

$ARGUMENTS

## Instructions

Execute the following steps **in order**:

### Step 0: Parse Issue Number and Flags (BLOCKING)

Parse `$ARGUMENTS` for an issue number, Linear URL/key, and optional flags:

**Issue input formats:**

- `#123` format (e.g., `/autopilot #261`)
- `--issue 123` format (e.g., `/autopilot --issue 261`)
- Bare number (e.g., `/autopilot 261`)
- Linear URL (e.g., `/autopilot https://linear.app/codama/issue/COD-41`)
- Linear Issue key (e.g., `/autopilot COD-7`)

**Optional flags:**

- `--yolo` — Enable YOLO mode (DevContainer headless execution with `--dangerously-skip-permissions`)
- `--max-turns N` — Override max agent turns (default: 30, only applies in YOLO mode)

**YOLO mode auto-detection:**
If `DEVCONTAINER=true` environment variable is set, YOLO mode is enabled automatically.

```bash
YOLO_MODE=false
MAX_TURNS=30

# Parse --yolo flag
if echo "$ARGUMENTS" | grep -qF -- "--yolo"; then
    YOLO_MODE=true
fi

# Parse --max-turns N
if echo "$ARGUMENTS" | grep -qE -- "--max-turns [0-9]+"; then
    MAX_TURNS=$(echo "$ARGUMENTS" | grep -oE -- "--max-turns [0-9]+" | awk '{print $2}')
fi

# Auto-detect DevContainer
if [ "${DEVCONTAINER:-}" = "true" ] && [ "$YOLO_MODE" = "false" ]; then
    YOLO_MODE=true
    echo "🔓 YOLO mode auto-enabled (DEVCONTAINER=true detected)"
fi

if [ "$YOLO_MODE" = "true" ]; then
    echo "🔓 YOLO mode: ON (--dangerously-skip-permissions)"
    echo "   Max turns: $MAX_TURNS"
else
    echo "🔒 Safe mode: ON (standard permissions)"
fi
```

**Step 0.1: Detect Linear URL and create GitHub Issue if needed**

Before parsing the issue number, check if `$ARGUMENTS` contains a Linear URL:

```bash
LINEAR_URL=$(echo "$ARGUMENTS" | grep -oE 'https://linear\.app/[^[:space:]]+/issue/[^[:space:]]+' | head -1)

if [ -n "$LINEAR_URL" ]; then
    echo "Linear URL detected: $LINEAR_URL"

    # Extract the Linear issue ID from the URL (e.g., COD-41)
    LINEAR_ISSUE_ID=$(echo "$LINEAR_URL" | grep -oE '[A-Z]+-[0-9]+$' | head -1)
    if [ -z "$LINEAR_ISSUE_ID" ]; then
        LINEAR_ISSUE_ID=$(echo "$LINEAR_URL" | grep -oE '[A-Z]+-[0-9]+' | head -1)
    fi
    echo "Linear issue ID: $LINEAR_ISSUE_ID"

    # Fetch Linear issue content using the Linear GraphQL API (if LINEAR_API_KEY is set)
    LINEAR_TITLE=""
    LINEAR_DESCRIPTION=""

    if [ -n "${LINEAR_API_KEY:-}" ]; then
        echo "Fetching Linear issue via API..."
        LINEAR_RESPONSE=$(curl -s -X POST "https://api.linear.app/graphql" \
            -H "Authorization: ${LINEAR_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"query\": \"{ issue(id: \\\"${LINEAR_ISSUE_ID}\\\") { title description } }\"}" 2>/dev/null || echo "")

        if [ -n "$LINEAR_RESPONSE" ]; then
            LINEAR_TITLE=$(echo "$LINEAR_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('issue',{}).get('title',''))" 2>/dev/null || echo "")
            LINEAR_DESCRIPTION=$(echo "$LINEAR_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('data',{}).get('issue',{}).get('description',''))" 2>/dev/null || echo "")
        fi
    fi

    # If title is still empty, use the Linear issue ID as fallback title
    if [ -z "$LINEAR_TITLE" ]; then
        LINEAR_TITLE="${LINEAR_ISSUE_ID}"
        echo "Warning: Could not fetch Linear issue title. Using issue ID as title."
        echo "Set LINEAR_API_KEY environment variable for full Linear issue content."
    fi

    # Build GitHub issue body (include Linear URL and bare key for traceability)
    LINEAR_GITHUB_BODY="## Origin

Linear Issue: ${LINEAR_ISSUE_ID}
Linear URL: ${LINEAR_URL}"

    if [ -n "$LINEAR_DESCRIPTION" ]; then
        LINEAR_GITHUB_BODY="${LINEAR_GITHUB_BODY}

## Description

${LINEAR_DESCRIPTION}"
    fi

    # Create GitHub Issue with Linear content
    echo "Creating GitHub Issue from Linear issue ${LINEAR_ISSUE_ID}..."
    CREATED_ISSUE_URL=$(gh issue create \
        --title "$LINEAR_TITLE" \
        --body "$LINEAR_GITHUB_BODY" \
        2>/dev/null || echo "")

    if [ -z "$CREATED_ISSUE_URL" ]; then
        echo "BLOCKED: Failed to create GitHub Issue from Linear issue ${LINEAR_ISSUE_ID}."
        echo "Please create a GitHub Issue manually and run /autopilot with the issue number."
        exit 1
    fi

    # Extract GitHub issue number from the created URL
    ISSUE_NUMBER=$(echo "$CREATED_ISSUE_URL" | grep -oE '[0-9]+$' | head -1)
    echo "GitHub Issue created: #${ISSUE_NUMBER} (${CREATED_ISSUE_URL})"
fi
```

**Step 0.1.5: Detect Linear Issue key (COD-XX format)**

If no Linear URL was detected, check if the argument is a Linear Issue key (e.g., `COD-7`).
This searches existing GitHub Issues for a matching `### 🔗 Linear` section in the body.

```bash
if [ -z "${ISSUE_NUMBER:-}" ]; then
    # Strip flags (--yolo, --max-turns N, --issue N) before Linear key detection
    ARGS_STRIPPED=$(echo "$ARGUMENTS" | sed 's/--[a-z-]*\( [0-9]*\)\{0,1\}//g' | xargs)
    LINEAR_KEY=""
    if echo "$ARGS_STRIPPED" | grep -qE '^[A-Z]+-[0-9]+$'; then
        LINEAR_KEY=$(echo "$ARGS_STRIPPED" | grep -oE '^[A-Z]+-[0-9]+$')
        echo "🔗 Linear key detected: $LINEAR_KEY — searching GitHub Issues..."
    fi

    # If Linear key detected, search GitHub Issues for matching body
    if [ -n "$LINEAR_KEY" ]; then
        MATCHED_ISSUES=$(gh issue list --state open --search "$LINEAR_KEY" --json number,body \
            --jq "[.[] | select(.body | test(\"Linear.*${LINEAR_KEY}\")) | .number]" \
            2>/dev/null)
        MATCH_COUNT=$(echo "$MATCHED_ISSUES" | jq 'length' 2>/dev/null || echo "0")

        if [ "$MATCH_COUNT" -eq 0 ]; then
            echo "BLOCKED: No open GitHub Issue found with Linear key '$LINEAR_KEY' in body."
            echo "  Ensure the Issue body contains a '### 🔗 Linear' section with 'Linear Issue: $LINEAR_KEY'."
            exit 1
        elif [ "$MATCH_COUNT" -gt 1 ]; then
            echo "BLOCKED: Multiple open GitHub Issues found with Linear key '$LINEAR_KEY':"
            echo "$MATCHED_ISSUES" | jq -r '.[] | "  - #\(.)"'
            echo "  Specify the GitHub Issue number directly: /autopilot #<number>"
            exit 1
        fi

        ISSUE_NUMBER=$(echo "$MATCHED_ISSUES" | jq '.[0]')
        echo "🔗 Linear key $LINEAR_KEY → GitHub Issue #$ISSUE_NUMBER"
    fi
fi
```

**Step 0.2: Parse GitHub issue number from arguments (if not set by Linear flow)**

```bash
if [ -z "${ISSUE_NUMBER:-}" ]; then
    # Try #123 format
    ISSUE_NUMBER=$(echo "$ARGUMENTS" | grep -oE '#[0-9]+' | head -1 | tr -d '#')

    # Try --issue 123 format
    if [ -z "$ISSUE_NUMBER" ]; then
        ISSUE_NUMBER=$(echo "$ARGUMENTS" | grep -oE -- '--issue [0-9]+' | head -1 | awk '{print $2}')
    fi

    # Try bare number
    if [ -z "$ISSUE_NUMBER" ]; then
        ISSUE_NUMBER=$(echo "$ARGUMENTS" | grep -oE '\b[0-9]+\b' | head -1)
    fi
fi
```

**If no issue number found, STOP with error:**

```
BLOCKED: /autopilot requires a GitHub Issue number, Linear URL, or Linear Issue key.

Usage:
  /autopilot #123
  /autopilot --issue 123
  /autopilot 123
  /autopilot https://linear.app/team/issue/TEAM-123  ← Linear URL (creates GitHub Issue)
  /autopilot COD-7    ← Linear Issue key (searches GitHub Issue body for matching key)

Options:
  --yolo          Enable YOLO mode (headless, no permission prompts)
  --max-turns N   Max agent turns (default: 30, YOLO mode only)

Note: When using a Linear URL, set LINEAR_API_KEY environment variable for
full issue content (title + description). Without it, only the issue ID is
used as the GitHub Issue title.
```

### Step 1: Verify Issue

```bash
ISSUE_NUMBER=<parsed_number>
gh issue view "$ISSUE_NUMBER" --json number,title,body,labels,state
```

Extract and store:

- `ISSUE_TITLE` — Issue title
- `ISSUE_BODY` — Full Issue body
- `ISSUE_LABELS` — All label names (comma-separated)
- `ISSUE_AC` — Acceptance Criteria extracted from body
- `ISSUE_STATE` — open/closed

**If issue does not exist, STOP with error:**

```
BLOCKED: Issue #<N> not found. Verify the issue number and try again.
```

**If issue state is CLOSED, STOP with error:**

```
BLOCKED: Issue #<N> is already closed. /autopilot only works with open issues.
```

### Step 1.5: Detect Parent Epic

Parse the Issue body for a parent Epic reference to enable status tracking.

```bash
PARENT_EPIC=""
if [ -n "$ISSUE_BODY" ]; then
    PARENT_EPIC=$(printf '%s' "$ISSUE_BODY" | grep -oE 'Part of #[0-9]+' | head -1 | grep -oE '[0-9]+' || true)
fi

if [ -n "$PARENT_EPIC" ]; then
    echo "Parent Epic: #$PARENT_EPIC (status tracking enabled)"
else
    echo "Parent Epic: none (status tracking skipped)"
fi
```

### Step 2: DevContainer Detection

Parse Issue body to determine if DevContainer is needed:

```bash
SKIP_DEVCONTAINER=false

# Re-fetch Issue body if not already stored (fallback safety)
if [ -z "$ISSUE_BODY" ]; then
    ISSUE_BODY=$(gh issue view "$ISSUE_NUMBER" --json body --jq '.body' 2>/dev/null || echo "")
    if [ -z "$ISSUE_BODY" ]; then
        echo "⚠️  Issue body の取得に失敗。安全側フォールバック: DevContainer を起動します"
    fi
fi

if [ -n "$ISSUE_BODY" ]; then
    if printf '%s' "$ISSUE_BODY" | grep -qF "DevContainer 不要"; then
        SKIP_DEVCONTAINER=true
        echo "🐳 DevContainer: SKIP (Issue に「DevContainer 不要」チェックあり)"
    fi
    if printf '%s' "$ISSUE_BODY" | grep -qF "required: false"; then
        SKIP_DEVCONTAINER=true
        echo "🐳 DevContainer: SKIP (Issue に required: false セクションあり)"
    fi
    if printf '%s' "$ISSUE_BODY" | grep -qF "[Doc]"; then
        if ! printf '%s' "$ISSUE_BODY" | grep -qF "DevContainer 必要"; then
            SKIP_DEVCONTAINER=true
            echo "🐳 DevContainer: SKIP (ドキュメント Issue、DevContainer 必要チェックなし)"
        fi
    fi
fi

echo "🐳 DevContainer 判定: $([ \"$SKIP_DEVCONTAINER\" = \"true\" ] && echo '不要' || echo '必要')"
```

### Step 3: Create Worktree

```bash
git fetch origin main --quiet 2>/dev/null || true

if [ "$SKIP_DEVCONTAINER" = "true" ]; then
    ./tools/worktree/spawn.sh implementer --issue "$ISSUE_NUMBER" --no-devcontainer
else
    ./tools/worktree/spawn.sh implementer --issue "$ISSUE_NUMBER"
fi
```

After worktree creation, determine the absolute worktree path:

```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
# Use word-boundary match to avoid substring collisions (e.g., #12 matching #123)
WORKTREE_PATH=$(git worktree list | grep -E "[-/]${ISSUE_NUMBER}([^0-9]|$)" | awk '{print $1}' | head -1)
# Fallback: parse spawn.sh output for the worktree path
if [ -z "$WORKTREE_PATH" ]; then
    WORKTREE_PATH=$(git worktree list | tail -1 | awk '{print $1}')
fi
```

**If `WORKTREE_PATH` is empty or does not exist, STOP with error.**

### Step 3.5: Update Epic Status — In Progress (Non-Blocking)

If a parent Epic was detected in Step 1.5, launch `issue-project-manager` in the background to update status to `in_progress`. This runs concurrently with route selection and the implementer and must never block the pipeline.

```
if PARENT_EPIC is not empty:
    Task(
      subagent_type: "issue-project-manager",
      model: "haiku",
      description: "Status: #<ISSUE_NUMBER> → in_progress",
      run_in_background: true,
      prompt: "Update status for Issue #<ISSUE_NUMBER> to in_progress.
        ISSUE_NUMBER=<ISSUE_NUMBER>
        TARGET_STATUS=in_progress
        Follow the epic-status-manager skill workflow."
    )
```

### Step 4: Route Selection

Determine the execution route from `ISSUE_LABELS`. **Evaluate in strict priority order** (first match wins). This resolves multi-label conflicts (e.g., an issue with both `security` and `frontend` labels routes to `security`):

| Priority | Route          | Trigger Labels                            | Pipeline                                     |
| -------- | -------------- | ----------------------------------------- | -------------------------------------------- |
| 1        | `security`     | `security`, `auth`                        | Implementer **→** Security-Auditor (audit)   |
| 2        | `architecture` | `architecture`, `refactor`, `refactoring` | Architect (plan) **→** Implementer (execute) |
| 3        | `tdd`          | `bug`, `fix`, `bugfix`                    | Implementer (test-first mode)                |
| 4        | `frontend`     | `frontend`, `ui`, `design`                | Implementer **→** Designer (review)          |
| 5        | `docs`         | `documentation`, `docs`                   | Implementer (lightweight gates)              |
| 6        | `default`      | _(everything else)_                       | Implementer (standard)                       |

Display the selected route:

```
Route: <selected_route>
Pipeline: <agent sequence>
```

---

### Step 5: Execute Route

Based on the selected route, execute the appropriate pipeline.

---

#### Route: `default` / `tdd` / `docs`

**Single implementer subagent.** Launch with Task tool:

- `subagent_type`: `"implementer"`
- `mode`: `"bypassPermissions"`
- `description`: `"Autopilot: Issue #<N> (<route>)"`

**YOLO mode**: If `YOLO_MODE=true`, the implementer subagent runs with full bypass permissions. No additional changes needed since `mode: "bypassPermissions"` is already set. The `--max-turns` value is passed via the prompt for the implementer to self-limit.

The subagent prompt MUST include all sections from the **Implementer Prompt Template** below, with these route-specific overrides:

| Route     | Phase 2 Override                                                                                                                                | Phase 3 Override                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `default` | (none)                                                                                                                                          | (none)                                                                                                            |
| `tdd`     | **Test-first**: Write a failing test for the bug FIRST, verify it fails, THEN implement the fix, verify test passes. Follow Red-Green-Refactor. | (none)                                                                                                            |
| `docs`    | **Documentation only**: Edit markdown/yaml docs in **Japanese** (see `.claude/rules/11-language.md`). No application code changes expected.     | **Lightweight gates**: Run only `./tools/contract format` and `./tools/contract lint`. Skip typecheck/test/build. |

After the implementer completes, go to **Step 6: Report Results**.

---

#### Route: `architecture`

**Two-stage pipeline: Architect → Implementer.**

**Pre-Stage: ADR Existence Check (Non-Blocking)**

Before launching the architect, run the ADR validation to surface any existing ADR issues and confirm whether a new ADR is needed:

```bash
cd "<WORKTREE_PATH>"

# Run ADR validation (exit 0 = all valid, exit 1 = warnings only, non-blocking)
./tools/contract adr-validate || true

# Count existing ADRs and determine next ADR number from filename only (not full path)
ADR_COUNT=$(find docs/02_architecture/adr -maxdepth 1 -name "0*.md" 2>/dev/null | wc -l | tr -d ' ')
LAST_ADR_NUM=$(find docs/02_architecture/adr -maxdepth 1 -name "0*.md" 2>/dev/null \
  | xargs -I{} basename {} | sort | tail -1 | grep -oE '^[0-9]+' | head -1)
if [[ -n "$LAST_ADR_NUM" ]]; then
  NEXT_ADR_NUM=$(printf "%04d" $((10#$LAST_ADR_NUM + 1)))
else
  NEXT_ADR_NUM="0001"
fi
echo "Existing ADRs: ${ADR_COUNT}, Next ADR number: ${NEXT_ADR_NUM}"
```

The result is passed to the architect prompt. If `./tools/contract adr-validate` returns exit code 1 (warnings), note it in the architect prompt so the architect can evaluate whether a new ADR is needed.

**Stage A — Architect (read-only plan)**

Launch with Task tool:

- `subagent_type`: `"architect"`
- `description`: `"Autopilot: Issue #<N> architecture plan"`

Prompt for architect:

> You are in AUTOPILOT mode. Produce an implementation plan for Issue #\<ISSUE_NUMBER\>.
>
> **Issue:** #\<ISSUE_NUMBER\> — \<ISSUE_TITLE\>
> **Issue Body:** (paste full body)
> **Working Directory:** \<WORKTREE_PATH\>
> **ADR Validation Result:** \<paste output of ./tools/contract adr-validate\>
> **Next ADR Number:** \<NEXT_ADR_NUM\>
>
> 1. Read AGENTS.md and understand repository architecture
> 2. Analyze the issue requirements and affected areas
> 3. Run `./tools/contract adr-validate` to check existing ADR quality and note the next ADR number for sequencing
> 4. Produce a structured plan:
>    - Files to create/modify (with rationale)
>    - Layer analysis (Clean Architecture / FSD compliance)
>    - Impact assessment (which modules are affected)
>    - Whether a new ADR is needed (if yes, specify next ADR number: `adr-<NEXT_ADR_NUM>-<title>.md`)
>    - If a new ADR is required: produce an ADR draft using the TEMPLATE in docs/02_architecture/adr/TEMPLATE.md
>    - Step-by-step implementation order
>    - Risk areas and mitigations
>
> Return the plan as structured markdown.

**Stage B — Implementer (execute the plan)**

After architect completes, launch implementer with Task tool:

- `subagent_type`: `"implementer"`
- `mode`: `"bypassPermissions"`
- `description`: `"Autopilot: Issue #<N> implement arch plan"`

Use the **Implementer Prompt Template** below, but prepend the architect's plan to Phase 2:

> **Architecture Plan (from Architect agent):**
> \<PASTE ARCHITECT OUTPUT HERE\>
>
> Follow this plan in Phase 2. If the plan recommends creating an ADR:
>
> 1. Create the ADR file at `docs/02_architecture/adr/<NEXT_ADR_NUM>-<title>.md` using the template at `docs/02_architecture/adr/TEMPLATE.md`
> 2. After creating or modifying ADRs, run `./tools/contract adr-validate --file <path>` to verify the ADR has all required sections

After the implementer completes, go to **Step 6: Report Results**.

---

#### Route: `frontend`

**Two-stage pipeline: Implementer → Designer review.**

**Stage A — Implementer**

Launch with the **Implementer Prompt Template** below. Add this override to Phase 2:

> **Frontend-specific requirements:**
>
> - Follow FSD strictly (app -> widgets -> features -> entities -> shared)
> - Use design tokens from design/tokens/ — no inline styles
> - All colors must have `dark:` variants, use `neutral-*` not `gray-*`
> - Implement UI states: Loading, Empty, Error
> - Import only from public API (index.ts)

**Stage B — Designer review (read-only, parallel with Codex MCP)**

After implementer creates the PR, launch designer review:

- `subagent_type`: `"designer"`
- `description`: `"Autopilot: Issue #<N> design review"`

Prompt for designer:

> Review the frontend changes for Issue #\<ISSUE_NUMBER\> in worktree \<WORKTREE_PATH\>.
>
> Run `git diff origin/main...HEAD` to see what changed.
>
> Check:
>
> 1. Design system compliance (design tokens used, no inline styles)
> 2. Dark mode (all colors have dark: variants, neutral-\* used)
> 3. FSD compliance (no cross-feature imports, public API only)
> 4. Accessibility (WCAG AA, contrast 4.5:1, focus rings, ARIA)
> 5. UI states (Loading/Empty/Error implemented)
>
> Return findings in P0/P1/P2 format.

If designer finds P0 issues, add them as a PR comment using `gh pr comment`.

After both complete, go to **Step 6: Report Results**.

---

#### Route: `security`

**Two-stage pipeline: Implementer → Security-Auditor.**

**Stage A — Implementer**

Launch with the **Implementer Prompt Template** below. Add this override to Phase 2:

> **Security-specific requirements:**
>
> - Validate ALL user input at boundaries (use Zod)
> - Use parameterized queries only — no string interpolation in SQL
> - Deny by default, allow explicitly for authorization
> - No secrets in code, no PII in logs
> - Hash passwords with bcrypt (cost >= 12)

**Stage B — Security-Auditor (read-only)**

After implementer creates the PR, launch security audit:

- `subagent_type`: `"security-auditor"`
- `description`: `"Autopilot: Issue #<N> security audit"`

Prompt for security-auditor:

> Security audit for Issue #\<ISSUE_NUMBER\> in worktree \<WORKTREE_PATH\>.
>
> Run `git diff origin/main...HEAD -- . ':!*.env*' ':!secrets/' ':!*.pem' ':!*.key' ':!*.secret' ':!*.p12' ':!*.pfx' ':!*.npmrc' ':!*.netrc'` to see what changed.
>
> Audit:
>
> 1. Hardcoded secrets or credentials
> 2. Input validation (SQL injection, XSS, command injection, path traversal)
> 3. Auth/authz (bypass, missing permission checks, CSRF)
> 4. Dependency vulnerabilities (check with `./tools/contract audit`)
>
> Return findings in P0/P1/P2 format.

If security-auditor finds P0 issues, add them as a PR comment using `gh pr comment`.

After both complete, go to **Step 6: Report Results**.

---

### Implementer Prompt Template (shared across all routes)

All routes that spawn an implementer MUST include these sections. Interpolate actual values for placeholders.

> **BEGIN IMPLEMENTER PROMPT**
>
> You are running in AUTOPILOT mode. Complete the entire pipeline autonomously with ZERO user interaction.
>
> **Issue:** #\<ISSUE_NUMBER\> — \<ISSUE_TITLE\>
>
> **Issue Body:** (paste full body)
>
> **Acceptance Criteria:** (paste extracted AC list)
>
> **Working Directory:** \<ABSOLUTE_WORKTREE_PATH\>
>
> **Execution Mode:** \<YOLO_MODE ? "YOLO (--dangerously-skip-permissions, max-turns: MAX_TURNS)" : "Safe"\>
>
> **CRITICAL**: Run ALL commands from within the worktree directory. Use `cd <WORKTREE_PATH>` before any command.
>
> **Phase 1: Understand Context**
>
> 1. Read AGENTS.md to understand repository contract
> 2. Read .worktree-context.yaml for task context
> 3. Search for related files using Grep/Glob (specs in .specify/specs/, requirements in docs/01_product/requirements/, existing code)
> 4. Understand the codebase patterns for the areas you will modify
>
> **Phase 2: Implement Changes**
>
> 1. Follow DocDD — implement according to Issue AC and any related specs
> 2. Apply minimal diff strategy — smallest change to satisfy AC
> 3. Follow architecture rules: Backend = Clean Architecture + DDD (presentation -> usecase -> domain <- infrastructure), Frontend = FSD (app -> widgets -> features -> entities -> shared)
> 4. Write/update tests for changed code
> 5. Update related documentation if behavior changes
>
> _(Insert route-specific Phase 2 overrides here if applicable)_
>
> **Phase 3: Quality Gates (3 retries max)**
>
> Run in order. If any gate fails, fix **only the failing gate's issue** (minimal diff) and retry (max 3 full cycles):
>
>     cd <WORKTREE_PATH>
>     ./tools/contract format
>     ./tools/contract lint
>     ./tools/contract typecheck
>     ./tools/contract test
>     ./tools/contract build
>
> _(For `docs` route: only format + lint)_
>
> Track per-gate status (PASS/FAIL) for each cycle. If after 3 cycles gates still fail, set QUALITY_GATES_PASSED=false and continue to Phase 4 (will create Draft PR).
>
> **Phase 4: Commit + Push**
>
> Before committing, verify no sensitive files are staged:
>
>     cd <WORKTREE_PATH>
>     # Check for sensitive files before committing
>     git status --porcelain | grep -iE '\.(env|pem|key|secret|p12|pfx|npmrc|netrc)' && echo "WARNING: Sensitive file detected — remove from staging" && exit 1
>     git add -A
>     git commit -m "<type>(<scope>): <subject>  Closes #<ISSUE_NUMBER>  Co-Authored-By: Claude <noreply@anthropic.com>"
>     git push -u origin HEAD
>
> Commit type from Issue labels: bug/fix -> fix, documentation/docs -> docs, chore/maintenance -> chore, refactor -> refactor, default -> feat.
> If Issue number cannot be determined at commit time, fall back to branch name for the `Closes #` reference.
>
> **Phase 5: Create PR**
>
> Create PR using gh CLI. If quality gates failed, add `--draft` flag.
>
> Before creating the PR, extract the Linear Issue key from the Issue body:
>
>     # Extract Linear key from Issue body for PR
>     # Handles both "Linear Issue: COD-7" and "Linear Issue: https://linear.app/.../COD-7"
>     LINEAR_KEY=$(echo "$ISSUE_BODY" | grep -oE '[A-Z]+-[0-9]+' \
>         | grep -v '^HTTP' | grep -v '^URL' | head -1)
>     # Validate extracted key looks like a Linear key (TEAM-NUMBER format)
>     if echo "$LINEAR_KEY" | grep -qE '^[A-Z]{2,}-[0-9]+$'; then
>         echo "🔗 Linear key found: $LINEAR_KEY — will include in PR title and body"
>     else
>         LINEAR_KEY=""
>     fi
>
> **PR title format:**
>
> Conventional Commits 形式。`$LINEAR_KEY` がある場合は subject 先頭に `[$LINEAR_KEY]` を付与する:
>
>     # With Linear key:    feat(auth): [COD-7] add token rotation support
>     # Without Linear key: feat(auth): add token rotation support
>     PR_TITLE="<type>(<scope>): $([ -n "$LINEAR_KEY" ] && echo "[$LINEAR_KEY] ")<subject>"
>
> PR body MUST contain:
>
> - Summary（概要）: 1〜3 文、**日本語**で記述
> - Changes（変更点）: 箇条書き、**日本語**で記述
> - AC Verification table: AC 内容・Evidence 説明は**日本語**で記述
> - Quality Gates table: Gate 名は英語維持、Status・備考は**日本語**
> - `Closes #<ISSUE_NUMBER>` (MANDATORY — GitHub キーワード構文のため英語固定)
> - If `$LINEAR_KEY` is non-empty: `Linear: <LINEAR_KEY>` (Linear Integration のキーワードのため英語固定)
> - Footer: `:robot: Generated with [Claude Code](https://claude.com/claude-code) via /autopilot`
>
> **言語ルール（`.claude/rules/11-language.md` 準拠）**: PR 説明文の自然言語部分は日本語で記述する。
> コード識別子・Conventional Commits の type/scope・技術用語・CLI コマンド・ファイルパスは英語を維持する。
>
> If quality gates failed, add a section explaining which gates failed and why.
>
> **Phase 6: AI Review + PR Comment (MUST — see `.claude/rules/09-ai-review.md`)**
>
> AI review is a **mandatory guardrail** in the coding agent pipeline. Results MUST be posted as a PR comment.
>
> **6.1 Collect safe diff:**
>
>     SAFE_DIFF=$(git diff origin/main...HEAD -- . ':!*.env*' ':!secrets/' ':!*.pem' ':!*.key' ':!*.secret' ':!*.p12' ':!*.pfx' ':!*.npmrc' ':!*.netrc')
>
> **6.2 Claude self-review (adversarial):**
>
> Apply adversarial review stance against the diff and the AC list captured in Phase 1 (do not re-fetch raw Issue body): question whether the implementation addresses the actual problem, verify AC coverage independently, do not trust self-assessment. Review for:
> - **AC Verification**: Does each AC have evidence (test, code, doc)?
> - **Security**: Hardcoded secrets, injection, missing Zod validation, auth bypass
> - **Architecture**: Clean Architecture layer violations, FSD cross-slice imports, OpenAPI-first compliance, generated file edits
> - **Code Quality**: Error handling, edge cases, over-engineering beyond AC
>
> Categorize findings as P0 (blocker), P1 (important), P2 (suggestion).
>
> **6.3 Codex cross-model review (MUST attempt, non-blocking on failure):**
>
> MUST attempt Codex MCP review. Use the review prompt from `.claude/skills/codex-review/SKILL.md`. Timeout: 60s. If Codex MCP fails or times out, run Claude Adversarial-Enhanced Review as defined in `.claude/skills/codex-review/SKILL.md#claude-adversarial-enhanced-review-codex-mcp-fallback` (non-blocking). Record which reviewer was used in the PR comment.
>
> **6.4 P0 auto-fix cycle (max 2 iterations):**
>
> If P0 (blocker) findings exist from 6.2 or 6.3:
> 1. Fix the P0 issues (minimal diff)
> 2. Re-run quality gates
> 3. Create a NEW commit (do NOT amend or force-push), push
> 4. Re-collect safe diff and re-review (max 2 fix cycles to prevent loops)
>
> **6.5 Post AI review as PR comment (MUST):**
>
> After review is complete, post the combined results as a PR comment. This is **mandatory** — the PR is not considered complete without this comment.
>
>     PR_NUMBER=$(gh pr view --json number --jq '.number')
>     gh pr comment "$PR_NUMBER" --body "$(cat <<'REVIEW_EOF'
>     ## 🤖 AI Review (automated)
>
>     > Reviewers: Claude (self-review) + Codex MCP (cross-model)
>     > Pipeline: /autopilot Phase 6
>     > This review is advisory. It does not block merging.
>
>     ### Review Dimensions
>     - ✅/⚠️ AC Verification
>     - ✅/⚠️ Security
>     - ✅/⚠️ Architecture
>     - ✅/⚠️ Code Quality
>
>     ### P0 — Blockers
>     <!-- "None" or list of findings with [file:line] format -->
>
>     ### P1 — Important
>     <!-- "None" or list of findings -->
>
>     ### P2 — Suggestions
>     <!-- "None" or list of findings -->
>
>     ### AC Verification
>     | AC | Status | Evidence |
>     |----|--------|----------|
>     | AC-1: ... | ✅/⚠️ | test/code/doc path |
>
>     ### Codex Cross-Model Review
>     <!-- Codex findings or "unavailable" -->
>
>     ### Summary
>     <!-- One paragraph overall assessment -->
>
>     ---
>     *To act on findings: P0 items should be fixed before merge. P1 items should be addressed in this PR or tracked as follow-up Issues. P2 items are optional.*
>     REVIEW_EOF
>     )"
>
> Replace the template placeholders with actual review results. If `gh pr comment` fails, log the error and include review results in the Final Report instead.
>
> **6.6 Verify comment posted:**
>
> Confirm the AI review comment exists on the PR:
>
>     gh pr view "$PR_NUMBER" --json comments --jq '.comments | map(select(.body | contains("AI Review (automated)"))) | length'
>
> If count is 0, retry posting once. If still fails, mark `AI_REVIEW_POSTED=false` in the Final Report.
>
> **Final Report** — return structured report with: Status (SUCCESS/PARTIAL), PR URL, Draft yes/no, Quality Gates table (PASS/FAIL per gate), Review Findings (P0/P1/P2 counts), AC Coverage (N/total verified), AI Review Comment Posted (yes/no).
>
> **END IMPLEMENTER PROMPT**

---

### Step 5.5: Update Epic Status — In Review (Non-Blocking)

After the implementer completes and a PR URL is available, update the parent Epic status to `in_review`. Extract the PR URL from the implementer's final report.

```
if PARENT_EPIC is not empty AND PR_URL is available:
    Task(
      subagent_type: "issue-project-manager",
      model: "haiku",
      description: "Status: #<ISSUE_NUMBER> → in_review",
      run_in_background: true,
      prompt: "Update status for Issue #<ISSUE_NUMBER> to in_review.
        ISSUE_NUMBER=<ISSUE_NUMBER>
        TARGET_STATUS=in_review
        PR_URL=<PR_URL>
        Follow the epic-status-manager skill workflow."
    )
```

### Step 6: Report Results

When all agents complete, display the final report to the user:

```markdown
## /autopilot Complete

### Issue #<N>: <title>

- Route: <selected_route>
- Pipeline: <agent sequence with status>
- PR: <URL>
- Status: SUCCESS / PARTIAL (Draft PR - quality gates failed)

### Quality Gates

| Gate      | Status         |
| --------- | -------------- |
| format    | PASS/FAIL/SKIP |
| lint      | PASS/FAIL/SKIP |
| typecheck | PASS/FAIL/SKIP |
| test      | PASS/FAIL/SKIP |
| build     | PASS/FAIL/SKIP |

### Agent Results

| Agent            | Status               | Key Findings              |
| ---------------- | -------------------- | ------------------------- |
| Architect        | PASS/SKIP            | <plan summary or "N/A">   |
| Implementer      | PASS/PARTIAL         | <implementation summary>  |
| Designer         | PASS/SKIP/<P0 count> | <findings or "N/A">       |
| Security-Auditor | PASS/SKIP/<P0 count> | <findings or "N/A">       |
| Codex MCP        | PASS/SKIP            | <advisory notes or "N/A"> |

### Review Summary

- P0 (Blockers): <count> — <from which agents>
- P1 (Important): <count>
- P2 (Suggestions): <count>

### AC Coverage

- <N>/<total> acceptance criteria verified
```

If any review agent found P0 issues that were NOT fixed by the implementer, flag them prominently.
