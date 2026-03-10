/**
 * @layer shared
 * @segment lib
 * @what 日付フォーマットユーティリティ
 */
export function formatDate(date: Date | string, locale = 'ja-JP'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
