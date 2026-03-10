/**
 * @what Result<T, E> 型 - 成功/失敗を型安全に表現
 * @why try-catchではなく戻り値でエラーを扱い、呼び出し側がエラーハンドリングを忘れることを防ぐ
 *
 * Usage:
 * ```typescript
 * function findUser(id: string): Result<User, 'not_found' | 'db_error'> {
 *   const user = db.find(id);
 *   if (!user) return Result.fail('not_found');
 *   return Result.ok(user);
 * }
 *
 * const result = findUser('123');
 * if (result.isFailure()) {
 *   switch (result.error) {
 *     case 'not_found': return handleNotFound();
 *     case 'db_error': return handleDbError();
 *   }
 * }
 * const user = result.value;
 * ```
 */

export class Result<T, E = string> {
  private constructor(
    private readonly _isSuccess: boolean,
    private readonly _value?: T,
    private readonly _error?: E
  ) {}

  /**
   * 成功結果を作成
   */
  static ok<T, E = never>(value: T): Result<T, E> {
    return new Result<T, E>(true, value);
  }

  /**
   * 失敗結果を作成
   */
  static fail<T = never, E = string>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  /**
   * 成功かどうか
   */
  isSuccess(): this is Result<T, never> & { value: T } {
    return this._isSuccess;
  }

  /**
   * 失敗かどうか
   */
  isFailure(): this is Result<never, E> & { error: E } {
    return !this._isSuccess;
  }

  /**
   * 成功時の値を取得（失敗時はエラー）
   */
  get value(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot get value of failed result');
    }
    return this._value as T;
  }

  /**
   * 失敗時のエラーを取得（成功時はundefined）
   */
  get error(): E | undefined {
    return this._error;
  }

  /**
   * 成功時に変換関数を適用
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isSuccess) {
      return Result.ok(fn(this._value as T));
    }
    return Result.fail(this._error as E);
  }

  /**
   * 成功時に別のResultを返す関数を適用
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this._isSuccess) {
      return fn(this._value as T);
    }
    return Result.fail(this._error as E);
  }

  /**
   * 失敗時のエラーを変換
   */
  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (!this._isSuccess) {
      return Result.fail(fn(this._error as E));
    }
    return Result.ok(this._value as T);
  }

  /**
   * 成功時の値を取得、失敗時はデフォルト値を返す
   */
  getOrElse(defaultValue: T): T {
    if (this._isSuccess) {
      return this._value as T;
    }
    return defaultValue;
  }

  /**
   * Result を Promise に変換
   */
  toPromise(): Promise<T> {
    if (this._isSuccess) {
      return Promise.resolve(this._value as T);
    }
    return Promise.reject(this._error);
  }
}

/**
 * 複数のResultを結合
 */
export function combineResults<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const result of results) {
    if (result.isFailure()) {
      return Result.fail(result.error as E);
    }
    values.push(result.value);
  }
  return Result.ok(values);
}

/**
 * Result型のエイリアス（よく使うパターン）
 */
export type AsyncResult<T, E = string> = Promise<Result<T, E>>;
