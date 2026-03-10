# TDD Workflow (Test-Driven Development)

このドキュメントは、Test-Driven Development (TDD) を DocDD (Document-Driven Development) ワークフローに統合する方法を説明します。

---

## TDD と DocDD の統合

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

---

## TDD の 3 つのフェーズ

### 🔴 RED Phase: テストを書いて失敗させる

**目的**: 仕様を実行可能なテストとして定義する

**手順**:
1. Spec の Acceptance Criteria (AC) を選ぶ
2. AC を具体的なテストケースに変換する
3. テストを書く（実装はまだない状態）
4. テストを実行して **RED (失敗)** を確認する

**例**: User.create のテスト

```typescript
/**
 * AC-001: User creation with valid parameters
 * Given: Valid user parameters (id, email, name)
 * When: User.create() is called
 * Then: Returns success Result with User entity
 */

describe('User.create', () => {
  it('creates user with valid parameters', () => {
    // Arrange
    const params = {
      id: new UserId('550e8400-e29b-41d4-a716-446655440000'),
      email: Email.create('test@example.com'),
      name: 'Test User',
      causationId: 'causation-1',
      correlationId: 'correlation-1',
    };

    // Act
    const result = User.create(params);

    // Assert
    expect(result.isSuccess()).toBe(true);
    expect(result.value.name).toBe('Test User');
  });
});
```

**Watch Mode で実行**:
```bash
./tools/contract test:watch
# または
cd projects/apps/api && pnpm test:watch
```

---

### 🟢 GREEN Phase: 最小限の実装でテストを通す

**目的**: テストを通す最もシンプルな実装を書く

**原則**:
- **最小限の実装**: テストを通すために必要な最小限のコードのみ
- **ハードコード OK**: 最初はハードコードでも良い（Refactor で改善）
- **すべてのテストが GREEN**: 既存テストも含めてすべて通ること

**例**: User.create の実装

```typescript
export class User extends AggregateRoot<UserId> {
  private constructor(
    id: UserId,
    public readonly email: Email,
    public name: string,
    version: number
  ) {
    super(id, version);
  }

  static create(params: {
    id: UserId;
    email: Email;
    name: string;
    causationId: string;
    correlationId: string;
  }): Result<User, string> {
    // Validation (minimal)
    if (!params.name || params.name.length === 0) {
      return Result.fail('invalid_name');
    }
    if (params.name.length > 100) {
      return Result.fail('invalid_name');
    }

    // Create entity
    const user = new User(params.id, params.email, params.name, 0);

    // Emit domain event
    user.addDomainEvent(
      new UserCreatedEvent({
        userId: params.id.value,
        email: params.email.value,
        name: params.name,
        causationId: params.causationId,
        correlationId: params.correlationId,
      })
    );

    return Result.ok(user);
  }
}
```

**実行**:
```bash
# Watch mode で自動実行される
# または手動実行
./tools/contract test
```

---

### 🔵 REFACTOR Phase: コードを改善する

**目的**: テストを維持したまま、コードの品質を向上させる

**チェックリスト**:
- [ ] 重複コード (DRY原則)
- [ ] 命名の明確さ
- [ ] Clean Architecture 順守
- [ ] マジックナンバーの排除
- [ ] 型安全性の向上

**実行するコマンド**:
```bash
# 1. フォーマット
./tools/contract format

# 2. リント
./tools/contract lint

# 3. 型チェック
./tools/contract typecheck

# 4. テスト（すべて GREEN を維持）
./tools/contract test

# 5. アーキテクチャガードレール
./tools/contract guardrail

# 6. ビルド
./tools/contract build
```

**Golden Commands の実行順序**: [.claude/rules/05-quality.md](../../.claude/rules/05-quality.md)

---

## レイヤー別のテスト戦略

### Domain Layer (Pure Business Logic)

**特徴**:
- 外部依存なし（DB, HTTP, Framework）
- 純粋な関数とクラス
- Mock 不要

**テスト例**:
```typescript
// src/domain/user/user.test.ts
describe('User', () => {
  it('creates user with valid parameters', () => {
    const result = User.create({ ... });
    expect(result.isSuccess()).toBe(true);
  });

  it('fails when name is empty', () => {
    const result = User.create({ ...validParams, name: '' });
    expect(result.isFailure()).toBe(true);
    expect(result.error).toBe('invalid_name');
  });

  it('emits UserCreatedEvent on creation', () => {
    const user = User.create({ ... }).value;
    const events = user.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(UserCreatedEvent);
  });
});
```

**TDD サイクル**:
1. 🔴 ビジネスルールをテストで表現
2. 🟢 ドメインロジックを実装
3. 🔵 Value Object, Entity の設計を洗練

---

### UseCase Layer (Application Logic)

**特徴**:
- ドメインを orchestrate
- Repository, Service をインジェクション
- Mock 必須

**テスト例**:
```typescript
// src/usecase/auth/login.test.ts
describe('LoginUseCase', () => {
  let mockUserRepo: MockType<IUserRepository>;
  let mockPasswordService: MockType<IPasswordService>;
  let mockTokenService: MockType<ITokenService>;
  let usecase: LoginUseCase;

  beforeEach(() => {
    // Setup mocks
    mockUserRepo = {
      findByEmail: vi.fn(),
      save: vi.fn(),
    };
    mockPasswordService = {
      verify: vi.fn(),
    };
    mockTokenService = {
      generate: vi.fn(),
    };

    usecase = new LoginUseCase(
      mockUserRepo,
      mockPasswordService,
      mockTokenService
    );
  });

  it('returns tokens when credentials are valid', async () => {
    // Arrange
    const user = createMockUser();
    mockUserRepo.findByEmail.mockResolvedValue(user);
    mockPasswordService.verify.mockResolvedValue(true);
    mockTokenService.generate.mockResolvedValue({
      accessToken: 'token-123',
      refreshToken: 'refresh-456',
    });

    // Act
    const result = await usecase.execute({
      email: 'test@example.com',
      password: 'Password123',
    });

    // Assert
    expect(result.isSuccess()).toBe(true);
    expect(result.value).toHaveProperty('accessToken');
    expect(mockUserRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
  });
});
```

**TDD サイクル**:
1. 🔴 ユースケースのシナリオをテストで表現
2. 🟢 ドメインとインフラを繋ぐロジックを実装
3. 🔵 エラーハンドリング、トランザクションを改善

---

### Presentation Layer (HTTP/Controller)

**特徴**:
- HTTP リクエスト/レスポンスのマッピング
- Middleware のテスト
- UseCase を Mock

**テスト例**:
```typescript
// src/presentation/middleware/csrf-middleware.test.ts
describe('CSRFMiddleware', () => {
  it('allows GET requests without CSRF token', () => {
    const req = createMockRequest({ method: 'GET' });
    const res = createMockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('blocks POST requests without CSRF token', () => {
    const req = createMockRequest({ method: 'POST', body: {} });
    const res = createMockResponse();
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
```

**TDD サイクル**:
1. 🔴 HTTP インタフェースの振る舞いをテスト
2. 🟢 リクエスト/レスポンスのマッピングを実装
3. 🔵 バリデーション、エラーレスポンスを改善

---

## 共有テストユーティリティ

**重要**: カスタムマッチャーは `vitest.setup.ts` で自動読み込みされます。テストファイルで個別にインポートする必要はありません。

### Fixtures (テストデータ)

実際のファイル: `projects/apps/api/__tests__/fixtures/user-fixtures.ts`

```typescript
import { userFixtures } from '__tests__/fixtures/user-fixtures.js';

// 基本的な使い方
const params = userFixtures.validCreateParams();
const user = User.create(params);

// カスタマイズ
const adminParams = userFixtures.withEmail('admin@example.com');
const edgeCaseParams = userFixtures.withName(userFixtures.names.maxLength);

// 複数のテストIDを使用
const userId = userFixtures.userIds.user1;
```

### Mock Builders (Repository, Service)

実際のファイル: `projects/apps/api/__tests__/helpers/mock-builders.ts`

```typescript
import { createMockUserRepository, createMockPasswordService } from '__tests__/helpers/mock-builders.js';

describe('RegisterUseCase', () => {
  let mockRepo: MockType<UserRepository>;
  let mockPasswordService: MockType<PasswordService>;

  beforeEach(() => {
    // 型安全な Mock を作成
    mockRepo = createMockUserRepository();
    mockPasswordService = createMockPasswordService();
  });

  it('registers user successfully', async () => {
    // Mock の振る舞いを設定
    mockRepo.save.mockResolvedValue(Result.ok(undefined));
    mockPasswordService.hash.mockResolvedValue('hashed-password');

    // UseCase にインジェクション
    const usecase = new RegisterUseCase(mockRepo, mockPasswordService);
    const result = await usecase.execute({ ... });

    // Mock の呼び出しを検証
    expect(mockPasswordService.hash).toHaveBeenCalledWith('password123');
    expect(mockRepo.save).toHaveBeenCalled();
  });
});
```

### Custom Matchers (Result型)

実際のファイル: `projects/apps/api/__tests__/matchers/result-matchers.ts`

**自動読み込み**: `vitest.setup.ts` で自動的に読み込まれるため、テストファイルでインポート不要

```typescript
// テストファイル内で直接使用可能
describe('User.create', () => {
  it('creates user with valid parameters', () => {
    const result = User.create(params);

    // 成功をアサート
    expect(result).toBeSuccess();
  });

  it('fails when name is empty', () => {
    const result = User.create({ ...params, name: '' });

    // 失敗を検証（エラーコード指定可能）
    expect(result).toBeFailure('invalid_name');
  });
});
```

**利点**:
- 可読性向上: `result.isSuccess()` より `toBeSuccess()` の方が直感的
- エラーメッセージの改善: 失敗時に詳細な情報を表示
- 型安全: TypeScript で Result 型を正しく推論

---

## 実践例: 新機能実装のTDDフロー

### シナリオ: ユーザー名変更機能の実装

#### Step 0: Spec確認
- Spec: `.specify/specs/profile-edit/spec.md`
- AC-003: ユーザーが自分の名前を変更できる

#### Step 1: 🔴 RED - テストを書く

```typescript
// src/usecase/profile/change-name.test.ts
describe('ChangeNameUseCase', () => {
  it('changes user name successfully', async () => {
    // Arrange
    const mockRepo = createMockUserRepository();
    const existingUser = User.restore(
      new UserId('user-1'),
      Email.create('test@example.com'),
      'Old Name',
      1
    );
    mockRepo.findById.mockResolvedValue(existingUser);
    mockRepo.save.mockResolvedValue(undefined);

    const usecase = new ChangeNameUseCase(mockRepo);

    // Act
    const result = await usecase.execute({
      userId: 'user-1',
      newName: 'New Name',
      causationId: 'cmd-1',
      correlationId: 'corr-1',
    });

    // Assert
    expect(result).toBeSuccess();
    expect(mockRepo.save).toHaveBeenCalled();
    const savedUser = mockRepo.save.mock.calls[0][0];
    expect(savedUser.name).toBe('New Name');
  });
});
```

**実行**: `./tools/contract test:watch` → 🔴 FAIL (UseCaseが存在しない)

#### Step 2: 🟢 GREEN - 最小実装

```typescript
// src/usecase/profile/change-name.ts
export class ChangeNameUseCase {
  constructor(private userRepository: IUserRepository) {}

  async execute(input: {
    userId: string;
    newName: string;
    causationId: string;
    correlationId: string;
  }): Promise<Result<void, string>> {
    // Find user
    const user = await this.userRepository.findById(new UserId(input.userId));
    if (!user) {
      return Result.fail('user_not_found');
    }

    // Change name (domain logic)
    const changeResult = user.changeName(
      input.newName,
      input.causationId,
      input.correlationId
    );
    if (changeResult.isFailure()) {
      return changeResult;
    }

    // Save
    await this.userRepository.save(user);

    return Result.ok(undefined);
  }
}
```

**実行**: `./tools/contract test:watch` → 🟢 PASS

#### Step 3: 🔵 REFACTOR - 改善

```bash
# 1. Format
./tools/contract format

# 2. Lint
./tools/contract lint

# 3. Typecheck
./tools/contract typecheck

# 4. Test (維持)
./tools/contract test

# 5. Guardrail
./tools/contract guardrail
```

すべて通れば完了！

---

## トラブルシューティング

### テストが遅い

**原因**: ファイル監視の範囲が広すぎる
**解決**:
```typescript
// vitest.config.ts
watchExclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**']
```

### カバレッジが上がらない

**原因**: テスト対象外のファイルが含まれている
**解決**:
```typescript
// vitest.config.ts
coverage: {
  exclude: [
    'prisma/**',      // Generated code
    'src/composition/**',  // DI root
    'src/index.ts',   // Entry point
  ]
}
```

### Mock が複雑になりすぎる

**原因**: UseCase が多くの依存を持ちすぎている
**解決**:
1. ドメインロジックをドメイン層に移動
2. Repository を集約（Aggregate境界を見直す）
3. UseCase を分割

### テストが脆い（実装変更で壊れる）

**原因**: 実装詳細をテストしている
**解決**:
- 公開インターフェースのみテスト
- 内部実装（private method）はテストしない
- Black box testing を意識

---

## 参考資料

- [Test-Driven Development by Kent Beck](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [Vitest Documentation](https://vitest.dev/)
- [Clean Architecture Testing Strategies](https://blog.cleancoder.com/uncle-bob/2017/03/03/TDD-Harms-Architecture.html)
- [.claude/rules/05-quality.md](../../.claude/rules/05-quality.md) - Quality Gates
- [AGENTS.md](../../AGENTS.md) - Repository Contract
