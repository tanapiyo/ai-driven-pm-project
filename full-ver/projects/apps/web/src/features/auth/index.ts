/**
 * @layer features
 * @segment auth
 * @what 認証機能 - public API
 *
 * features は entities, shared のみを import できる
 * 外部からは index.ts 経由でのみアクセスされる
 */
export { useAuth } from './model/useAuth';
export { useAuthStore, initializeAuthStore, type UserRole, type UserProfile } from './model/store';
export { useLogin, useLogout, useCurrentUser, restoreAuthFromStorage } from './api';
export { LoginForm } from './ui/LoginForm';
