/**
 * @what レガシーコード（後方互換性のため）
 * @why 既存のテストとの互換性を維持
 */

export function greet(name: string): string {
  return `Hello, ${name}!`;
}
