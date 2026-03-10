# ADR-0006: Testing Strategy (TDD Integration)

## Status

**Accepted** - 2026-01-20

## Context

このリポジトリは DocDD (Document-Driven Development) ワークフローを採用しているが、テスト駆動開発 (TDD) との統合が明確に定義されていなかった。以下の課題が存在した：

1. **テスト戦略の欠如**: レイヤー別のテストアプローチが不明確
2. **カバレッジ閾値の未定義**: 品質基準が曖昧
3. **TDD ワークフローの未統合**: DocDD フローの中で TDD をどう実践するか不明
4. **共有テストユーティリティの不在**: テストコードの重複と保守性の低下
5. **テスト設定の暗黙性**: vitest.config.ts が存在せず、設定が不透明

## Decision

### TDD と DocDD の統合

```
DocDD Flow                    TDD Cycle
────────────────────────────  ────────────────────
1. Spec (FR/NFR/AC)      →
2. Plan (Architecture)    →
3. Contract Definition    →   🔴 RED Phase
   - OpenAPI spec         →      - Write failing test
   - Test Design          →      - Verify it fails

4. Tasks (Implementation) →   🟢 GREEN Phase
                          →      - Write minimal code
                          →      - Make test pass

                          →   🔵 REFACTOR Phase
                          →      - Clean up code
                          →      - Run guardrails
                          →      - Maintain all tests passing
```

### レイヤー別テスト戦略

#### Domain Layer (Pure Business Logic)

**特徴**:
- 外部依存なし（DB, HTTP, Framework）
- 純粋な関数とクラス
- Mock 不要

**テストアプローチ**:
```typescript
// src/domain/user/user.test.ts
describe('User.create', () => {
  it('creates user with valid parameters', () => {
    // Arrange
    const params = userFixtures.validCreateParams();

    // Act
    const result = User.create(params);

    // Assert
    expect(result).toBeSuccess();
    expect(result.value.name).toBe('Test User');
  });
});
```

**ルール**:
- AAA (Arrange-Act-Assert) パターン必須
- ビジネスルールごとに 1 テストケース
- エッジケース（境界値、null、empty）を網羅
- ドメインイベントの発行を検証

#### UseCase Layer (Application Logic)

**特徴**:
- ドメインを orchestrate
- Repository, Service をインジェクション
- Mock 必須

**テストアプローチ**:
```typescript
// src/usecase/auth/login.test.ts
describe('LoginUseCase', () => {
  let mockUserRepo: MockType<IUserRepository>;
  let usecase: LoginUseCase;

  beforeEach(() => {
    mockUserRepo = createMockUserRepository();
    usecase = new LoginUseCase(mockUserRepo);
  });

  it('returns tokens when credentials are valid', async () => {
    // Arrange
    mockUserRepo.findByEmail.mockResolvedValue(Result.ok(user));

    // Act
    const result = await usecase.execute({ ... });

    // Assert
    expect(result).toBeSuccess();
    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
  });
});
```

**ルール**:
- 依存関係を Mock
- ビジネスシナリオごとに 1 テストケース
- エラーハンドリングを検証
- トランザクション境界を意識

#### Presentation Layer (HTTP/Controller)

**特徴**:
- HTTP リクエスト/レスポンスのマッピング
- Middleware のテスト
- UseCase を Mock

**テストアプローチ**:
```typescript
// src/presentation/middleware/csrf-middleware.test.ts
describe('CSRFMiddleware', () => {
  it('blocks POST requests without CSRF token', () => {
    const req = createMockRequest({ method: 'POST' });
    const res = createMockResponse();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

**ルール**:
- HTTP インタフェースの振る舞いをテスト
- バリデーション、認証、認可を検証
- エラーレスポンスの形式を確認

### カバレッジ閾値

`projects/apps/api/vitest.config.ts`:
```typescript
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
}
```

**除外対象**:
- Generated code (`prisma/**`)
- DI composition root (`src/composition/**`)
- Entry points (`src/index.ts`)
- Test files (`**/*.test.ts`)

### 共有テストユーティリティ

#### Fixtures (テストデータ)

`projects/apps/api/__tests__/fixtures/user-fixtures.ts`:
- 再利用可能なテストデータ
- 境界値テスト用のデータセット
- ドメイン固有のファクトリ関数

#### Mock Builders

`projects/apps/api/__tests__/helpers/mock-builders.ts`:
- Repository の型安全な Mock
- Service の型安全な Mock
- 共通 Mock パターンの再利用

#### Custom Matchers

`projects/apps/api/__tests__/matchers/result-matchers.ts`:
- `expect(result).toBeSuccess()`
- `expect(result).toBeFailure('error_code')`
- Result 型の可読性向上

### TDD Workflow Commands

```bash
# TDD watch mode (Red-Green-Refactor cycle)
./tools/contract test watch

# Coverage report
./tools/contract test coverage

# Regular test run (with 80% threshold check)
./tools/contract test
```

### PR Template Integration

`.github/PULL_REQUEST_TEMPLATE/03_implement.md` に TDD チェックリストを追加：

- [ ] ユニットテストが新規コードに追加されている
- [ ] テストが AAA (Arrange-Act-Assert) パターンに従っている
- [ ] カバレッジが維持/向上している（80%以上）
- [ ] Spec にテストプランがリンクされている
- [ ] レイヤー別テスト戦略に従っている

## Consequences

### Positive

- ✅ **明確なテスト戦略**: レイヤーごとのアプローチが明確
- ✅ **品質の定量化**: 80% カバレッジ閾値で品質を担保
- ✅ **TDD の実践可能性**: watch mode でサイクルを高速化
- ✅ **テストコードの保守性**: 共有ユーティリティで DRY 原則を実現
- ✅ **可読性向上**: カスタムマッチャーでテストの意図が明確
- ✅ **DocDD との統合**: Spec/Plan/AC から TDD への流れが明確

### Negative

- ⚠️ **学習コスト**: レイヤー別戦略と共有ユーティリティの理解が必要
- ⚠️ **初期セットアップコスト**: Fixtures/Mocks の作成に時間が必要
- ⚠️ **カバレッジ維持コスト**: 80% 閾値の維持には継続的な努力が必要

### Mitigations

- 📚 包括的なドキュメント (`docs/00_process/tdd_workflow.md`)
- 🧰 共有ユーティリティで初期コストを削減
- 🔁 watch mode で TDD サイクルを高速化
- 📋 PR チェックリストで品質ゲートを自動化

## Implementation

### Phase 1: Foundation (完了)
- [x] `vitest.config.ts` with 80% thresholds
- [x] `docs/00_process/tdd_workflow.md` documentation
- [x] `./tools/contract test watch/coverage` commands
- [x] PR template with TDD checklist
- [x] Security warnings for dev credentials

### Phase 2: Shared Utilities (完了)
- [x] User fixtures (`__tests__/fixtures/user-fixtures.ts`)
- [x] Custom matchers (`__tests__/matchers/result-matchers.ts`)
- [x] Mock builders (`__tests__/helpers/mock-builders.ts`)
- [x] Testing strategy ADR (`docs/02_architecture/adr/0006_testing_strategy.md`)

### Phase 3: Optimization (Future)
- [ ] TDD skill in `.claude/skills/tdd-workflow/SKILL.md`
- [ ] Coverage trending dashboard
- [ ] Property-based testing with fast-check
- [ ] Mutation testing with Stryker

## References

- [Test-Driven Development by Kent Beck](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [Clean Architecture Testing Strategies](https://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html)
- [Vitest Documentation](https://vitest.dev/)
- [docs/00_process/tdd_workflow.md](../../00_process/tdd_workflow.md)
- [.specify/specs/tdd-workflow/spec.md](../../../.specify/specs/tdd-workflow/spec.md)
