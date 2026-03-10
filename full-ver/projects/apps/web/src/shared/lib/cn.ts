/**
 * @layer shared
 * @segment lib
 * @what クラス名結合ユーティリティ（Tailwind クラス競合を正しく解決）
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
