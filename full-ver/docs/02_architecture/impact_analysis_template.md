# Impact Analysis Template

変更の影響範囲を分析するためのテンプレートです。
大きな変更や破壊的変更を行う前に、このテンプレートを使用して影響を評価してください。

---

## Change Summary

| Item | Value |
|------|-------|
| 変更名 | TODO |
| 変更種別 | 新機能 / 改修 / 破壊的変更 / 削除 |
| 影響レベル | Low / Medium / High / Critical |
| 担当者 | TODO |
| 日付 | YYYY-MM-DD |

---

## Affected Components

### Direct Impact

| Component | Change Type | Description |
|-----------|-------------|-------------|
| TODO | 追加 / 変更 / 削除 | TODO |

### Indirect Impact

| Component | Impact | Description |
|-----------|--------|-------------|
| TODO | TODO | TODO |

---

## Dependencies

### Upstream (この変更が依存するもの)

| Dependency | Status | Notes |
|------------|--------|-------|
| TODO | Ready / In Progress / Blocked | TODO |

### Downstream (この変更に依存するもの)

| Dependent | Impact | Migration Required |
|-----------|--------|-------------------|
| TODO | TODO | Yes / No |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| TODO | Low / Medium / High | Low / Medium / High | TODO |

---

## Rollback Plan

### 手順

1. TODO
2. TODO
3. TODO

### 所要時間

- 推定: TODO 分

### データ影響

- [ ] データ損失の可能性あり
- [ ] データ移行が必要
- [ ] 可逆的な変更

---

## Testing Strategy

### 影響を受けるテスト

| Test Type | Scope | Status |
|-----------|-------|--------|
| Unit Tests | TODO | TODO |
| Integration Tests | TODO | TODO |
| E2E Tests | TODO | TODO |

### 追加で必要なテスト

- TODO

---

## Communication Plan

### 通知が必要なステークホルダー

| Stakeholder | Reason | When |
|-------------|--------|------|
| TODO | TODO | Before / After |

### ドキュメント更新

- [ ] AGENTS.md
- [ ] README.md
- [ ] API Documentation
- [ ] その他: TODO

---

## Checklist

- [ ] 影響を受けるすべてのコンポーネントを特定した
- [ ] リスク評価を完了した
- [ ] ロールバック計画を策定した
- [ ] テスト戦略を定義した
- [ ] ステークホルダーに通知した（または予定）
- [ ] 必要なドキュメント更新を特定した

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Author | TODO | TODO | TODO |
| Reviewer | TODO | TODO | TODO |
| Approver | TODO | TODO | TODO |
