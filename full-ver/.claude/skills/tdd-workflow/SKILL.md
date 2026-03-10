---
name: tdd-workflow
description: Test-Driven Development workflow integrated with DocDD. Apply when writing tests, implementing features, or following Red-Green-Refactor cycle. Triggers on "TDD", "test first", "write test", "red green refactor", "test coverage".
globs:
  - "**/*.test.ts"
  - "**/__tests__/**"
  - "docs/00_process/tdd_workflow.md"
  - ".specify/specs/**/spec.md"
alwaysApply: false
---

# TDD Workflow

Test-Driven Development integrated into DocDD process.

## TDD Integration with DocDD

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

## Red-Green-Refactor Cycle

### 🔴 RED: Write Failing Test

**Goal**: Define expected behavior as executable test

```typescript
// Step 1: Pick an Acceptance Criteria from Spec
// AC-001: User creation with valid parameters

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

**Run watch mode**:
```bash
./tools/contract test watch
# Verify test FAILS (implementation doesn't exist yet)
```

### 🟢 GREEN: Write Minimal Code

**Goal**: Make test pass with simplest implementation

```typescript
export class User extends AggregateRoot<UserId> {
  static create(params: CreateUserParams): Result<User, string> {
    // Minimal validation
    if (!params.name || params.name.length === 0) {
      return Result.fail('invalid_name');
    }

    // Create entity
    const user = new User(params.id, params.email, params.name, 0);

    // Emit event
    user.addDomainEvent(new UserCreatedEvent({ ... }));

    return Result.ok(user);
  }
}
```

**Watch mode automatically reruns** - verify test PASSES

### 🔵 REFACTOR: Clean Up Code

**Goal**: Improve code quality while maintaining all tests passing

```bash
# Run quality gates in order
./tools/contract format
./tools/contract lint
./tools/contract typecheck
./tools/contract test       # Must stay GREEN
./tools/contract guardrail
```

**Refactor safely** - tests catch any breaks

## Layer-Specific Strategies

### Domain Layer (Pure Logic)

**No Mocks Needed**:
```typescript
// ✅ Good: Direct testing
const result = User.create(params);
expect(result).toBeSuccess();

// ❌ Bad: No mocks in domain tests
const mockService = vi.fn(); // Wrong layer
```

**Test Patterns**:
- Factory methods (User.create)
- Business rules (name validation)
- Domain events (UserCreatedEvent)
- Edge cases (boundary values)

### UseCase Layer (Orchestration)

**Mock Dependencies**:
```typescript
import { createMockUserRepository } from '__tests__/helpers/mock-builders.js';

describe('RegisterUseCase', () => {
  let mockRepo: MockType<UserRepository>;
  let usecase: RegisterUseCase;

  beforeEach(() => {
    mockRepo = createMockUserRepository();
    usecase = new RegisterUseCase(mockRepo);
  });

  it('registers user successfully', async () => {
    // Arrange
    mockRepo.save.mockResolvedValue(Result.ok(undefined));

    // Act
    const result = await usecase.execute({ ... });

    // Assert
    expect(result).toBeSuccess();
    expect(mockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Test User' })
    );
  });
});
```

**Test Patterns**:
- Happy path (success scenario)
- Error handling (repository failures)
- Transaction boundaries
- Event publishing

### Presentation Layer (HTTP)

**Mock UseCases**:
```typescript
describe('AuthController', () => {
  it('returns 200 on successful login', async () => {
    const mockUseCase = vi.fn().mockResolvedValue(
      Result.ok({ accessToken: 'token' })
    );

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'pass' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });
});
```

**Test Patterns**:
- Request validation
- Response format
- Error status codes
- Middleware behavior

## Shared Test Utilities

### Fixtures (Reusable Test Data)

```typescript
import { userFixtures } from '__tests__/fixtures/user-fixtures.js';

// Basic usage
const params = userFixtures.validCreateParams();

// Customization
const adminParams = userFixtures.withEmail('admin@example.com');
const edgeCaseParams = userFixtures.withName(userFixtures.names.maxLength);
```

### Custom Matchers (Result Type)

```typescript
import '__tests__/matchers/result-matchers.js';

// Success assertion
expect(result).toBeSuccess();

// Failure with specific error
expect(result).toBeFailure('invalid_name');
```

### Mock Builders (Type-Safe Mocks)

```typescript
import { createMockUserRepository } from '__tests__/helpers/mock-builders.js';

const mockRepo = createMockUserRepository();
mockRepo.findById.mockResolvedValue(Result.ok(user));
mockRepo.save.mockResolvedValue(Result.ok(undefined));
```

## Coverage Requirements

**80% threshold** enforced by vitest.config.ts:

```typescript
coverage: {
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  }
}
```

**Run coverage report**:
```bash
./tools/contract test coverage
# View: projects/apps/api/coverage/index.html
```

**Exclusions** (no coverage needed):
- Generated code (prisma/*)
- DI composition (src/composition/*)
- Entry points (src/index.ts)

## AAA Pattern (Mandatory)

All tests must follow Arrange-Act-Assert:

```typescript
it('changes user name successfully', () => {
  // Arrange: Setup test data and mocks
  const user = User.create(userFixtures.validCreateParams()).value;
  const newName = 'New Name';

  // Act: Execute the operation
  const result = user.changeName(newName, 'cause-1', 'corr-1');

  // Assert: Verify the outcome
  expect(result).toBeSuccess();
  expect(user.name).toBe('New Name');
  expect(user.getDomainEvents()).toHaveLength(1);
});
```

## Commands

```bash
# TDD watch mode (Red-Green-Refactor)
./tools/contract test watch

# Coverage report
./tools/contract test coverage

# Regular test run (with coverage threshold)
./tools/contract test
```

## Workflow Example: Add Feature

1. **Read Spec** → `.specify/specs/<feature>/spec.md`
2. **RED** → Write failing test for AC
3. **GREEN** → Implement minimal code
4. **REFACTOR** → Run quality gates
5. **Repeat** → Next AC

## Common Mistakes

❌ **Writing implementation before test**
✅ Write test first, see it fail, then implement

❌ **Testing implementation details**
✅ Test public interface behavior

❌ **Skipping RED phase**
✅ Always verify test fails before implementing

❌ **Large test files**
✅ One describe block per method/function

❌ **Magic values in tests**
✅ Use fixtures for test data

## Troubleshooting

### Tests are slow
- Check file watch excludes in vitest.config.ts
- Reduce test isolation overhead
- Avoid real I/O in unit tests

### Coverage not increasing
- Check coverage.exclude in vitest.config.ts
- Verify test files are *.test.ts
- Check if code is in excluded paths

### Mocks are complex
- Extract common mocks to mock-builders.ts
- Use in-memory implementations for integration tests
- Simplify UseCase dependencies

## See Also

- [docs/00_process/tdd_workflow.md](../../../docs/00_process/tdd_workflow.md) - Full guide
- [docs/02_architecture/adr/0006_testing_strategy.md](../../../docs/02_architecture/adr/0006_testing_strategy.md) - ADR
- `.claude/skills/quality-gates/SKILL.md` - Quality commands
