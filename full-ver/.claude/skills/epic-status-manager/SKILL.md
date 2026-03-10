---
name: epic-status-manager
description: Epic/Project lifecycle status management. Updates parent Epic body tables, Mermaid graphs, and GitHub Projects when child Issue status changes. Non-blocking — failures never stop the main pipeline. This is the SINGLE SOURCE OF TRUTH (SSOT) for all status policies — transitions, Emoji mapping, classDef colors.
globs:
  - ".claude/commands/autopilot.md"
  - ".claude/commands/epic-autopilot.md"
  - ".claude/skills/issue-creation/SKILL.md"
  - ".claude/skills/epic-team-orchestration/SKILL.md"
  - ".claude/agents/issue-project-manager.md"
alwaysApply: false
---

# Epic Status Manager

> **SSOT**: This skill is the **single source of truth** for all status update policies — state transition diagram, Emoji mapping, Mermaid classDef definitions, and status icons. All other files (`autopilot.md`, `epic-autopilot.md`, `epic-team-orchestration/SKILL.md`) MUST reference this skill instead of defining their own status schemas.

Manages Epic body + GitHub Projects status transitions for child Issues during autopilot execution.

## Input Contract

| Parameter       | Required                         | Description                                            |
| --------------- | -------------------------------- | ------------------------------------------------------ |
| `ISSUE_NUMBER`  | Yes                              | The child Issue number being transitioned              |
| `TARGET_STATUS` | Yes                              | Target status: `in_progress`, `in_review`, `completed` |
| `PR_URL`        | Only for `in_review`/`completed` | PR URL to record in Epic body                          |

## Status Schema

### State Transition Diagram

```
pending ──→ in_progress ──→ in_review ──→ completed
              │    ↑              │
              │    └── failed     │
              │        (3 retries)│
              └──→ human_blocked  │
              └──→ skipped ───────┘
```

Full state list: `pending`, `open`, `in_progress`, `in_review`, `completed`, `failed`, `human_blocked`, `skipped`

State transitions:

- `pending` / `open` → `in_progress`: task assigned to implementer
- `in_progress` → `in_review`: PR created successfully
- `in_review` → `completed`: PR merged or human gate approved
- `in_progress` → `failed`: quality gates fail after 3 retries
- Any state → `human_blocked`: human review gate triggered
- Any state → `skipped`: user instruction to skip

### Status Mapping Table

| TARGET_STATUS | Emoji | Table Text       | Mermaid classDef | Background         |
| ------------- | ----- | ---------------- | ---------------- | ------------------ |
| `open`        | `🔴`  | `🔴 Open`        | `open`           | `#ffeef0` (red)    |
| `in_progress` | `🟡`  | `🟡 In Progress` | `progress`       | `#fff8c5` (yellow) |
| `in_review`   | `📝`  | `📝 In Review`   | `review`         | `#ddf4ff` (blue)   |
| `completed`   | `🟢`  | `🟢 Done`        | `done`           | `#dcffe4` (green)  |

### Status Icons (Epic Body Execution Log)

| Status          | Icon | Display Name                    |
| --------------- | ---- | ------------------------------- |
| `completed`     | `✅` | Completed                       |
| `in_progress`   | `🔄` | In Progress                     |
| `in_review`     | `📝` | In Review (PR created)          |
| `pending`       | `⏳` | Pending                         |
| `failed`        | `❌` | Failed                          |
| `human_blocked` | `⏸️` | Human Blocked (awaiting review) |
| `skipped`       | `⏭️` | Skipped                         |

### Mermaid classDef Definitions

These are the canonical color definitions for Epic dependency graph nodes. All tools MUST use these exact values.

```mermaid
classDef open fill:#ffeef0,stroke:#cf222e,color:#1a1a1a
classDef progress fill:#fff8c5,stroke:#9a6700,color:#1a1a1a
classDef review fill:#ddf4ff,stroke:#0969da,color:#1a1a1a
classDef done fill:#dcffe4,stroke:#1a7f37,color:#1a1a1a
```

## Workflow

Steps 1–5 are implemented in the **Combined Execution Script** below. This section describes the logic for reference.

| Step | Action | Key Logic |
|------|--------|-----------|
| 1 | Detect parent Epic | Parse `Part of #NNN` from child Issue body |
| 2 | Update table row | Python regex: match `\| #NNN \| ... \| 🔴... \|` → replace emoji/text |
| 3 | Update Mermaid graph | Replace node emoji + `class NNN <status>` assignment |
| 4 | PATCH Epic body | 100-char guard → temp file → `gh api --method PATCH` |
| 5 | GitHub Projects | GraphQL mutation to update Status field |

**Mermaid node ID convention**: ノード ID は Issue 番号を使う（例: `853["🔴 #853 Task: ..."]`）。文字（A, B, C）は使わない。

**PATCH safety rules**: → `.claude/skills/issue-creation/SKILL.md` Step 5.4

## Error Handling Policy

| Error                    | Action               | Block Pipeline? |
| ------------------------ | -------------------- | --------------- |
| No parent Epic found     | Log warning, skip    | No              |
| Epic body < 100 chars    | Abort PATCH, log     | No              |
| Table row not found      | Log warning, skip    | No              |
| Mermaid node not found   | Skip graph update    | No              |
| PATCH API failure        | Print manual command | No              |
| Projects GraphQL failure | Log warning, skip    | No              |

**Principle**: All failures are non-blocking. The main autopilot pipeline must never be stopped by status management failures.

## Combined Execution Script

The agent should execute Steps 1-5 in sequence. Here is the combined invocation pattern:

```bash
#!/usr/bin/env bash
set -euo pipefail

ISSUE_NUMBER="$1"
TARGET_STATUS="$2"
PR_URL="${3:-}"

echo "=== Epic Status Manager: #$ISSUE_NUMBER → $TARGET_STATUS ==="

# Step 1: Detect parent Epic
PARENT_EPIC=$(gh issue view "$ISSUE_NUMBER" --json body --jq '.body' 2>/dev/null \
  | grep -oE 'Part of #[0-9]+' | head -1 | grep -oE '[0-9]+' || true)

if [ -z "$PARENT_EPIC" ]; then
    echo "INFO: No parent Epic found for #$ISSUE_NUMBER. Skipping status update."
    exit 0
fi

echo "Parent Epic: #$PARENT_EPIC"

# Steps 2-4: Update Epic body (table + Mermaid + PATCH)
python3 -c "
import re, sys, subprocess, json

ISSUE = '$ISSUE_NUMBER'
STATUS = '$TARGET_STATUS'
PR = '$PR_URL'
EPIC = '$PARENT_EPIC'

STATUS_MAP = {
    'open': '🔴 Open', 'in_progress': '🟡 In Progress',
    'in_review': '📝 In Review', 'completed': '🟢 Done',
}
EMOJI_MAP = {
    'open': '🔴', 'in_progress': '🟡', 'in_review': '📝', 'completed': '🟢',
}
CLASS_MAP = {
    'open': 'open', 'in_progress': 'progress', 'in_review': 'review', 'completed': 'done',
}
CLASSDEF = {
    'open': 'classDef open fill:#ffeef0,stroke:#cf222e,color:#1a1a1a',
    'progress': 'classDef progress fill:#fff8c5,stroke:#9a6700,color:#1a1a1a',
    'review': 'classDef review fill:#ddf4ff,stroke:#0969da,color:#1a1a1a',
    'done': 'classDef done fill:#dcffe4,stroke:#1a7f37,color:#1a1a1a',
}

# Fetch Epic body
r = subprocess.run(['gh', 'api', f'/repos/{{owner}}/{{repo}}/issues/{EPIC}', '--jq', '.body'],
                   capture_output=True, text=True)
body = r.stdout.strip()
if len(body) < 100:
    print(f'ABORT: Epic body too short ({len(body)} chars)')
    sys.exit(0)

# Table row update
target_text = STATUS_MAP.get(STATUS, STATUS)
pattern = rf'(\|[^\n]*#\s*{ISSUE}\b[^\n]*\|)\s*[🔴🟡📝🟢][^\|]*(\|)'
body, count = re.subn(pattern, rf'\1 {target_text} \2', body)
if count > 0:
    print(f'Table: #{ISSUE} → {target_text}')
else:
    print(f'WARNING: No table row for #{ISSUE}')

# PR URL injection
if PR and STATUS in ('in_review', 'completed'):
    pr_pat = rf'(\|[^\n]*#\s*{ISSUE}\b[^\n]*\|[^\|]*\|)\s*(\|)'
    body = re.sub(pr_pat, rf'\1 {PR} \2', body, count=1)

# Mermaid node emoji
node_pat = rf'({ISSUE}\[)[🔴🟡📝🟢](\s*#\s*{ISSUE})'
body = re.sub(node_pat, rf'\g<1>{EMOJI_MAP[STATUS]}\2', body)

# Mermaid class assignment
class_pat = rf'(class\s+{ISSUE}\s+)\w+'
body = re.sub(class_pat, rf'\g<1>{CLASS_MAP[STATUS]}', body)

# Ensure classDef exists
target_class = CLASS_MAP[STATUS]
if f'classDef {target_class}' not in body:
    if '%%' in body:
        body = body.replace('%%', f'{CLASSDEF[target_class]}\n%%', 1)

# Validate and write
if len(body) < 100:
    print(f'ABORT: Updated body too short ({len(body)} chars)')
    sys.exit(0)

with open('/tmp/epic-body-updated.txt', 'w') as f:
    f.write(body)
print('Body written to /tmp/epic-body-updated.txt')
"

# Step 4: PATCH
BODY_LEN=$(wc -c < /tmp/epic-body-updated.txt | tr -d ' ')
if [ "$BODY_LEN" -lt 100 ]; then
    echo "ABORT: Body file too short ($BODY_LEN bytes)"
    exit 0
fi

gh api --method PATCH "/repos/{owner}/{repo}/issues/$PARENT_EPIC" \
  -f body="$(cat /tmp/epic-body-updated.txt)" \
  --silent 2>/dev/null \
  && echo "Epic #$PARENT_EPIC body patched" \
  || echo "WARNING: PATCH failed. Manual: gh issue edit $PARENT_EPIC --body-file /tmp/epic-body-updated.txt"

# Step 5: GitHub Projects (non-blocking)
case "$TARGET_STATUS" in
    "in_progress") PROJECT_STATUS="In Progress" ;;
    "in_review")   PROJECT_STATUS="In Review" ;;
    "completed")   PROJECT_STATUS="Done" ;;
    *)             PROJECT_STATUS="" ;;
esac

if [ -n "$PROJECT_STATUS" ]; then
    gh api graphql -f query="
      query(\$number: Int!) {
        repository(owner: \"{owner}\", name: \"{repo}\") {
          issue(number: \$number) {
            projectItems(first: 10) {
              nodes { id project { id } }
            }
          }
        }
      }
    " -F number="$ISSUE_NUMBER" 2>/dev/null | python3 -c "
import json, sys, subprocess
try:
    data = json.load(sys.stdin)
    items = data['data']['repository']['issue']['projectItems']['nodes']
    for item in items:
        pid, iid = item['project']['id'], item['id']
        # Get status field
        r = subprocess.run(['gh', 'api', 'graphql', '-f',
            'query { node(id: \"'+pid+'\") { ... on ProjectV2 { field(name: \"Status\") { ... on ProjectV2SingleSelectField { id options { id name } } } } } }'],
            capture_output=True, text=True)
        fd = json.loads(r.stdout)
        field = fd['data']['node']['field']
        fid = field['id']
        oid = next((o['id'] for o in field['options'] if o['name'] == '$PROJECT_STATUS'), None)
        if oid:
            subprocess.run(['gh', 'api', 'graphql', '-f',
                'mutation { updateProjectV2ItemFieldValue(input: { projectId: \"'+pid+'\" itemId: \"'+iid+'\" fieldId: \"'+fid+'\" value: { singleSelectOptionId: \"'+oid+'\" } }) { projectV2Item { id } } }'],
                capture_output=True, text=True)
            print(f'Projects: Updated → $PROJECT_STATUS')
except Exception as e:
    print(f'WARNING: Projects update skipped ({e})')
" 2>/dev/null || echo "INFO: Projects update skipped"
fi

echo "=== Epic Status Manager: Done ==="
```

## References

- `.claude/skills/issue-creation/SKILL.md` Step 5.4 — Body PATCH safety rules
- `.claude/skills/epic-team-orchestration/SKILL.md` — Epic orchestration patterns
- `.claude/agents/issue-project-manager.md` — Agent that uses this skill
- `.github/labels.yml` — Label definitions SSOT (`type:epic` is the canonical Epic label)
- `.claude/rules/08-issue-labels.md` — Always-applied label rules

> **Note**: Epic Issues use `type:epic` label (not `epic`). Confirm with `.github/labels.yml`.
