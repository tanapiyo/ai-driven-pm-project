/**
 * @what 認可コンテキスト型定義
 * @why ミドルウェア（presentation）とヘルパー（usecase）の両方で使用する型を usecase 層に配置し、依存方向を正しく保つ
 */

import type { UserRole } from '@/domain/index.js';

/**
 * 認可コンテキスト - ミドルウェアで設定し、ユースケースで参照する
 */
export interface AuthorizedContext {
  userId: string;
  role: UserRole;
}
