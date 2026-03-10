/**
 * @layer features
 * @segment auth
 * @what 認証状態管理フック
 * @why Zustand + React Query を統合した認証インターフェースを提供
 */
'use client';

import { useCallback } from 'react';
import { useAuthStore } from './store';
import { useLogin as useLoginMutation, useLogout as useLogoutMutation } from '../api';

export function useAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();

  const login = useCallback(
    (email: string, password: string) => {
      loginMutation.mutate({ email, password });
    },
    [loginMutation]
  );

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  return {
    isAuthenticated,
    user,
    isLoading: loginMutation.isPending || logoutMutation.isPending,
    error: loginMutation.error?.message ?? null,
    login,
    logout,
  };
}
