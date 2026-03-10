/**
 * @layer shared
 * @segment ui
 * @what 統一空状態コンポーネント - データなし・検索結果なし・フィルタ結果なしを統一表示
 * @why 各画面でインラインテキストがバラバラに実装されていた空状態 UI を一元化する
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Database, Search, SlidersHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './Button';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmptyStateVariant = 'no-data' | 'no-results' | 'no-filter-results';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export interface EmptyStateProps {
  /** プリセットバリアント。icon / message / subMessage の既定値を提供する */
  variant?: EmptyStateVariant;
  /** アイコン（Lucide コンポーネント）。variant の既定値を上書きする */
  icon?: LucideIcon;
  /** 主要メッセージ。variant の既定値を上書きする */
  message?: string;
  /** 補足メッセージ */
  subMessage?: string;
  /** アクションボタン */
  action?: EmptyStateAction;
  /** カスタムアクション（action と同時指定した場合は action が優先） */
  children?: ReactNode;
  /** 追加の CSS クラス */
  className?: string;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

interface Preset {
  icon: LucideIcon;
  message: string;
  subMessage: string;
}

const VARIANT_PRESETS: Record<EmptyStateVariant, Preset> = {
  'no-data': {
    icon: Database,
    message: 'データがありません',
    subMessage: 'まだデータが登録されていません。新しいデータを追加してください。',
  },
  'no-results': {
    icon: Search,
    message: '検索結果がありません',
    subMessage: '別のキーワードで検索するか、検索条件を変更してください。',
  },
  'no-filter-results': {
    icon: SlidersHorizontal,
    message: 'フィルタ結果がありません',
    subMessage: 'フィルタ条件に一致するデータが見つかりませんでした。条件を変更してください。',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmptyState({
  variant = 'no-data',
  icon,
  message,
  subMessage,
  action,
  children,
  className = '',
}: EmptyStateProps) {
  const preset = VARIANT_PRESETS[variant];

  const IconComponent = icon ?? preset.icon;
  const displayMessage = message ?? preset.message;
  const displaySubMessage = subMessage ?? preset.subMessage;

  return (
    <div
      role="region"
      aria-label={displayMessage}
      className={`flex flex-col items-center justify-center gap-4 px-4 py-12 text-center ${className}`}
    >
      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
        <IconComponent
          className="h-8 w-8 text-neutral-400 dark:text-neutral-500"
          aria-hidden="true"
        />
      </div>

      {/* Text */}
      <div className="flex flex-col gap-1">
        <p className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          {displayMessage}
        </p>
        <p className="max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
          {displaySubMessage}
        </p>
      </div>

      {/* Action slot */}
      {action && (
        <Button variant={action.variant ?? 'primary'} onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {!action && children}
    </div>
  );
}
