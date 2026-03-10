/**
 * @what ユーザー管理ユースケース（Admin用）
 * @why Admin 画面からのユーザー CRUD 操作を提供
 */

import { Result, Email } from '@monorepo/shared';
import type {
  AuthUserRepository,
  ListUsersFilter,
  PaginationOptions,
  PasswordService,
} from '@/domain/auth/index.js';
import { AuthUser, AuthUserId, type UserRole, type UserStatus } from '@/domain/auth/index.js';

// ============================================
// Common Types
// ============================================

export interface UserOutput {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

function toUserOutput(user: AuthUser): UserOutput {
  return {
    id: user.id.value,
    email: user.email.value,
    displayName: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ============================================
// List Users
// ============================================

export interface ListUsersInput {
  filter: ListUsersFilter;
  pagination: PaginationOptions;
}

export interface ListUsersOutput {
  data: UserOutput[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type ListUsersError = 'internal_error';

export class ListUsersUseCase {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async execute(input: ListUsersInput): Promise<Result<ListUsersOutput, ListUsersError>> {
    const result = await this.authUserRepository.findAllWithPagination(
      input.filter,
      input.pagination
    );

    if (result.isFailure()) {
      return Result.fail('internal_error');
    }

    const paginatedResult = result.value;
    return Result.ok({
      data: paginatedResult.data.map(toUserOutput),
      pagination: paginatedResult.pagination,
    });
  }
}

// ============================================
// Get User By ID
// ============================================

export type GetUserByIdError = 'not_found' | 'internal_error';

export class GetUserByIdUseCase {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async execute(id: string): Promise<Result<UserOutput, GetUserByIdError>> {
    const userId = new AuthUserId(id);
    const result = await this.authUserRepository.findById(userId);

    if (result.isFailure()) {
      return Result.fail('internal_error');
    }

    if (result.value === null) {
      return Result.fail('not_found');
    }

    return Result.ok(toUserOutput(result.value));
  }
}

// ============================================
// Create User
// ============================================

export interface CreateUserInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

export type CreateUserError =
  | 'invalid_email'
  | 'email_already_exists'
  | 'password_hash_failed'
  | 'internal_error';

export class CreateUserUseCase {
  constructor(
    private readonly authUserRepository: AuthUserRepository,
    private readonly passwordService: PasswordService
  ) {}

  async execute(input: CreateUserInput): Promise<Result<UserOutput, CreateUserError>> {
    // Validate email
    let email: Email;
    try {
      email = Email.create(input.email);
    } catch {
      return Result.fail('invalid_email');
    }

    // Check if email already exists
    const existsResult = await this.authUserRepository.emailExists(email);
    if (existsResult.isFailure()) {
      return Result.fail('internal_error');
    }
    if (existsResult.value) {
      return Result.fail('email_already_exists');
    }

    // Hash password
    const hashResult = await this.passwordService.hash(input.password);
    if (hashResult.isFailure()) {
      return Result.fail('password_hash_failed');
    }
    const passwordHash = hashResult.value;

    // Create user
    const userId = AuthUserId.generate();
    const userResult = AuthUser.create({
      id: userId,
      email,
      name: input.displayName,
      role: input.role,
      status: 'active',
      passwordHash,
      causationId: userId.value,
      correlationId: userId.value,
    });

    if (userResult.isFailure()) {
      return Result.fail('internal_error');
    }

    const user = userResult.value;

    // Save user
    const saveResult = await this.authUserRepository.save(user);
    if (saveResult.isFailure()) {
      return Result.fail('internal_error');
    }

    return Result.ok(toUserOutput(saveResult.value));
  }
}

// ============================================
// Update User
// ============================================

export interface UpdateUserInput {
  displayName?: string;
  role?: UserRole;
  status?: UserStatus;
}

export type UpdateUserError = 'not_found' | 'internal_error';

export class UpdateUserUseCase {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async execute(id: string, input: UpdateUserInput): Promise<Result<UserOutput, UpdateUserError>> {
    const userId = new AuthUserId(id);

    // Find existing user
    const findResult = await this.authUserRepository.findById(userId);
    if (findResult.isFailure()) {
      return Result.fail('internal_error');
    }
    if (findResult.value === null) {
      return Result.fail('not_found');
    }

    const user = findResult.value;

    // Update user
    user.update({
      name: input.displayName,
      role: input.role,
      status: input.status,
    });

    // Save updated user
    const saveResult = await this.authUserRepository.update(user);
    if (saveResult.isFailure()) {
      return Result.fail('internal_error');
    }

    return Result.ok(toUserOutput(saveResult.value));
  }
}

// ============================================
// Deactivate User
// ============================================

export type DeactivateUserError = 'not_found' | 'already_inactive' | 'internal_error';

export class DeactivateUserUseCase {
  constructor(private readonly authUserRepository: AuthUserRepository) {}

  async execute(id: string): Promise<Result<UserOutput, DeactivateUserError>> {
    const userId = new AuthUserId(id);

    // Find existing user
    const findResult = await this.authUserRepository.findById(userId);
    if (findResult.isFailure()) {
      return Result.fail('internal_error');
    }
    if (findResult.value === null) {
      return Result.fail('not_found');
    }

    const user = findResult.value;

    // Check if already inactive
    if (!user.isActive()) {
      return Result.fail('already_inactive');
    }

    // Deactivate user
    user.deactivate();

    // Save updated user
    const saveResult = await this.authUserRepository.update(user);
    if (saveResult.isFailure()) {
      return Result.fail('internal_error');
    }

    return Result.ok(toUserOutput(saveResult.value));
  }
}
