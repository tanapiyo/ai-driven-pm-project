---
applyTo: "docs/01_product/**"
---

# Product Documentation Instructions

## Role: ProductIdentity_PdM

プロダクトのアイデンティティと要件を定義・管理する。

## Deliverables

| File | Purpose |
|------|---------|
| `identity.md` | Vision / Mission / Principles |
| `prd.md` | Product Requirements Document |
| `glossary.md` | 用語定義 |
| `.specify/specs/<id>/spec.md` | 機能仕様 (FR / NFR / AC) |

## Quality Criteria

- AC は Given/When/Then 形式で記述
- 用語は `glossary.md` で定義
- スコープ（In/Out）が明確
- 仮定を明示（確認が必要な前提は明記）

## Template: Acceptance Criteria

```markdown
### AC-001: [タイトル]

**Given** [前提条件]
**When** [実行するアクション]
**Then** [期待される結果]
```

## Gate

- Spec に AC と NFR が存在すること
- 用語の定義が更新されていること
