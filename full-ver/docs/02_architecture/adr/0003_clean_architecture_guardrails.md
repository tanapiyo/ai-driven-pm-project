# ADR-0003: Clean Architecture + FSD with Horizontal Guardrails

## Status

Accepted

## Context

AI駆動開発において、「クリーンアーキテクチャ+DDDで実装して」と指示しても、時間経過とともにアーキテクチャが崩壊する問題がある：

- ドメイン層が infrastructure を import する
- UseCase に presentation のロジックが混入する
- リポジトリが生の Promise を返す（Result<T> を使わない）
- ドメインイベントに因果メタがない

同様に、フロントエンドの Feature-Sliced Design (FSD) でも：

- shared が entities を import する（依存の逆転）
- スライスの内部実装が直接 import される
- OpenAPI 生成物が最新でない

**仕様駆動でも最初の構成は作れる。しかし人の介入なしには維持できない。**

## Decision

「横のガードレール」を導入し、AIが暴走してもアーキテクチャが崩壊しない仕組みを構築する。

### 1. Clean Architecture 層構造 (API)

```
apps/api/src/
├── domain/          # ドメイン層（ビジネスロジック）
├── usecase/         # ユースケース層（アプリケーションロジック）
├── presentation/    # プレゼンテーション層（HTTP/UI）
├── infrastructure/  # インフラ層（DB/外部サービス）
└── composition/     # DI構成（依存関係の組み立て）
```

依存の方向:
```
presentation → usecase → domain ← infrastructure
                 ↑
            composition (全レイヤー可)
```

### 1.1 Feature-Sliced Design 層構造 (Web)

```
apps/web/src/
├── app/             # App Router (Next.js)
├── widgets/         # 複合UI（ヘッダー、サイドバー等）
├── features/        # 機能スライス（認証、検索等）
├── entities/        # ビジネスエンティティ（ユーザー、商品等）
└── shared/          # 共有レイヤー（API、UI、lib、config）
```

依存の方向:
```
app → widgets → features → entities → shared
```

### 2. 横のガードレール

#### ESLint (eslint-plugin-boundaries)

レイヤー間の依存制約を静的に検査：

```javascript
rules: {
  'boundaries/element-types': ['error', {
    default: 'disallow',
    rules: [
      { from: ['domain'], allow: ['domain', 'shared'] },
      { from: ['usecase'], allow: ['usecase', 'domain', 'shared'] },
      { from: ['presentation'], allow: ['presentation', 'usecase', 'shared'] },
      { from: ['infrastructure'], allow: ['infrastructure', 'domain', 'shared'] },
      { from: ['composition'], allow: ['*'] },
    ],
  }],
}
```

#### カスタムガードレール

ESLintでは守れない検査を実装：

##### Clean Architecture (API) 用

| Guard ID | 検査内容 | @why |
|----------|----------|------|
| `repository-result` | リポジトリが Result<T> を返すか | エラー分類を可能にし、呼び出し側の扱いを統一 |
| `domain-event-causation` | ドメインイベントに因果メタがあるか | イベント系列の追跡・再現を可能に |
| `openapi-route-coverage` | OpenAPI仕様と実装の整合性 | 仕様と実装のズレを防止 |
| `value-object-immutability` | Value Object の不変性 | 不変条件を保証 |
| `usecase-dependency` | UseCase の依存方向 | Clean Architecture の依存方向を維持 |

##### Feature-Sliced Design (Web) 用

| Guard ID | 検査内容 | @why |
|----------|----------|------|
| `fsd-public-api` | スライスが index.ts で公開APIを持つか | モジュール境界を明確にし、内部実装への直接アクセスを防止 |
| `fsd-layer-dependency` | FSD レイヤー間の依存方向 | app→widgets→features→entities→shared の方向を維持 |
| `fsd-openapi-coverage` | OpenAPI仕様と shared/api/generated の整合性 | 仕様と生成物のズレを防止 |

### 3. @what / @why / @failure パターン

すべてのガードレール・重要なコードにコメントを付ける：

```typescript
/**
 * @what 何を検査/実装するか（1行）
 * @why なぜこの検査/実装が必要か（理由）
 * @failure 違反時にどうなるか（ガードレールのみ）
 */
```

**これはAIに読ませるためのコメント。** AIがガードレールを修正するとき、この3つがあると「なぜこのルールがあるのか」を理解した上で作業できる。

### 4. 共有パッケージ (@monorepo/shared)

DDD の基盤となる型・クラスを提供：

- `Result<T, E>` - 成功/失敗を型安全に表現
- `DomainEvent` - 因果メタを必須化したイベント基底クラス
- `Entity` / `AggregateRoot` - エンティティ・集約の基底クラス
- `ValueObject` - 値オブジェクトの基底クラス
- `Repository` - リポジトリのインターフェース

## Consequences

### Positive

- **AIがコンテキストゼロでも機能する**: ガードレールがREDになり、AIは自分で調べて修正する
- **アーキテクチャの崩壊を防止**: 静的解析で依存方向を強制
- **ドキュメント代わりになる**: `@what` / `@why` がコードベースに埋め込まれる
- **設計が育つ**: ガードレールを追加することで設計も改善される

### Negative

- **初期コストが高い**: ガードレールの構築に工数がかかる
- **カスタムガードレールの保守**: 型情報の解析が複雑になりうる
- **偽陽性のリスク**: 正規表現ベースの検査は誤検出の可能性

### Risks

- ガードレールを無効化してコミットされるリスク → CI で必須チェック
- 新しいパターンに対応できないリスク → ガードレールの継続的な改善

## References

- [「横のガードレール」でAIにアーキテクチャを教えるのをやめた話](https://zenn.dev/hideyuki_toyama/articles/horizontal-guard-rails)
- [縦と横のガードレール](https://note.com/hideyuki_toyama/n/n24fd932811f5)
- [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries)
