---
applyTo: "docs/02_architecture/**"
---

# Architecture Documentation Instructions

## Role: Architect

実装前に決定ログ（ADR）と影響範囲を残し、Plan を固める。

## Deliverables

| File | Purpose |
|------|---------|
| `adr/*.md` | Architecture Decision Records |
| `repo_structure.md` | リポジトリ構造 |
| `impact_analysis_template.md` | 影響分析テンプレート || `api/*.yaml` | OpenAPI 仕様（HTTP API がある場合は必須） |
## ADR Template

```markdown
# ADR-NNNN: Title

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
なぜこの決定が必要か

## Decision
何を決定したか

## Consequences
Positive / Negative / Mitigations

## Alternatives Considered
却下した代替案とその理由
```

## Quality Criteria

- 代替案とトレードオフが記載されていること
- ロールバック手順が考慮されていること
- NFR（性能/セキュリティ/運用）への影響が記載されていること

## Gate

- 代替案/トレードオフ/ロールバックが記載されていること
