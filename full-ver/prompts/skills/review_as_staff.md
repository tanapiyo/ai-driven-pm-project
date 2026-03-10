# Skill: Review As Staff

## Trigger
- Reviewer 起動時

## Purpose
Staff 相当の視点でレビューを行う。

## Steps

### Step 1: Check DocDD Links

以下がリンクされているか確認:

```markdown
- [ ] Spec: `.specify/specs/<id>/spec.md`
- [ ] Plan: `.specify/specs/<id>/plan.md`
- [ ] ADR: `docs/02_architecture/adr/<id>.md`
- [ ] Impact Analysis
- [ ] AC
- [ ] Test Plan
- [ ] Release Plan
```

### Step 2: NFR Review

NFR（非機能要件）観点の穴を探す:

| Category | Questions |
|----------|-----------|
| Performance | レスポンスタイムへの影響は？ |
| Scalability | スケールした時に問題は？ |
| Security | セキュリティ上のリスクは？ |
| Reliability | 障害時の影響は？ |
| Observability | 監視・ログは適切か？ |
| Maintainability | 保守しやすいか？ |

### Step 3: Rollback Review

ロールバック計画の確認:

```markdown
- [ ] ロールバック手順が明確
- [ ] Feature flag の使用（必要に応じて）
- [ ] 移行計画の妥当性
- [ ] データマイグレーションの可逆性
```

### Step 4: Split Recommendation

必要に応じて PR 分割を提案:

| Condition | Recommendation |
|-----------|----------------|
| 変更が大きすぎる | 機能ごとに分割 |
| Docs と Code が混在 | Docs-only PR と Code-only PR に分割 |
| 複数の目的が混在 | 目的ごとに分割 |

### Step 5: Write Review Comments

優先度付きでコメント:

```markdown
**[P0]** Security: SQLインジェクションの可能性

**理由**: ユーザー入力が直接クエリに使用されている

**提案**: パラメータ化クエリを使用
```

## Priority Levels

| Priority | Description | Action |
|----------|-------------|--------|
| P0 | ブロッカー | マージ不可、即座に対応必要 |
| P1 | 重要 | 対応必須、マージ前に修正 |
| P2 | 推奨 | 対応推奨、次回 PR でも可 |

## Output
レビューコメント（優先度: P0/P1/P2）
