/**
 * @what リフレッシュトークンエンティティ
 * @why JWTリフレッシュトークンの管理
 *
 * domain層のルール:
 * - 外部依存禁止
 * - 純粋なビジネスロジックのみ
 */

import { Entity, UUIDIdentifier, Result } from '@monorepo/shared';
import type { AuthUserId } from './auth-user.js';

/**
 * リフレッシュトークンID
 */
export class RefreshTokenId extends UUIDIdentifier {}

/**
 * トークンハッシュ値オブジェクト
 */
export class TokenHash {
  private constructor(private readonly _value: string) {}

  static create(hash: string): TokenHash {
    return new TokenHash(hash);
  }

  get value(): string {
    return this._value;
  }

  equals(other: TokenHash): boolean {
    return this._value === other._value;
  }
}

/**
 * リフレッシュトークン作成パラメータ
 */
export interface CreateRefreshTokenParams {
  id: RefreshTokenId;
  userId: AuthUserId;
  tokenHash: TokenHash;
  expiresAt: Date;
}

/**
 * リフレッシュトークンエンティティ
 */
export class RefreshToken extends Entity<RefreshTokenId> {
  private readonly _userId: AuthUserId;
  private readonly _tokenHash: TokenHash;
  private readonly _expiresAt: Date;
  private readonly _createdAt: Date;
  private _revokedAt: Date | null;

  private constructor(
    id: RefreshTokenId,
    userId: AuthUserId,
    tokenHash: TokenHash,
    expiresAt: Date,
    createdAt: Date,
    revokedAt: Date | null
  ) {
    super(id);
    this._userId = userId;
    this._tokenHash = tokenHash;
    this._expiresAt = expiresAt;
    this._createdAt = createdAt;
    this._revokedAt = revokedAt;
  }

  /**
   * ファクトリメソッド - 新規トークン作成
   */
  static create(params: CreateRefreshTokenParams): Result<RefreshToken, never> {
    const token = new RefreshToken(
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
    id: RefreshTokenId,
    userId: AuthUserId,
    tokenHash: TokenHash,
    expiresAt: Date,
    createdAt: Date,
    revokedAt: Date | null
  ): RefreshToken {
    return new RefreshToken(id, userId, tokenHash, expiresAt, createdAt, revokedAt);
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

  get revokedAt(): Date | null {
    return this._revokedAt;
  }

  /**
   * トークンが有効かどうか
   */
  isValid(): boolean {
    const now = new Date();
    return this._revokedAt === null && this._expiresAt > now;
  }

  /**
   * トークンを無効化
   */
  revoke(): Result<void, 'already_revoked'> {
    if (this._revokedAt !== null) {
      return Result.fail('already_revoked');
    }
    this._revokedAt = new Date();
    return Result.ok(undefined);
  }
}
