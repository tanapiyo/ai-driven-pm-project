/**
 * @what エラー → HTTPステータスマッピング
 * @why DomainError/AppError を HTTPレスポンスに変換
 *
 * Clean Architectureルール:
 * - ドメインエラーはHTTPを知らない
 * - Presenterがエラーをステータスコード + メッセージに変換
 */

import type { UseCaseError } from '@/application/common/errors.js';

export interface ErrorMapping {
  status: number;
  code: string;
  message: string;
}

/**
 * Default error mappings
 */
export const DEFAULT_ERROR_MAP: Record<UseCaseError, ErrorMapping> = {
  // Domain errors (400 Bad Request)
  invalid_email: {
    status: 400,
    code: 'INVALID_EMAIL',
    message: 'Invalid email format',
  },
  weak_password: {
    status: 400,
    code: 'WEAK_PASSWORD',
    message: 'Password must be at least 8 characters with letters and numbers',
  },
  invalid_rank: {
    status: 400,
    code: 'INVALID_RANK',
    message: 'Invalid rank value',
  },
  invalid_input: {
    status: 400,
    code: 'INVALID_INPUT',
    message: 'Invalid input data',
  },

  // Application errors
  not_found: {
    status: 404,
    code: 'NOT_FOUND',
    message: 'Resource not found',
  },
  already_exists: {
    status: 409,
    code: 'ALREADY_EXISTS',
    message: 'Resource already exists',
  },
  unauthorized: {
    status: 401,
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
  },
  forbidden: {
    status: 403,
    code: 'FORBIDDEN',
    message: 'Access forbidden',
  },
  conflict: {
    status: 409,
    code: 'CONFLICT',
    message: 'Resource conflict',
  },
  internal_error: {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  },
  validation_error: {
    status: 422,
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
  },
};

/**
 * Get error mapping for a given error
 */
export function getErrorMapping(
  error: UseCaseError,
  customMap?: Partial<Record<UseCaseError, ErrorMapping>>
): ErrorMapping {
  return customMap?.[error] ?? DEFAULT_ERROR_MAP[error];
}
