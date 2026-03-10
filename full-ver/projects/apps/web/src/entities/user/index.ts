/**
 * @layer entities
 * @segment user
 * @what ユーザーエンティティ - public API
 *
 * entities は shared のみを import できる
 * 外部からは index.ts 経由でのみアクセスされる
 */
export type { User } from './model/types';
export { UserCard } from './ui/UserCard';
