/**
 * @layer features
 * @segment auth
 * @what 認証状態の Zustand ストア
 * @why クライアントサイドの認証状態を管理
 */

import { create } from 'zustand';

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  /** ストアがlocalStorageから復元されたかどうか */
  isHydrated: boolean;
  /** localStorageにrefreshTokenが存在する（リフレッシュ中の可能性がある） */
  hasPotentialSession: boolean;
}

interface AuthActions {
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: UserProfile) => void;
  clearAuth: () => void;
  getAccessToken: () => string | null;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,
  isHydrated: false,
  hasPotentialSession: false,

  setTokens: (accessToken, refreshToken) => {
    // accessToken: メモリのみ（Zustand state に保持）- localStorage に保存しない（XSS脆弱性対策）
    // refreshToken: HttpOnly Cookie はサーバーが Set-Cookie ヘッダーで設定する
    // クライアントからは document.cookie で HttpOnly を設定できないため、ここでは何もしない
    set({
      accessToken, // メモリのみ
      refreshToken, // 一時的にメモリに保持（UI表示用）
      isAuthenticated: true,
      hasPotentialSession: true,
    });
  },

  setUser: (user) => {
    set({ user });
  },

  clearAuth: () => {
    // refreshToken Cookie の削除はサーバーが Set-Cookie ヘッダーで行う
    // クライアントからは HttpOnly Cookie を操作できない
    set({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      hasPotentialSession: false,
    });
  },

  getAccessToken: () => get().accessToken,
}));

/**
 * ストアを同期的に初期化する
 * アプリ起動時に一度だけ呼び出す
 *
 * refreshToken は HttpOnly Cookie に保存されており、JavaScript からはアクセス不可
 * Cookie の存在は API 呼び出し時に credentials: 'include' で自動送信され、
 * サーバーが検証する
 *
 * hasPotentialSession を true に設定することで、保護ページで
 * セッション復元を試みる（/auth/refresh API を呼び出す）
 */
export function initializeAuthStore(): void {
  if (typeof window === 'undefined') {
    useAuthStore.setState({ isHydrated: true });
    return;
  }

  // HttpOnly Cookie は JavaScript からアクセス不可
  // セッション復元は /auth/refresh API で検証するため、
  // hasPotentialSession を true に設定してセッション復元を試みる
  useAuthStore.setState({
    refreshToken: null,
    isHydrated: true,
    hasPotentialSession: true, // セッション復元を試みる
  });
}
