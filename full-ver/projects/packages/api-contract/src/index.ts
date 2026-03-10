/**
 * @what API Contract パッケージのエントリポイント
 * @why OpenAPI 生成物と設定を一元的にエクスポート
 */

// HTTP クライアント設定
export { configureApiClient, customFetch, NormalizedApiError, type ApiError } from './http-client';

// 生成物（orval 生成）
// Run `pnpm openapi:generate` to regenerate API types from openapi.yaml
export * from './generated/health/health';
export * from './generated/auth/auth';
export * from './generated/profile/profile';
export * from './generated/admin/admin';
export * from './generated/schemas';
