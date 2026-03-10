# Core Rules (Always Applied)

## Canonical Source

**AGENTS.md is the single source of truth.** All other files defer to it.

## Non-Negotiables

1. **SDD（Spec-Driven Development）を守る**
   - Spec/Plan/AC なしで実装開始しない
   - 品質ゲートは省略不可
2. **Golden Commands（`./tools/contract` 経由で実行）**
3. **破壊的変更の禁止**
4. **CI/Contract が壊れた状態で完了宣言しない**
5. **PR 作成時に `Closes #<issue>` を必ず含める**

## Commit Format

```text
<type>(<scope>): <subject>
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `build`, `ci`, `style`, `perf`, `revert`

## Commit Validation (MUST)

- [ ] Header ≤ 100 chars
- [ ] Each body/footer line ≤ 100 chars
- [ ] Subject: no sentence-case/start-case/pascal-case/upper-case, no trailing `.`
- [ ] If commitlint fails: create NEW commit, do NOT amend or force-push
