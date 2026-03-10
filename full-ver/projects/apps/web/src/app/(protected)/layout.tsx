'use client';

/**
 * @layer app
 * @what 保護されたページのレイアウト
 * @why 認証が必要なページの共通レイアウト（サイドバー付き）
 */

import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, restoreAuthFromStorage, useCurrentUser } from '@/features/auth';
import { Header, Sidebar } from '@/widgets';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const hasPotentialSession = useAuthStore((state) => state.hasPotentialSession);
  const user = useAuthStore((state) => state.user);
  const [isChecking, setIsChecking] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const restoreAttempted = useRef(false);
  const handleMobileSidebarToggle = useCallback(() => {
    setIsMobileSidebarOpen((isOpen) => !isOpen);
  }, []);
  const handleMobileSidebarClose = useCallback(() => {
    setIsMobileSidebarOpen(false);
  }, []);

  // ユーザー情報を取得
  useCurrentUser();

  // ログアウト時に restoreAttempted をリセット
  // これにより、再ログイン後にセッション復元が正しく動作する
  useEffect(() => {
    if (!isAuthenticated) {
      restoreAttempted.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    async function checkAuth() {
      // ストアがまだ初期化されていない場合は待つ
      if (!isHydrated) {
        return;
      }

      // すでに認証済みならチェック完了
      if (isAuthenticated) {
        setIsChecking(false);
        return;
      }

      // refreshToken がない（セッションの可能性もない）場合は即座にリダイレクト
      if (!hasPotentialSession) {
        // リダイレクトループ防止: 既にログインページにいる場合はスキップ
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          router.replace('/login');
        }
        return;
      }

      // 復元を1回だけ試行
      if (restoreAttempted.current) {
        return;
      }
      restoreAttempted.current = true;

      // HttpOnly Cookie から refreshToken を使って認証を復元
      // Cookie は credentials: 'include' により自動送信される
      const restored = await restoreAuthFromStorage();
      if (!restored) {
        // リダイレクトループ防止: 既にログインページにいる場合はスキップ
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          router.replace('/login');
        }
      } else {
        setIsChecking(false);
      }
    }

    checkAuth();
  }, [isAuthenticated, isHydrated, hasPotentialSession, router]);

  useEffect(() => {
    if (!isMobileSidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileSidebarOpen]);

  // ストア未初期化または認証チェック中はローディング表示
  if (!isHydrated || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-neutral-600 dark:text-neutral-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden md:flex">
      {user && (
        <Sidebar
          role={user.role}
          isMobileOpen={isMobileSidebarOpen}
          onMobileToggle={handleMobileSidebarToggle}
          onMobileClose={handleMobileSidebarClose}
        />
      )}
      <div className="flex-1 flex min-h-screen min-w-0 flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-neutral-50 dark:bg-neutral-900">
          {children}
        </main>
      </div>
    </div>
  );
}
