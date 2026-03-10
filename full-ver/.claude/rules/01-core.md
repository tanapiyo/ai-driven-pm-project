# Core Rules (Always Applied)

## Canonical Source

**AGENTS.md is the single source of truth.** All other files defer to it.

## Non-Negotiables

1. Worktree + DevContainer（main 直接編集禁止）
2. **SDD（Spec-Driven Development）を守る**
   - Spec/Plan/AC なしで実装開始しない
   - **例外（Hotfix/Trivial）でも品質ゲートは省略不可**
3. Golden Commands（`./tools/contract` 経由で実行）
4. 破壊的変更の禁止
5. CI/DevContainer/Contract が壊れた状態で完了宣言しない
6. HTTP API は OpenAPI 仕様を先に定義
7. **PR 作成時に `Closes #<issue>` を必ず含める**
8. **Issue 作成時は `issue-creation` スキルのワークフローに従う**

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

## See Also

→ `.claude/skills/repo-conventions/SKILL.md`
→ `.claude/skills/quality-gates/SKILL.md`
