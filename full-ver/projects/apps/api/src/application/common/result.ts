/**
 * @what Result型の定義
 * @why ドメイン/アプリケーション層のエラーハンドリングパターン
 *
 * Clean Architectureルール:
 * - domain/application層は例外を投げない
 * - すべての操作は Result<T, E> を返す
 * - HTTPレスポンスへの変換はpresentation層で行う
 */

/**
 * Result type for functional error handling
 */
export type Result<T, E> = Success<T> | Failure<E>;

export class Success<T> {
  readonly ok = true as const;
  constructor(readonly value: T) {}

  isSuccess(): this is Success<T> {
    return true;
  }

  isFailure(): this is never {
    return false;
  }
}

export class Failure<E> {
  readonly ok = false as const;
  constructor(readonly error: E) {}

  isSuccess(): this is never {
    return false;
  }

  isFailure(): this is Failure<E> {
    return true;
  }
}

export const Result = {
  ok<T>(value: T): Success<T> {
    return new Success(value);
  },

  fail<E>(error: E): Failure<E> {
    return new Failure(error);
  },
};
