---
description: Parse tasks.md dependency graph and launch parallel implementers
allowed-tools: Bash, Read, Grep, Glob, Task, AskUserQuestion
---

# Parallel Implement

Launch multiple implementer agents in parallel based on task dependency analysis.

## Task

$ARGUMENTS

## Instructions

Execute the following steps **in order**:

### Step 1: Locate and Read tasks.md

1. Find the current feature's `tasks.md`:
```bash
# Check if spec path is provided in arguments, otherwise search
SPEC_DIR=$(echo "$ARGUMENTS" | grep -oP '\.specify/specs/[^\s]+' || true)
if [ -z "$SPEC_DIR" ]; then
    # List available specs
    ls .specify/specs/
fi
```

2. Read the `tasks.md` file fully. If no tasks.md exists, **STOP** and inform the user:
```
No tasks.md found. Create one first using /kickoff or manually.
Falling back to single implementer mode.
```

### Step 2: Parse Dependency Metadata

Extract task metadata from `tasks.md`. Look for this pattern in each task item:

```
- [ ] **Task N**: Description
  - depends_on: [list of task IDs]
  - files: [list of file paths]
  - parallel_group: group-name
```

**Build a task graph:**

1. For each task, extract:
   - `id`: Task number (e.g., "6", "7", "2.4")
   - `name`: Task description
   - `depends_on`: List of prerequisite task IDs
   - `files`: List of file paths this task modifies
   - `parallel_group`: Group label

2. **If NO tasks have `parallel_group` metadata:**
   - Report: "No parallel execution metadata found in tasks.md. Falling back to sequential mode."
   - Use AskUserQuestion (per rule 10-user-communication):
     - **Option A (Recommended)**: "Run single implementer sequentially" — description: "Proceeds with one implementer running all tasks in order. Safe and simple; the best choice when tasks share files or the feature is small."
     - **Option B**: "Cancel and add metadata to tasks.md first" — description: "Stops here so you can annotate tasks.md with parallel_group fields. Choose this to enable parallel execution for independent task groups."
   - If sequential: Launch a single implementer with all tasks and STOP

3. **Validate the graph:**
   - Check for circular dependencies (A depends on B, B depends on A)
   - Check for file scope overlaps between different parallel_groups
   - If validation fails, report the issue and fall back to sequential

### Step 3: Identify Parallel Groups

1. Group tasks by `parallel_group` label
2. For each group, determine readiness:
   - A group is **ready** if ALL `depends_on` tasks (from other groups) are completed or not present in the task list
   - A group is **blocked** if it depends on incomplete tasks in other groups
3. Identify the set of groups that can execute in parallel (no inter-group dependencies)

**Report the execution plan:**

```markdown
## Parallel Execution Plan

### Wave 1 (parallel):
- **Group: backend-domain** (Tasks: 6)
  - Files: projects/apps/api/src/domain/
- **Group: frontend-impl** (Tasks: 11, 12)
  - Files: projects/apps/web/src/features/*/api/, projects/apps/web/src/features/*/ui/

### Wave 2 (after Wave 1):
- **Group: backend-usecase** (Tasks: 7)
  - Files: projects/apps/api/src/usecase/

### Sequential (coordinator):
- **Group: shared** (Tasks: 14, 15)
  - Files: projects/apps/api/src/container.ts
```

**Phase transition summary (output before plan confirmation):**

```
現在地: 実行計画の作成完了 — <N> グループ、<M> Wave が特定されました
次のアクション: 計画を確認してから並列実装を開始
残りステップ: 実装 Wave <M> 回 + 品質ゲート + サマリー
```

4. Use AskUserQuestion to confirm (per rule 10-user-communication):
   - **Option A (Recommended)**: "Execute this plan" — description: "Launches the parallel implementers as shown above. Choose this when the plan looks correct and groups have no unexpected file overlaps."
   - **Option B**: "Modify groups before executing" — description: "Stop here to manually adjust the parallel_group metadata in tasks.md before proceeding. Use this if the automatic grouping does not match your intent."
   - **Option C**: "Fall back to sequential single-implementer" — description: "Abandon parallel mode and run all tasks with one implementer in sequence. Safer but slower; use if you are uncertain about the plan."

### Step 4: Launch Parallel Implementers

> **Worktree ルールとの関係**: AGENTS.md Non-negotiable #1 は「並列作業時は別 worktree を使用」としていますが、`/parallel-implement` ではコーディネーターがファイルスコープ排他制御を行うため、同一 worktree 内でのサブエージェント並列実行が許可されています。各 implementer は割り当てられたファイルスコープ外を変更できず、品質ゲートはコーディネーターが一括で実行します。

For each wave of parallel groups:

1. **Read the spec context** (spec.md, plan.md) to include in each implementer's prompt
2. **For each group in the current wave**, launch an implementer:

```
Task(
  subagent_type: "implementer",
  run_in_background: true,
  prompt: "
    ## Context
    You are one of multiple parallel implementers. Follow these constraints strictly.

    ## Your Task Assignment
    Feature: [feature name from spec]
    Tasks: [list of task descriptions for this group]

    ## File Scope (CRITICAL - MUST FOLLOW)
    You MUST ONLY modify files within these paths:
    [list of file paths from group's tasks]

    You MUST NOT modify any files outside this scope.
    If you need changes to files outside your scope, document them
    as TODO comments in a file within your scope.

    ## Spec Reference
    [paste relevant spec.md and plan.md sections]

    ## Implementation Instructions
    1. Read AGENTS.md for repository contract
    2. Implement ONLY the assigned tasks
    3. Follow existing code patterns (use Grep/Read to understand first)
    4. Write/update tests for your changes
    5. Do NOT run quality gates (coordinator will run them after all agents complete)
    6. Do NOT commit changes (coordinator handles commits)
  "
)
```

3. **Wait for all agents in the wave to complete** (check TaskOutput for each)
4. **Wave transition summary (output after each Wave):**

```
現在地: Wave <N> 完了 — <groups> グループが実装を終えました
次のアクション: Wave <N+1> を開始 / 共有ファイル処理 / 品質ゲート
残りステップ: <remaining> Wave 残り + 品質ゲート
```

5. Proceed to next wave if there are blocked groups now unblocked

### Step 5: Handle Shared Files

After all parallel waves complete:

1. If there are tasks in the `shared` parallel_group (or tasks without a group):
   - Execute them sequentially using a single implementer
   - These typically include DI container registration, barrel exports, configuration

### Step 6: Post-Parallel Verification

**Run all quality gates in order:**

```bash
./tools/contract format
./tools/contract lint
./tools/contract typecheck
./tools/contract test
```

**If any gate fails:**

1. Check `git diff` to identify which files were modified
2. Map failing files back to the responsible parallel group
3. Report:
```markdown
## Quality Gate Failure

**Failed gate**: typecheck
**Likely source**: Group "backend-usecase" (implementer-2)
**Affected files**:
- projects/apps/api/src/usecase/create-user.ts:15 - Type error

**Action needed**: Fix the type error in the identified files.
```

4. Use AskUserQuestion (per rule 10-user-communication):
   - **Option A (Recommended)**: "Auto-fix and re-run gates" — description: "Attempts automatic formatting and lint fixes, then re-runs quality gates. Fastest resolution when the error is a style or lint issue."
   - **Option B**: "Launch targeted implementer to fix" — description: "Spawns a new single implementer agent scoped to the failing files. Use for type errors or logic bugs that auto-fix cannot resolve."
   - **Option C**: "Stop and fix manually" — description: "Halts the pipeline and reports all failing gate details so you can fix the issues yourself before re-running."

### Step 7: Summary Report

After all gates pass:

```markdown
## Parallel Implementation Complete

**Groups executed**: N groups across M waves
**Tasks completed**: X / Y total tasks
**Quality gates**: All passing

### Execution Summary
| Group | Tasks | Status |
|-------|-------|--------|
| backend-domain | 6 | Done |
| frontend-impl | 11, 12 | Done |
| backend-usecase | 7 | Done |
| shared | 14, 15 | Done |

### Next Steps
- Review changes with `git diff`
- Run `./tools/contract build` for full build verification
- Create PR with `/pr-check`
```

## Fallback Behavior

| Scenario | Behavior |
|----------|----------|
| No `parallel_group` in tasks.md | Sequential single-implementer |
| Parse error in metadata | Sequential fallback with warning |
| Circular dependency detected | STOP, report cycle, ask user |
| File scope overlap between groups | STOP, report overlap, ask user |
| Agent fails mid-execution | Report failure, continue other agents, fix in post-step |
