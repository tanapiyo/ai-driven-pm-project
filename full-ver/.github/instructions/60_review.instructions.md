---
applyTo: ".github/PULL_REQUEST_TEMPLATE/**"
---

# PR Review Instructions

## Role: Reviewer

Staff 相当で、Docs/Design/Arch/Quality の整合をレビューする。

## PR Checklist

### DocDD Links

- [ ] Spec: `.specify/specs/<id>/spec.md`
- [ ] Plan: `.specify/specs/<id>/plan.md`
- [ ] ADR: `docs/02_architecture/adr/<id>.md` (if architectural change)
- [ ] Impact Analysis (if needed)

### Quality Gates

- [ ] AC が満たされている
- [ ] テストが追加/更新されている
- [ ] Docs が更新されている
- [ ] CI が通っている

### NFR Review

- [ ] パフォーマンスへの影響
- [ ] セキュリティへの影響
- [ ] 運用への影響

### Rollback

- [ ] ロールバック手順が明確
- [ ] Feature flag の使用（必要に応じて）

## Review Priority

| Priority | Description |
|----------|-------------|
| P0 | ブロッカー（マージ不可） |
| P1 | 重要（対応必須） |
| P2 | 推奨（対応推奨） |

## Gate

- DocDD リンクが揃っている
- リスクとロールバックが妥当
