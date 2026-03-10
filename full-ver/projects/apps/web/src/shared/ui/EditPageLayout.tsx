/**
 * @layer shared
 * @segment ui
 * @what 編集ページ共通レイアウト - 全画面編集用
 * @why モーダルから全画面編集への移行に対応
 */

'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb';

export type { BreadcrumbItem };

export interface EditPageLayoutProps {
  /** ページタイトル */
  title: string;
  /** ブレッドクラム項目 */
  breadcrumbs: BreadcrumbItem[];
  /** フォームコンテンツ */
  children: ReactNode;
  /** 保存ボタンクリック時のハンドラ */
  onSave?: () => void;
  /** キャンセルボタンクリック時のハンドラ */
  onCancel: () => void;
  /** 保存中フラグ */
  isLoading?: boolean;
  /** 保存ボタンのラベル（デフォルト: 保存） */
  saveLabel?: string;
  /** キャンセルボタンのラベル（デフォルト: キャンセル） */
  cancelLabel?: string;
  /** フォーム要素として扱う場合のsubmitハンドラ */
  onSubmit?: (e: React.FormEvent) => void;
  /** 外部フォームのIDを指定（submitボタンがそのフォームに紐づく） */
  formId?: string;
  /** 危険なアクション（左側に配置） */
  dangerAction?: ReactNode;
}

export function EditPageLayout({
  title,
  breadcrumbs,
  children,
  onSave,
  onCancel,
  isLoading = false,
  saveLabel = '保存',
  cancelLabel = 'キャンセル',
  onSubmit,
  formId,
  dangerAction,
}: EditPageLayoutProps) {
  const content = (
    <>
      {/* ヘッダー: ブレッドクラム + タイトル */}
      <div className="mb-6">
        {/* ブレッドクラム */}
        <div className="mb-2">
          <Breadcrumb items={breadcrumbs} />
        </div>

        {/* ページタイトル */}
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{title}</h1>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-700 p-6">
          {children}
        </div>
      </div>

      {/* フッター: アクションボタン（固定） */}
      <div className="sticky bottom-0 -mx-8 px-8 py-4 bg-neutral-50 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 mt-6">
        <div className="flex justify-between gap-3">
          <div>{dangerAction}</div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
              {cancelLabel}
            </Button>
            <Button
              type={onSubmit || formId ? 'submit' : 'button'}
              form={formId}
              onClick={onSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  処理中...
                </span>
              ) : (
                saveLabel
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  // onSubmit が指定されている場合はフォームとしてラップ
  if (onSubmit) {
    return (
      <form onSubmit={onSubmit} className="flex flex-col min-h-full pb-4">
        {content}
      </form>
    );
  }

  return <div className="flex flex-col min-h-full pb-4">{content}</div>;
}
