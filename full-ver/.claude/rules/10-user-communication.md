# User Communication Rules (Always Applied)

## AskUserQuestion: Option Format (MUST)

When presenting options via `AskUserQuestion`:

| Rule                     | Description                                                               |
| ------------------------ | ------------------------------------------------------------------------- |
| **description required** | Each option MUST include a `description` explaining why/when to choose it |
| **Recommended first**    | Place the recommended option first; add `(Recommended)` to its label      |
| **Avoid jargon**         | description は非エンジニアにも伝わる平易な言葉で書く                      |

### Example

```json
{
  "options": [
    {
      "label": "Option A (Recommended)",
      "description": "Fastest path. Suitable when X is already configured."
    },
    {
      "label": "Option B",
      "description": "More thorough but takes 2x longer. Choose if Y is uncertain."
    }
  ]
}
```

## 3-Line Summary (MUST at phase transitions)

At the start of each major phase, output a 3-line summary:

```
現在地: <what phase we are in and what was just completed>
次のアクション: <what will happen next>
残りステップ: <N steps remaining>
```

**When to output**: phase transitions (e.g., spec → implement, implement → quality gates, gates → PR).

## Progress Reporting (MUST for multi-step operations)

| Rule                    | Description                                           |
| ----------------------- | ----------------------------------------------------- |
| **Milestone summary**   | Output a 1-line summary at each major milestone       |
| **No silent long gaps** | Never go silent for >3 steps without a status line    |
| **Failure context**     | On failure, output which step failed and the fix plan |

## MUST NOT

| MUST NOT                              | Why                                  |
| ------------------------------------- | ------------------------------------ |
| Present options without `description` | User cannot make informed decision   |
| Put non-recommended option first      | Increases cognitive load             |
| Skip phase-transition summary         | User loses context in long pipelines |
