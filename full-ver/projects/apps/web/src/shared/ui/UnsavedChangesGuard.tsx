/**
 * @layer shared
 * @segment ui
 * @what 未保存変更の離脱防止コンポーネント
 * @why フォーム編集中の誤った離脱を防止
 */

'use client';

import { useEffect, useCallback } from 'react';

export interface UnsavedChangesGuardProps {
  /** 未保存の変更があるかどうか */
  isDirty: boolean;
  /** 確認メッセージ（デフォルト: 変更が保存されていません。このページを離れますか？） */
  message?: string;
}

/**
 * 未保存変更がある状態でのページ離脱を防止するコンポーネント
 *
 * @example
 * ```tsx
 * const { formState: { isDirty } } = useForm();
 *
 * return (
 *   <>
 *     <UnsavedChangesGuard isDirty={isDirty} />
 *     <form>...</form>
 *   </>
 * );
 * ```
 */
export function UnsavedChangesGuard({
  isDirty,
  message = '変更が保存されていません。このページを離れますか？',
}: UnsavedChangesGuardProps) {
  // beforeunload イベントハンドラ（ブラウザのタブを閉じる、リロード時）
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = message;
        return message;
      }
    },
    [isDirty, message]
  );

  useEffect(() => {
    if (isDirty) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isDirty, handleBeforeUnload]);

  // Next.js App Router ではルーター遷移のインターセプトが制限されているため、
  // beforeunload のみで対応。リンククリック時の確認は呼び出し側で対応する。
  // 参考: https://nextjs.org/docs/app/api-reference/functions/use-router

  return null;
}

/**
 * ページ離脱の確認を行うカスタムフック
 *
 * @example
 * ```tsx
 * const { confirmNavigation } = useNavigationGuard(isDirty);
 *
 * const handleCancel = () => {
 *   if (confirmNavigation()) {
 *     router.back();
 *   }
 * };
 * ```
 */
export function useNavigationGuard(
  isDirty: boolean,
  message = '変更が保存されていません。このページを離れますか？'
) {
  const confirmNavigation = useCallback((): boolean => {
    if (!isDirty) {
      return true;
    }
    return window.confirm(message);
  }, [isDirty, message]);

  return { confirmNavigation };
}
