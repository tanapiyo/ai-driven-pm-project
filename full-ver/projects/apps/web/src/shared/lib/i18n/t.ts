/**
 * @layer shared
 * @segment lib/i18n
 * @what 辞書からドット区切りキーで文言を取得するヘルパー
 *
 * ## 使用方法
 *
 * ```ts
 * import { t } from '@/shared/lib';
 *
 * // キーで取得
 * t('common.actions.save')        // => '保存'
 * t('auth.login.title')           // => 'ログイン'
 * t('navigation.menu.dashboard')  // => 'ダッシュボード'
 * ```
 *
 * ## 変数補間
 *
 * `{{variable}}` プレースホルダーを `vars` オプションで置換できます:
 *
 * ```ts
 * t('dashboard.welcome', { vars: { name: 'Alice' } })
 * // => 'ようこそ、Aliceさん'
 * ```
 *
 * ## 将来の i18n ライブラリ移行
 * このヘルパーをライブラリの `t()` / `useTranslations()` に置き換えることで
 * 移行が完結します。キー構造は変更不要です。
 */

import { dictionary } from './dictionary';

/** 辞書のドット区切りキーパス */
type DotPath<T, Prefix extends string = ''> = T extends string
  ? Prefix
  : {
      [K in keyof T & string]: T[K] extends string
        ? Prefix extends ''
          ? K
          : `${Prefix}.${K}`
        : DotPath<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>;
    }[keyof T & string];

/** 辞書キーの型 */
export type TranslationKey = DotPath<typeof dictionary>;

/** t() オプション */
interface TOptions {
  /** `{{variable}}` 形式のプレースホルダーを置換する変数マップ */
  vars?: Record<string, string | number>;
}

/**
 * 辞書からドット区切りキーで文言を取得する
 *
 * @param key - 辞書キー（例: 'common.actions.save'）
 * @param options - 変数補間オプション
 * @returns 文言文字列（プレーンテキスト。HTML-safe ではないため
 *   dangerouslySetInnerHTML に渡してはならない）
 */
export function t(key: TranslationKey, options?: TOptions): string {
  const segments = key.split('.');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let value: any = dictionary;

  for (const segment of segments) {
    if (value == null || typeof value !== 'object') {
      // キーが見つからない場合はキー自体を返す（フォールバック）
      return key;
    }
    value = value[segment];
  }

  if (typeof value !== 'string') {
    // 葉ノードが文字列でない場合はキー自体を返す（フォールバック）
    return key;
  }

  if (options?.vars) {
    return value.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => {
      const replacement = options.vars![varName];
      return replacement !== undefined ? String(replacement) : `{{${varName}}}`;
    });
  }

  return value;
}
