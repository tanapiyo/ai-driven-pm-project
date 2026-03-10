---
description: Start development with parallel subagent exploration
allowed-tools: Bash, Read, Grep, Glob, Task, AskUserQuestion
---

# Kickoff Development

Start a new task with parallel exploration.

## Task

$ARGUMENTS

## Instructions

Execute the following steps **in order**:

### Step 0: Environment Pre-flight Check (MANDATORY - BLOCKING)

**This step is MANDATORY before any other action. NO EXCEPTIONS.**

**CRITICAL RULE: All work MUST be done in a worktree directory. Root repository work is FORBIDDEN.**

1. Check current environment:

```bash
# Detect if we are in a worktree (not root repo)
IS_WORKTREE=$([ -f .git ] && echo "yes" || echo "no")
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
WORKING_DIR=$(pwd)
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "unknown")

echo "=== Environment Check ==="
echo "Working directory: $WORKING_DIR"
echo "Repository root: $REPO_ROOT"
echo "Current branch: $CURRENT_BRANCH"
echo "Is worktree: $IS_WORKTREE"
echo ""

# CRITICAL: Check if we are in root repository (NOT a worktree)
if [ "$IS_WORKTREE" = "no" ]; then
    echo "❌ BLOCKED: You are in the ROOT REPOSITORY, not a worktree."
    echo "   All work MUST be done in a worktree directory."
    echo ""
    echo "   Root repo work is FORBIDDEN. No exceptions."
    exit 1
else
    echo "✅ OK: Working in worktree directory"
fi
```

2. **If NOT in a worktree (IS_WORKTREE=no) - THIS IS BLOCKING:**
   - **STOP IMMEDIATELY** and inform user:

     ```
     ❌ BLOCKED: Root repository work is FORBIDDEN.

     You are currently in the root repository. All development work
     MUST be done in a worktree created from remote main HEAD.

     This ensures:
     - Clean separation from main branch
     - Always starting from latest remote state
     - No accidental commits to main/protected branches
     ```

   - Create worktree using the following approach:

   **If `ISSUE_NUMBER` is available (preferred — no branch name prompt needed):**

   ```bash
   # Fetch latest from remote first
   git fetch origin main

   # Create worktree using --issue flag (auto-generates branch name from issue)
   ./tools/worktree/spawn.sh implementer --issue $ISSUE_NUMBER
   ```

   **If no issue number (Hotfix/Trivial exception only):**
   - Use AskUserQuestion to get branch name for the task (suggest based on task description).
     Follow the 10-user-communication rule: each option MUST have a `description` field.

   ```bash
   # Fetch latest from remote first
   git fetch origin main

   # Generate branch name from task (kebab-case, max 40 chars)
   BRANCH_NAME="feat/$(echo '$ARGUMENTS' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | tr ' ' '-' | sed 's/--*/-/g' | cut -c1-40)"

   # Create worktree from remote main HEAD (MANDATORY)
   ./tools/worktree/spawn.sh implementer "$BRANCH_NAME" --from-remote-main
   ```

   - After worktree creation, the spawn.sh script will display a **HANDOFF BLOCK** with:
     - Copy-pasteable VS Code launch command
     - Copy-pasteable Claude continuation prompt

   - Instruct user:

     ```
     ✅ Worktree created at: ./worktrees/<branch-name>
        Based on: origin/main (remote HEAD)

     **MANDATORY: You MUST now work in the new worktree directory.**

     📋 See the HANDOFF BLOCK above for:
     1. VS Code launch command (copy and run)
     2. Claude prompt (copy and paste in new window)

     The handoff prompt is also saved to: ./worktrees/<branch-name>/.claude-handoff.md

     ⚠️  Do NOT continue work in this directory.
     ```

   - **STOP here - DO NOT PROCEED** until user is in worktree

3. **If already in worktree (IS_WORKTREE=yes):**
   - Verify worktree is based on recent main:

   ```bash
   # Check if worktree is reasonably up to date with origin/main
   git fetch origin main --quiet 2>/dev/null || true
   BEHIND_COUNT=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")
   if [ "$BEHIND_COUNT" -gt 50 ]; then
       echo "⚠️  WARNING: This worktree is $BEHIND_COUNT commits behind origin/main"
       echo "   Consider rebasing or creating a new worktree"
   else
       echo "✅ Worktree is up to date with origin/main (within $BEHIND_COUNT commits)"
   fi
   ```

   - Proceed to Step 1
   - Optionally check if DevContainer is running:

   ```bash
   # Check for DevContainer marker
   if [ -f /workspace/.dev-ready ] || [ -f ./.dev-ready ]; then
     echo "DevContainer: Ready"
   else
     echo "DevContainer: Not detected (consider running ./tools/contract up)"
   fi
   ```

### Step 0.5: Issue Number Verification (MANDATORY)

**Every kickoff MUST be linked to a GitHub Issue for traceability.**

1. Parse `$ARGUMENTS` for an issue number reference:
   - `#123` format (e.g., `/kickoff #261`)
   - `--issue 123` format (e.g., `/kickoff --issue 261`)
   - Bare number at the end (e.g., `/kickoff 261`)

2. **If issue number is found:**
   - Extract the number as `ISSUE_NUMBER`
   - Verify the issue exists using `gh issue view <ISSUE_NUMBER> --json number,title,state`
   - **If verification succeeds**: Display `Issue #<ISSUE_NUMBER>: <title> (<state>)` and proceed to Step 1
   - **If verification fails** (typo, permissions, non-existent issue):
     - Display the error and use `AskUserQuestion` to prompt (per rule 10-user-communication):
       - **Option A (Recommended)**: "Re-enter issue number" — description: "Correct the issue number so the branch and PR link to the right Issue. Recommended unless this is a hotfix."
       - **Option B**: "Continue without issue (Hotfix/Trivial exception)" — description: "Proceed without an Issue link. Only appropriate for hotfixes or trivial changes; you will need to document the reason."
     - Retry verification if user provides a new number

3. **If NO issue number is found:**
   - Display warning:

     ```
     WARNING: No Issue number detected in task argument.

     Issue numbers are required to ensure:
     - Branch naming follows convention (type/description-NUMBER)
     - Traceability between work and GitHub Issues
     - Proper DoD verification

     Recommended usage:
       /kickoff #123
       /kickoff --issue 123
     ```

   - Use `AskUserQuestion` to prompt (per rule 10-user-communication):
     - **Option A (Recommended)**: "Enter issue number" — description: "Provide the GitHub Issue number to ensure branch naming, traceability, and DoD verification all work correctly."
     - **Option B**: "Continue without issue (Hotfix/Trivial exception)" — description: "Skip the Issue link. Only valid for hotfixes or trivial one-liner fixes. You must document the exception reason."
   - If user provides an issue number, set `ISSUE_NUMBER` and proceed
   - If user chooses exception, document the reason and proceed without issue number

### Step 0.6: DevContainer Requirement Detection

**Parse Issue body to determine if DevContainer is needed.**

If `ISSUE_NUMBER` is available, check the Issue body for DevContainer hints:

```bash
# Default: DevContainer required (safe side fallback)
SKIP_DEVCONTAINER=false

if [ -n "$ISSUE_NUMBER" ]; then
    ISSUE_BODY=$(gh issue view "$ISSUE_NUMBER" --json body --jq '.body' 2>/dev/null || echo "")

    if [ -n "$ISSUE_BODY" ]; then
        # Check 1: Explicit checkbox "DevContainer 不要" checked in Issue body
        if printf '%s' "$ISSUE_BODY" | grep -qF "DevContainer 不要"; then
            SKIP_DEVCONTAINER=true
            echo "🐳 DevContainer: SKIP (Issue に「DevContainer 不要」チェックあり)"
        fi

        # Check 2: 🐳 DevContainer section with required: false
        if printf '%s' "$ISSUE_BODY" | grep -qF "required: false"; then
            SKIP_DEVCONTAINER=true
            echo "🐳 DevContainer: SKIP (Issue に required: false セクションあり)"
        fi

        # Check 3: Documentation template — checkbox "DevContainer 必要" NOT checked
        # (documentation.yml uses inverted logic: check = required)
        if printf '%s' "$ISSUE_BODY" | grep -qF "[Doc]"; then
            if ! printf '%s' "$ISSUE_BODY" | grep -qF "DevContainer 必要"; then
                SKIP_DEVCONTAINER=true
                echo "🐳 DevContainer: SKIP (ドキュメント Issue、DevContainer 必要チェックなし)"
            fi
        fi
    else
        echo "⚠️  Issue body の取得に失敗。安全側フォールバック: DevContainer を起動します"
    fi
else
    echo "ℹ️  Issue 番号なし。DevContainer はデフォルトで起動します"
fi

# Display final decision
if [ "$SKIP_DEVCONTAINER" = "true" ]; then
    echo "🐳 DevContainer 判定: 不要（--no-devcontainer を spawn.sh に渡します）"
else
    echo "🐳 DevContainer 判定: 必要（通常起動）"
fi
```

**安全側フォールバック:**

- Issue body が取得できない場合 → DevContainer 起動
- `### 🐳 DevContainer` セクションがない場合（既存 Issue） → DevContainer 起動
- 判定不能な場合 → DevContainer 起動

**Worktree 作成時の適用:**

Step 0 の worktree 作成で `SKIP_DEVCONTAINER` を使用:

```bash
if [ "$SKIP_DEVCONTAINER" = "true" ]; then
    ./tools/worktree/spawn.sh implementer --issue $ISSUE_NUMBER --no-devcontainer
else
    ./tools/worktree/spawn.sh implementer --issue $ISSUE_NUMBER
fi
```

**Phase transition summary (output before Step 1):**

```
現在地: 環境チェック完了 — ワークツリーとブランチが確認されました
次のアクション: DocDD 成果物チェック（Spec / AC / 品質ゲート選定）
残りステップ: 6 ステップ残り（Step 1 → 6.5）
```

### Step 1: SDD Artifact Check (BLOCKING)

**This step is BLOCKING. NO implementation without completing this.**

#### 1.1 Locate Related Documents

Read and identify:

- [ ] **Issue の DoD**: 完了条件を確認（`ISSUE_NUMBER` がある場合は `gh issue view` で取得）
- [ ] **Product Requirements**: `docs/01_product/requirements/` で関連 FR/NFR を検索
- [ ] **Screen Spec**: `docs/01_product/screens/` で画面仕様を確認（UI変更の場合）
- [ ] **Feature Spec**: `.specify/specs/<feature>/` で実装仕様を確認

```bash
# Fetch Issue DoD if issue number is available
if [ -n "$ISSUE_NUMBER" ]; then
    gh issue view "$ISSUE_NUMBER" --json title,body,labels,state
fi

# Search for related requirements
grep -r "<keyword>" docs/01_product/requirements/ || echo "No matching requirements found"

# Check existing specs
ls -la .specify/specs/ 2>/dev/null || echo "No specs directory"
```

#### 1.2 Acceptance Criteria Extraction

Extract AC from Issue and Spec, list explicitly:

```markdown
## Acceptance Criteria (extracted)

- [ ] AC1: ...
- [ ] AC2: ...
- [ ] AC3: ...
```

#### 1.2.1 Frontend AC Enhancement (if UI change)

If the task involves frontend changes (`projects/apps/web/`):

1. **Detect frontend scope**:

```bash
# Check if task involves web app changes
FRONTEND_FILES=$(find .specify/specs/ docs/01_product/screens/ -name "*.md" 2>/dev/null | head -5)
echo "Related screen specs: $FRONTEND_FILES"
```

2. **Extract UI State ACs** (append to AC list):

```markdown
### UI State AC (frontend-specific)

- [ ] Loading: スケルトン/スピナー表示
- [ ] Empty: データなし時の代替表示
- [ ] Error: エラー発生時のメッセージ表示
- [ ] Permission Denied: 権限不足時のメッセージ（該当する場合）
- [ ] Dark Mode: Light/Dark 両モードで正常表示
```

3. **Evidence plan** (PR提出時に必要):

```markdown
### Evidence Plan

- [ ] Screenshots: Light + Dark mode
- [ ] Design system: tokens使用、inline style なし
- [ ] FSD: cross-feature import なし
```

4. **Reference screen spec** (if exists):

```bash
# Search for related screen spec
ls docs/01_product/screens/ 2>/dev/null | grep -i "<keyword>"
```

#### 1.3 Quality Gate Selection

Identify required quality checks for this implementation:

| Gate      | Required?              | Reason                       |
| --------- | ---------------------- | ---------------------------- |
| format    | Always                 | -                            |
| lint      | Always                 | -                            |
| typecheck | Always                 | -                            |
| test      | If code change         | -                            |
| guardrail | If architecture change | -                            |
| e2e       | If UI change           | Frontend AC の証跡として必要 |

#### 1.4 Exception Check

If this is a Hotfix/Trivial/Dependency Update:

- Document the exception reason
- Proceed to Step 2 with quality gates still required

#### 1.5 Spec Validation (if Spec exists)

```bash
./.specify/scripts/validate-spec.sh ".specify/specs/<feature-id>/spec.md"
```

#### 1.6 Spec Creation (if Spec does NOT exist)

For new features requiring Spec:

```bash
# Create spec directory and copy templates
FEATURE_ID="<feature-id>"
mkdir -p ".specify/specs/${FEATURE_ID}"
cp .specify/templates/spec.md ".specify/specs/${FEATURE_ID}/spec.md"
cp .specify/templates/plan.md ".specify/specs/${FEATURE_ID}/plan.md"
cp .specify/templates/tasks.md ".specify/specs/${FEATURE_ID}/tasks.md"
echo "Templates copied. Please fill in the spec before proceeding."
```

**STOP and help user fill in the Spec before proceeding to Step 2.**

#### 1.7 ADR Check (if architecture / refactor change)

If the Issue labels include `type:architect`, `architecture`, `refactor`, or `refactoring`, check whether a relevant ADR exists:

```bash
# Check if issue is architecture/refactor type
NEEDS_ADR=false
if echo "${ISSUE_LABELS:-}" | grep -qiE '(architect|architecture|refactor|refactoring)'; then
    NEEDS_ADR=true
fi

if [ "$NEEDS_ADR" = "true" ]; then
    echo "=== ADR Check (architecture/refactor issue detected) ==="

    # Run ADR validation on existing ADRs (non-blocking: exit 1 = warning only)
    ./tools/contract adr-validate || true

    # Check if any ADR exists that may relate to this issue
    ADR_COUNT=$(find docs/02_architecture/adr -name "0*.md" 2>/dev/null | wc -l | tr -d ' ')
    echo "Existing ADRs: ${ADR_COUNT}"

    # Prompt architect agent if no relevant ADR found
    echo ""
    echo "WARNING: This is an architecture/refactor issue."
    echo "  Per AGENTS.md DoD, an ADR is required before implementation."
    echo ""
    echo "  If no ADR covers this change, use the architect agent to create one:"
    echo "    /kickoff with subagent_type: architect"
    echo "  Or run the architect skill manually:"
    echo "    See .claude/agents/architect.md"
fi
```

**This step is non-blocking (warning only).** If no ADR exists for the change, display the warning above and recommend running the `architect` agent, but do NOT block the kickoff flow.

**Phase transition summary (output before Step 2):**

```
現在地: DocDD チェック完了 — AC 抽出・品質ゲート選定が完了しました
次のアクション: 並列サブエージェントによるコードベース探索
残りステップ: 4 ステップ残り（Step 2 → 6.5）
```

### Step 2: Parallel Exploration (MUST run in parallel)

**Only proceed if Step 0 and Step 1 confirm safe environment and DocDD compliance.**

Launch these 3 agents **simultaneously in a single message** using the Task tool:

1. **repo-explorer** (run_in_background: true)
   - Prompt: "Explore codebase to find files relevant to: $ARGUMENTS. Report file paths and patterns."

2. **security-auditor** (run_in_background: true)
   - Prompt: "Security review for task: $ARGUMENTS. Check for auth, secrets, injection risks."

3. **code-reviewer** (run_in_background: true)
   - Prompt: "Review code quality for areas related to: $ARGUMENTS. Check DocDD, architecture."

### Step 4: Read Contract

While agents run, read `AGENTS.md` to understand:

- Non-negotiables
- Required artifacts for this change type
- Golden Commands to use

### Step 5: Synthesize Results

When all agents complete:

1. Gather their findings
2. Cross-reference with Spec requirements (FR/NFR/AC)
3. Create a TODO list with prioritized tasks
4. Report findings and recommended next steps
5. **Remind user of Golden Commands:**
   - `./tools/contract format` - Format code
   - `./tools/contract lint` - Run linter
   - `./tools/contract typecheck` - Type check
   - `./tools/contract test` - Run tests
   - `./tools/contract build` - Build project

**Phase transition summary (output before Step 6):**

```
現在地: 探索完了 — セキュリティ・品質・コード調査の結果が揃いました
次のアクション: 実装計画の作成とユーザー承認
残りステップ: 2 ステップ残り（Step 6 → 6.5）
```

### Step 6: Plan Approval (for non-trivial changes)

If the task involves:

- New feature implementation
- Architecture changes
- Multiple file modifications

Then:

1. Create or update `plan.md` in the spec directory
2. Create or update `tasks.md` with implementation steps
3. Present the plan to user for approval before implementation

### Step 6.5: Parallel Implementation Check (Optional)

After plan approval, check if `tasks.md` contains `parallel_group` metadata:

```bash
# Check for parallel execution metadata
grep -c "parallel_group:" ".specify/specs/<feature-id>/tasks.md" 2>/dev/null || echo "0"
```

**If parallel_group metadata is found (count > 0):**

Suggest parallel execution to the user:

```
Parallel execution metadata detected in tasks.md.

You can use /parallel-implement to launch multiple implementers
for independent task groups simultaneously.

This can significantly reduce implementation time for features
with independent backend/frontend or cross-domain tasks.
```

Use AskUserQuestion (per rule 10-user-communication):

- **Option A (Recommended)**: "Run /parallel-implement" — description: "Launches multiple implementer agents in parallel for independent task groups. Significantly faster when tasks have no cross-group file dependencies."
- **Option B**: "Proceed with single implementer" — description: "Runs all tasks sequentially in one agent. Simpler and safer; choose this if tasks share files or the feature is small."

**If no metadata found:** Proceed with standard single-implementer workflow.

## Environment Check Summary (STRICT ENFORCEMENT)

| Check        | Required State                | Action if Failed               | Severity    |
| ------------ | ----------------------------- | ------------------------------ | ----------- |
| **Worktree** | MUST be in worktree directory | **BLOCKING** - Create worktree | 🔴 CRITICAL |
| Branch       | NOT main/master/develop       | Create new branch via spawn.sh | 🔴 CRITICAL |
| Base         | From origin/main HEAD         | spawn.sh handles automatically | 🟡 AUTO     |
| DevContainer | Running (recommended)         | Run `./tools/contract up`      | 🟢 OPTIONAL |

### FORBIDDEN Workflows (NO EXCEPTIONS)

❌ Working in root repository directory
❌ Creating branches with `git checkout -b` in root
❌ Using existing branches (must create new from origin/main)
❌ Working on protected branches (main/master/develop)

### REQUIRED Workflow (100% MANDATORY)

✅ Always use `./tools/worktree/spawn.sh` from root repository
✅ Always create NEW branch from origin/main HEAD
✅ Always work inside the created worktree directory
✅ Run /kickoff again from within the worktree

## Example Task Tool Usage

```
Task(subagent_type: "repo-explorer", prompt: "...", run_in_background: true)
Task(subagent_type: "security-auditor", prompt: "...", run_in_background: true)
Task(subagent_type: "code-reviewer", prompt: "...", run_in_background: true)
```

## Quick Reference

### Worktree Creation (MANDATORY)

```bash
# From root repository ONLY

# Preferred: Use --issue flag (auto-generates branch name from issue)
./tools/worktree/spawn.sh <agent-type> --issue <number>

# Fallback: Manual branch name (Hotfix/Trivial only)
./tools/worktree/spawn.sh <agent-type> <branch-name>
```

### Agent Types

`implementer`, `architect`, `reviewer`, `qa`, `pdm`, `designer`

### Branch Naming Convention

| Pattern               | Example                         |
| --------------------- | ------------------------------- |
| `feat/<description>`  | `feat/add-user-auth-123456`     |
| `fix/<description>`   | `fix/login-null-pointer-123456` |
| `docs/<description>`  | `docs/api-reference-123456`     |
| `chore/<description>` | `chore/update-deps-123456`      |

### After Worktree Creation

1. `cd ./worktrees/<branch-name>`
2. `code .` (open in VS Code)
3. Run `/kickoff` again from within worktree
