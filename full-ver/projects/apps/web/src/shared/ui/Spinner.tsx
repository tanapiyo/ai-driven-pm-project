/**
 * @layer shared
 * @segment ui
 * @what スピナーローディングコンポーネント - 回転インジケーター
 * @why データ読み込み中に統一された回転アニメーションを表示し、操作中であることをユーザーに伝える
 */

import React from 'react';
import { cn } from '@/shared/lib';

type SpinnerSize = 'sm' | 'md' | 'lg';

const SPINNER_SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-4',
};

interface SpinnerBaseProps {
  /** スピナーのサイズ */
  size?: SpinnerSize;
  /** Additional CSS classes */
  className?: string;
  /** アクセシブルなラベル */
  label?: string;
}

function SpinnerBase({ size = 'md', className, label = '読み込み中...' }: SpinnerBaseProps) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-primary-500 border-t-transparent',
        'dark:border-primary-400 dark:border-t-transparent',
        SPINNER_SIZE_CLASSES[size],
        className
      )}
      role="status"
      aria-label={label}
    />
  );
}

interface PageSpinnerProps {
  /** Additional CSS classes */
  className?: string;
  /** アクセシブルなラベル */
  label?: string;
}

/** ページスピナー - ページ全体のローディング状態に使用 */
export function PageSpinner({ className, label = '読み込み中...' }: PageSpinnerProps) {
  return (
    <div className={cn('min-h-screen flex flex-col items-center justify-center p-8', className)}>
      <div className="flex flex-col items-center gap-4">
        <SpinnerBase size="lg" label={label} />
        <p className="text-neutral-600 dark:text-neutral-400 text-sm">{label}</p>
      </div>
    </div>
  );
}

interface InlineSpinnerProps {
  /** スピナーのサイズ */
  size?: SpinnerSize;
  /** Additional CSS classes */
  className?: string;
  /** アクセシブルなラベル */
  label?: string;
}

/** インラインスピナー - セクション内のローディング状態に使用 */
export function InlineSpinner({
  size = 'md',
  className,
  label = '読み込み中...',
}: InlineSpinnerProps) {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <SpinnerBase size={size} label={label} />
    </div>
  );
}

interface ButtonSpinnerProps {
  /** Additional CSS classes */
  className?: string;
  /** アクセシブルなラベル */
  label?: string;
}

/** ボタンスピナー - ボタン内の処理中状態に使用 */
export function ButtonSpinner({ className, label = '処理中...' }: ButtonSpinnerProps) {
  return <SpinnerBase size="sm" className={cn('inline-block', className)} label={label} />;
}

/** スピナーコンポーネント - バリアントを props で切り替え可能な統合インターフェース */
export type SpinnerVariant = 'page' | 'inline' | 'button';

interface SpinnerProps {
  /** 表示バリアント */
  variant?: SpinnerVariant;
  /** スピナーのサイズ（inline/button バリアントのみ有効） */
  size?: SpinnerSize;
  /** Additional CSS classes */
  className?: string;
  /** アクセシブルなラベル */
  label?: string;
}

/** スピナー - バリアントを props で指定できる統合コンポーネント */
export function Spinner({ variant = 'inline', size, className, label }: SpinnerProps) {
  if (variant === 'page') {
    return <PageSpinner className={className} label={label} />;
  }
  if (variant === 'button') {
    return <ButtonSpinner className={className} label={label} />;
  }
  return <InlineSpinner size={size} className={className} label={label} />;
}
