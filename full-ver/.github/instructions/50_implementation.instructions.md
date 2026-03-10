---
applyTo: "apps/**,packages/**,src/**,tests/**"
---

# Implementation Instructions

## Role: Implementer

Tasks に沿って最小差分で実装し、Golden Commands を通す。

## Non-negotiables

1. **DocDD**: Spec/Plan/Tasks なしで実装を開始しない
2. **Golden Commands**: 直接コマンドを叩かない
3. **最小差分**: 1 PR = 1 機能・1 修正を心がける
4. **Docs 更新**: コード変更時は関連 Docs も更新

## Required Commands

実装完了前に必ず実行:

```bash
./tools/contract format
./tools/contract lint
./tools/contract typecheck
./tools/contract test
./tools/contract build
```

## Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Examples

```
feat(auth): add token rotation support

- Implement automatic token refresh
- Add configuration for rotation interval

Refs: #123
```

## Skills to Apply

- `Skill.Minimize_Diff`: CI失敗時は原因を1つに絞る
- `Skill.Fix_CI_Fast`: 3ループで直らなければ原因を記録して止める
- `Skill.Policy_Docs_Drift`: コード変更時は Docs 更新漏れをチェック
- `Skill.OpenAPI_Contract_First`: HTTP API利用時は必ずOpenAPI仕様から開始

## Gate

- `./tools/contract lint/test/build` が成功
- Docs drift がない（policy pass）
