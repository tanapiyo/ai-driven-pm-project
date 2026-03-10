/**
 * @what Application層のエラー定義
 * @why ドメインエラーとアプリケーションエラーを明確に分離
 *
 * Clean Architectureルール:
 * - DomainError: ビジネスルール違反（domain層）
 * - AppError: アプリケーション固有のエラー（application層）
 * - HTTPステータスへのマッピングはpresentation層で行う
 */

/**
 * Domain errors (business rule violations)
 */
export type DomainError = 'invalid_email' | 'weak_password' | 'invalid_rank' | 'invalid_input';

/**
 * Application errors (use case failures)
 */
export type AppError =
  | 'not_found'
  | 'already_exists'
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'internal_error'
  | 'validation_error';

/**
 * Combined error type for use cases
 */
export type UseCaseError = DomainError | AppError;
