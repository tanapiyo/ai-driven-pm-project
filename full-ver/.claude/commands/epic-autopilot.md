---
description: Epic auto-implementation - Serial Issue execution with human review gates for PR merge confirmation
allowed-tools: Bash, Read, Grep, Glob, Task, AskUserQuestion, Write, Edit
---

# Epic Autopilot

Fully automated Epic pipeline: Parse Epic → Serial Execution Loop → Create PRs → Review → Report.

Executes child Issues one at a time in the main session. No team creation, no parallel implementers.

## Task

$ARGUMENTS

## Instructions

Execute the following steps **in order**.

### Step 0: Parse Epic Number (BLOCKING)

Parse `$ARGUMENTS` for an Epic issue number:
- `#123` format (e.g., `/epic-autopilot #677`)
- `--epic 123` format
- URL format (e.g., `https://github.com/.../issues/677`)
- Bare number (e.g., `/epic-autopilot 677`)

**If no Epic number found, STOP with error:**
```
BLOCKED: /epic-autopilot requires a GitHub Epic Issue number.

Usage:
  /epic-autopilot #677
  /epic-autopilot --epic 677
  /epic-autopilot https://github.com/owner/repo/issues/677
```

### Step 1: Pre-flight (Phase 0)

#### 1a. Verify Epic exists and is open

```bash
EPIC_NUMBER=<parsed_number>
gh issue view "$EPIC_NUMBER" --json number,title,body,labels,state
```

**Validate:**
- Issue exists and is open
- Issue has `epic` label (warn if missing but continue)

#### 1b. Fetch Child Issues

```bash
# Sub-Issues API
gh api "/repos/{owner}/{repo}/issues/${EPIC_NUMBER}/sub_issues" \
  --jq '.[] | {number, title, state, labels: [.labels[].name]}'
```

**If no child Issues found:**
- Try parsing Epic body for `| #NNN |` table rows as fallback
- If still none found, STOP: `"No child Issues found for Epic #<N>."`

#### 1c. Parse Dependency Graph

Read Epic body for Mermaid `graph TD` section. Parse arrows (`-->`) to build dependency DAG.

**If no Mermaid graph found:**
- Fall back to Issue number order (ascending = execution order)
- Log: `"No dependency graph found. Using Issue number order."`

**Compute topological sort** to determine execution order. Circular dependencies → STOP with error.

### Step 2: Execution Planning (Phase 1)

#### 2a. File Scope Analysis

For each child Issue, estimate file scope using this priority:

1. Check `.specify/specs/<id>/tasks.md` for `files:` metadata
2. Parse Issue body Impact Points checklist
3. Infer from Issue title/labels

#### 2b. Persist Execution Plan

Save to workspace:

```bash
mkdir -p .claude/autopilot/epic-${EPIC_NUMBER}/
```

Write `execution-plan.json`:
```json
{
  "epic": "<EPIC_NUMBER>",
  "started_at": "<ISO timestamp>",
  "execution_order": [
    { "issue": 678, "title": "...", "status": "pending" }
  ]
}
```

Write `file-scope-matrix.json`:
```json
{
  "678": { "files": ["docs/02_architecture/adr/"], "scope": "docs" },
  "679": { "files": [".claude/skills/"], "scope": "skills" }
}
```

#### 2c. Update Epic Body with Execution Log

Append `🤖 Autopilot Execution Log` section to Epic body.

**MUST follow Epic Body PATCH safety rules:**
1. Fetch body to temp file: `gh api ... --jq '.body' > /tmp/epic-body-raw.txt`
2. Validate ≥ 100 chars
3. Append execution log using Python (not sed)
4. Write result to temp file
5. Validate updated body ≥ 100 chars
6. PATCH via temp file: `gh api --method PATCH ... -f body="$(cat /tmp/epic-body-updated.txt)"`
7. On failure: print manual instructions, continue

### Step 3: Serial Execution Loop (Phase 2)

For each Issue in dependency order:

#### 3a. Human Review Gate Check

**Phase transition summary (output at the start of each Issue):**

```
現在地: Issue #<N> 実装開始 — <N-1>/<total> 完了
次のアクション: /autopilot パイプライン実行（実装→品質ゲート→PR→AIレビュー）
残りステップ: <remaining> Issues 残り
```

Check Issue against gate triggers:

- Label `spike` / title `[Spike]` or `[設計]` → gate AFTER execution
- Label `architecture` → gate AFTER design
- Label `security` or `auth` → gate AFTER implementation
- DB migration → gate BEFORE implementation
- API breaking change → gate BEFORE implementation

**For BEFORE gates (per rule 10-user-communication):**
```
AskUserQuestion:
  "Issue #<N> は <reason> を含みます。実装前にレビューしますか？"
  Options:
  - "レビューして実装に進む (Recommended)" — description: "詳細を確認してから実装を承認します。マイグレーション・破壊的変更・セキュリティ変更を含む場合に推奨。"
  - "そのまま自動実装する" — description: "レビューなしで自動実装します。内容を把握済みの場合のみ選択してください。"
  - "スキップする" — description: "この Issue をスキップして次に進みます。後で手動対応が必要になります。"
```

#### 3b. Update Epic Status — In Progress (Non-Blocking)

Immediately after starting implementation:

```
Task(
  subagent_type: "issue-project-manager",
  model: "haiku",
  description: "Status: #<issue_number> → in_progress",
  run_in_background: true,
  prompt: "Update status for Issue #<issue_number> to in_progress.
    ISSUE_NUMBER=<issue_number>
    TARGET_STATUS=in_progress
    Follow the epic-status-manager skill workflow."
)
```

#### 3c. Execute Issue via /autopilot

Launch an implementer subagent to run the full `/autopilot` pipeline for this Issue:

```
Task(
  subagent_type: "implementer",
  mode: "bypassPermissions",
  description: "Epic #<EPIC_NUMBER>: Implement Issue #<issue_number>",
  prompt: "<See Implementer Prompt Template below>"
)
```

The implementer runs the same pipeline as `/autopilot`:
- Creates worktree via `./tools/worktree/spawn.sh implementer --issue <N>`
- Implements changes
- Runs quality gates
- Creates PR
- Runs AI review and posts PR comment
- Returns PR URL in final report

#### 3d. Collect PR URL

Extract the PR URL from the implementer's final report output.

#### 3e. Human Review Gate (AFTER type)

For Issues with post-execution gates (per rule 10-user-communication):

```
AskUserQuestion:
  "Issue #<N> (<type>) の実装が完了しました。"
  Display: summary, PR URL, review findings
  Options:
  - "承認して次に進む (Recommended)" — description: "この PR を承認して次の Issue 実装に進みます。AI レビューで問題がない場合に選択してください。"
  - "修正指示を出す" — description: "実装に問題があります。修正内容を入力すると、同じ Issue に対して再実装を実行します。"
  - "スキップして次に進む" — description: "この Issue をスキップして次に進みます。PR はドラフトとして残されます。"
```

#### 3f. Check File Dependency with Next Issue

After each Issue's PR is created, compare file scopes with the NEXT Issue in execution order:

1. Load `file-scope-matrix.json` for current and next Issue
2. Check for overlapping files between current Issue and next Issue
3. **If overlapping files exist (per rule 10-user-communication):**

```
AskUserQuestion:
  "Issue #<current_N> の PR (#<PR_number>) が作成されました。

  次の Issue #<next_N> は同じファイルを変更します：
  重複ファイル: <list of overlapping files>

  マージコンフリクトを防ぐため、PR をマージしてから次の Issue の実装を開始します。"
  Options:
  - "続行 (PR マージ済み) (Recommended)" — description: "PR をマージ済みであることを確認してから次の Issue を実装します。コンフリクトを防ぐために推奨。"
  - "PR なしで続行 (リスクあり)" — description: "PR をマージせずに次の Issue を実装します。マージコンフリクトが発生する可能性があります。"
  - "中断する" — description: "実行を中断して現在の状態をレポートします。手動で対応してから再開できます。"
```

4. If "続行 (PR マージ済み)" selected:
   ```bash
   # Pull latest main into the next Issue's worktree base
   git fetch origin main --quiet 2>/dev/null || true
   echo "Pulling latest main before next Issue implementation"
   ```

5. If file scopes are **not overlapping**, continue automatically to next Issue without user prompt.

#### 3g. Update Progress

1. Update `execution-plan.json` status for completed Issue
2. Update `progress.json` with PR URL:

```json
{
  "<issue_number>": {
    "status": "in_review",
    "pr_url": "<PR_URL>",
    "completed_at": "<ISO timestamp>"
  }
}
```

3. Launch status update sub-agent (non-blocking):

```
Task(
  subagent_type: "issue-project-manager",
  model: "haiku",
  description: "Status: #<issue_number> → in_review",
  run_in_background: true,
  prompt: "Update status for Issue #<issue_number> to in_review.
    ISSUE_NUMBER=<issue_number>
    TARGET_STATUS=in_review
    PR_URL=<pr_url>
    Follow the epic-status-manager skill workflow."
)
```

**Fail-Fast Check:**
- If 2 consecutive Issues are `failed` → STOP, report to user
- If `human_blocked` → skip to next independent Issue

### Step 4: Final Report (Phase 3)

```markdown
## /epic-autopilot Complete

### Epic #<N>: <title>

| Issue | Title | Status | PR |
|-------|-------|--------|----|
| #678 | [Spike] Design | ✅ Completed | #xxx |
| #679 | [Feature] Skill | ✅ Completed | #xxx |
| #680 | [Feature] Command | ✅ Completed | #xxx |
| #682 | [Doc] ADR update | ✅ Completed | #xxx |

### Summary
- Total Issues: <N>
- Completed: <N>
- Failed: <N>
- Skipped: <N>
- Human-blocked: <N>

### Reviews
| Issue | Claude Review | Codex Review | P0 | P1 | P2 |
|-------|-------------|-------------|----|----|-----|
| #678 | ✅ | ✅ | 0 | 1 | 2 |

### Execution Mode
- Mode: Serial (main session)
- Duration: <start> → <end>

🤖 Generated with [Claude Code](https://claude.com/claude-code) via /epic-autopilot
```

Update Epic Body with final status.

## Implementer Prompt Template

When launching an implementer subagent for each Issue (Step 3c), use this prompt:

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
> **Working Directory:** \<REPO_ROOT\> (the implementer will create its own worktree)
>
> **Execution Mode:** Safe
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
> 3. Follow architecture rules: Backend = Clean Architecture + DDD, Frontend = FSD
> 4. Write/update tests for changed code
> 5. Update related documentation if behavior changes
>
> **Phase 3: Quality Gates (3 retries max)**
>
> Run in order. If any gate fails, fix only the failing gate's issue (minimal diff) and retry (max 3 full cycles):
>
>     ./tools/contract format
>     ./tools/contract lint
>     ./tools/contract typecheck
>     ./tools/contract test
>     ./tools/contract build
>
> (For `docs` route: only format + lint)
>
> **Phase 4: Commit + Push**
>
> Before committing, verify no sensitive files are staged. Then commit and push.
>
> **Phase 5: Create PR**
>
> Create PR using gh CLI. PR body MUST contain:
> - Summary (1-3 sentences)
> - Changes (bulleted list)
> - AC Verification table (each AC with pass/fail status)
> - Quality Gates table (each gate with pass/fail status)
> - `Closes #<ISSUE_NUMBER>` (MANDATORY)
> - Footer: 🤖 Generated with [Claude Code](https://claude.com/claude-code) via /autopilot
>
> **Phase 6: AI Review + PR Comment (MUST)**
>
> Run AI review and post `## 🤖 AI Review (automated)` comment on the PR.
>
> **Return in final output:**
> - PR URL
> - Quality Gates status table
> - AC Coverage (N/total verified)
> - AI Review findings (P0/P1/P2 counts)
>
> **END IMPLEMENTER PROMPT**

## Error Recovery

| Error | Recovery |
|-------|---------|
| Quality gates fail 3x | Create Draft PR, mark `failed`, continue |
| Codex rate limit | spark → codex → skip (non-blocking) |
| Epic Body PATCH fail | Print manual instructions, continue |
| 2 consecutive failures | STOP, report to user |
| File scope unknown | Treat as overlapping (safe-side), ask user before next Issue |
