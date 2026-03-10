/**
 * @layer shared
 * @segment ui
 * @what スタンドアロンブレッドクラムコンポーネント
 * @why EditPageLayout に依存せず任意の画面でブレッドクラムを表示できるようにする
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  /** href が指定された場合はリンクとして表示。未指定の場合は現在ページとしてテキスト表示 */
  href?: string;
}

export interface BreadcrumbProps {
  /** ブレッドクラム項目の配列。最後の項目は現在ページ（リンクなし）として表示することを推奨 */
  items: BreadcrumbItem[];
  /** aria-label（デフォルト: パンくずリスト） */
  ariaLabel?: string;
}

/**
 * ブレッドクラムナビゲーションコンポーネント。
 *
 * - リンク付き項目は `<Link>` でレンダリングされ、ホバー時に primary カラーに変化する
 * - リンクなし項目（現在ページ）は `<span>` でレンダリングされ、aria-current="page" が付与される
 * - 項目間の区切りには ChevronRight アイコンを使用する（既存パターン踏襲）
 * - ダークモード対応済み（neutral-* スケール使用、WCAG AA 4.5:1 準拠）
 */
export function Breadcrumb({ items, ariaLabel = 'パンくずリスト' }: BreadcrumbProps) {
  const lastIndex = items.length - 1;

  return (
    <nav aria-label={ariaLabel}>
      <ol className="flex items-center text-sm text-neutral-500 dark:text-neutral-400">
        {items.map((item, index) => (
          <li key={`${item.label}-${item.href ?? ''}`} className="flex items-center">
            {index > 0 && (
              <ChevronRight
                className="mx-2 h-4 w-4 text-neutral-400 dark:text-neutral-500"
                aria-hidden="true"
              />
            )}
            {item.href ? (
              <Link
                href={item.href}
                className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="text-neutral-900 dark:text-neutral-100 font-medium"
                aria-current={index === lastIndex ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
