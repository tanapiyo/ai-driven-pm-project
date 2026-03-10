/**
 * @layer app
 * @what ホームページ - 認証状態に基づくリダイレクト
 * @why 認証済みユーザーは dashboard へ、未認証は login へ自動遷移
 */

'use client';

import * as React from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth';

export default function HomePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  useEffect(() => {
    // Hydration完了を待つ（SSR/CSRの不一致を防止）
    if (!isHydrated) return;

    // 認証済み → dashboard へリダイレクト
    if (isAuthenticated) {
      router.replace('/dashboard');
      return;
    }

    // 未認証 → login へリダイレクト
    router.replace('/login');
  }, [isAuthenticated, isHydrated, router]);

  // Hydration中またはリダイレクト処理中はローディング表示
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-900">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 dark:border-primary-400 border-t-transparent"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
