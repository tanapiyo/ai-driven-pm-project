/**
 * @layer features
 * @segment auth
 * @what 認証関連の React Query Mutations
 * @why ログイン/ログアウトなどの API 呼び出しを管理
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getConfig } from '@/shared/config';
import { useAuthStore, type UserRole } from '../model/store';

interface LoginRequest {
  email: string;
  password: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

interface ApiError {
  code: string;
  message: string;
}

async function loginApi(data: LoginRequest): Promise<TokenResponse> {
  const config = getConfig();
  const response = await fetch(`${config.apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include', // Cookie を送受信
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Login failed');
  }

  return response.json();
}

async function logoutApi(refreshToken: string): Promise<void> {
  const config = getConfig();
  const accessToken = useAuthStore.getState().accessToken;

  await fetch(`${config.apiBaseUrl}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ refreshToken }),
    credentials: 'include', // Cookie を送受信（サーバーが Set-Cookie で Cookie を削除）
  });
}

interface CurrentUserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export function useLogin() {
  const setTokens = useAuthStore((state) => state.setTokens);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: loginApi,
    onSuccess: async (data) => {
      setTokens(data.accessToken, data.refreshToken);

      // ログイン成功時にユーザー情報を即座に取得してストアに設定
      // これにより、ProtectedLayout がレンダリングされる前に user が設定される
      try {
        const config = getConfig();
        const meResponse = await fetch(`${config.apiBaseUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${data.accessToken}`,
          },
          credentials: 'include',
        });

        if (meResponse.ok) {
          const userData: CurrentUserResponse = await meResponse.json();
          setUser({
            id: userData.id,
            email: userData.email,
            name: userData.name,
            role: userData.role,
          });
        }
      } catch {
        // ユーザー情報取得に失敗しても、トークンは設定済みなので
        // useCurrentUser クエリが後続で取得を試みる
      }
    },
  });
}

export function useLogout() {
  const { refreshToken, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    },
    onSettled: () => {
      clearAuth();
      // ログアウト時に currentUser クエリキャッシュを invalidate
      // これにより、再ログイン時に古いユーザー情報が表示されることを防ぐ
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });
}

interface RefreshRequest {
  refreshToken: string;
}

async function refreshTokenApi(data: RefreshRequest): Promise<TokenResponse> {
  const config = getConfig();
  const response = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include', // Cookie を送受信
  });

  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.message || 'Token refresh failed');
  }

  return response.json();
}

export function useRefreshToken() {
  const setTokens = useAuthStore((state) => state.setTokens);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return useMutation({
    mutationFn: refreshTokenApi,
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
    },
    onError: () => {
      clearAuth();
    },
  });
}

/**
 * アプリ起動時に HttpOnly Cookie からセッションを復元し、ユーザー情報も取得する
 *
 * refreshToken は HttpOnly Cookie に保存されているため、JavaScript からはアクセス不可
 * credentials: 'include' を指定することで、Cookie が自動的に送信される
 */
export async function restoreAuthFromStorage(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const config = getConfig();

    // refreshToken Cookie を使用してアクセストークンを再取得
    // Cookie は credentials: 'include' により自動送信される
    // サーバー側で Cookie から refreshToken を読み取る
    const refreshResponse = await fetch(`${config.apiBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: '' }), // Cookie から自動送信されるため空でOK
      credentials: 'include',
    });

    if (!refreshResponse.ok) {
      // Cookie が無効または存在しない
      useAuthStore.getState().clearAuth();
      return false;
    }

    const tokenData: TokenResponse = await refreshResponse.json();
    useAuthStore.getState().setTokens(tokenData.accessToken, tokenData.refreshToken);

    // ユーザー情報を取得
    const meResponse = await fetch(`${config.apiBaseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
      },
      credentials: 'include',
    });

    if (meResponse.ok) {
      const userData: CurrentUserResponse = await meResponse.json();
      useAuthStore.getState().setUser({
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
      });
    }

    return true;
  } catch {
    useAuthStore.getState().clearAuth();
    return false;
  }
}
