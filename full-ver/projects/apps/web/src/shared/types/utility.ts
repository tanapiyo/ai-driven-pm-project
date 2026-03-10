/**
 * @layer shared
 * @segment types
 * @what 汎用ユーティリティ型
 */

/**
 * null を許容する型
 */
export type Nullable<T> = T | null;

/**
 * undefined を許容する型
 */
export type Optional<T> = T | undefined;

/**
 * 全てのプロパティを再帰的にオプショナルにする
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
