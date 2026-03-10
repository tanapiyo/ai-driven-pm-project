/**
 * @what パスワードリセットトークンエンティティ
 * @why パスワードリセットフローのトークン管理
 */

import { Entity, UUIDIdentifier, Result } from '@monorepo/shared';
import type { AuthUserId } from './auth-user.js';
import { TokenHash } from './refresh-token.js';

/**
 * パスワードリセットトークンID
 */
export class PasswordResetTokenId extends UUIDIdentifier {}

/**
 * パスワードリセットトークン作成パラメータ
 */
export interface CreatePasswordResetTokenParams {
  id: PasswordResetTokenId;
  userId: AuthUserId;
  tokenHash: TokenHash;
  expiresAt: Date;
}

/**
 * パスワードリセットトークンエンティティ
 */
export class PasswordResetToken extends Entity<PasswordResetTokenId> {
  private readonly _userId: AuthUserId;
  private readonly _tokenHash: TokenHash;
  private readonly _expiresAt: Date;
  private readonly _createdAt: Date;
  private _usedAt: Date | null;

  private constructor(
    id: PasswordResetTokenId,
    userId: AuthUserId,
    tokenHash: TokenHash,
    expiresAt: Date,
    createdAt: Date,
    usedAt: Date | null
  ) {
    super(id);
    this._userId = userId;
    this._tokenHash = tokenHash;
    this._expiresAt = expiresAt;
    this._createdAt = createdAt;
    this._usedAt = usedAt;
  }

  /**
   * ファクトリメソッド
   */
  static create(params: CreatePasswordResetTokenParams): Result<PasswordResetToken, never> {
    const token = new PasswordResetToken(
      params.id,
      params.userId,
      params.tokenHash,
      params.expiresAt,
      new Date(),
      null
    );
    return Result.ok(token);
  }

  /**
   * 永続化データからリストア
   */
  static restore(
    id: PasswordResetTokenId,
    userId: AuthUserId,
    tokenHash: TokenHash,
    expiresAt: Date,
    createdAt: Date,
    usedAt: Date | null
  ): PasswordResetToken {
    return new PasswordResetToken(id, userId, tokenHash, expiresAt, createdAt, usedAt);
  }

  get userId(): AuthUserId {
    return this._userId;
  }

  get tokenHash(): TokenHash {
    return this._tokenHash;
  }

  get expiresAt(): Date {
    return this._expiresAt;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get usedAt(): Date | null {
    return this._usedAt;
  }

  /**
   * トークンが有効かどうか
   */
  isValid(): boolean {
    const now = new Date();
    return this._usedAt === null && this._expiresAt > now;
  }

  /**
   * トークンを使用済みにする
   */
  markAsUsed(): Result<void, 'already_used' | 'expired'> {
    if (this._usedAt !== null) {
      return Result.fail('already_used');
    }
    if (this._expiresAt <= new Date()) {
      return Result.fail('expired');
    }
    this._usedAt = new Date();
    return Result.ok(undefined);
  }
}
