# Skill: Horizontal Guardrails

## Trigger

- 新規実装開始時
- コードレビュー時
- CI失敗時（ガードレール関連）

## Purpose

ESLint boundaries + カスタムガードレールで Clean Architecture + DDD の制約を静的に検査し、AIが暴走してもアーキテクチャが崩壊しない仕組みを維持する。

## Philosophy

「横のガードレール」とは、**どう作るか**（非機能・実装品質・アーキテクチャ）を静的解析で検証する仕組み。

| ガードレール | 検証対象 | 検証方法 |
|-------------|---------|---------|
| 横のガードレール | どう作るか（非機能） | 静的解析 |
| 縦のガードレール | 何を提供するか（機能） | テスト実行 |

## Guardrails

### ESLint (eslint-plugin-boundaries)

レイヤー間の依存制約を検査:

```
presentation → usecase → domain ← infrastructure
                 ↑
            composition (全レイヤー可)
```

### Custom Guardrails

ESLintでは守れない検査:

| Guard ID | 検査内容 |
|----------|----------|
| `repository-result` | リポジトリが Result<T> を返すか |
| `domain-event-causation` | ドメインイベントに因果メタがあるか |
| `openapi-route-coverage` | OpenAPI仕様と実装の整合性 |
| `value-object-immutability` | Value Object の不変性 |
| `usecase-dependency` | UseCase の依存方向 |

## Commands

```bash
# ESLint + boundaries チェック
./tools/contract lint

# カスタムガードレール実行
./tools/contract guardrail

# 特定のガードレールのみ
pnpm guardrail --guard=repository-result

# ガードレール一覧
pnpm guardrail --list
```

## Comment Pattern

すべてのガードレール・重要なコードに以下のコメントを付ける:

```typescript
/**
 * @what 何を検査/実装するか（1行）
 * @why なぜこの検査/実装が必要か（理由）
 * @failure 違反時にどうなるか（ガードレールのみ）
 */
```

これは **AIに読ませるためのコメント**。AIがガードレールを修正するとき、この3つがあると「なぜこのルールがあるのか」を理解した上で作業できる。

## When RED

ガードレールがREDになったら:

1. エラーメッセージを確認
2. `@what` / `@why` を読んで意図を理解
3. 根本原因を修正（ガードレールを無効化しない）
4. 再度実行して GREEN を確認

## Anti-patterns

❌ ガードレールを無効化してコミット
❌ `// eslint-disable` で警告を黙らせる
❌ `@what` / `@why` なしでガードレールを追加
❌ 型情報に頼らずに文字列マッチングだけでチェック

## References

- 記事: [「横のガードレール」でAIにアーキテクチャを教えるのをやめた話](https://zenn.dev/hideyuki_toyama/articles/horizontal-guard-rails)
- eslint-plugin-boundaries: https://github.com/javierbrea/eslint-plugin-boundaries
