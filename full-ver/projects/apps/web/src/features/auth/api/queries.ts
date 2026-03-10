/**
 * @layer features
 * @segment auth
 * @what 認証関連の React Query Queries
 * @why 現在のユーザー情報取得などの API 呼び出しを管理
 */

import { useQuery } from '@tanstack/react-query';
import { getConfig } from '@/shared/config';
import { useAuthStore, type UserRole } from '../model/store';

interface CurrentUserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

async function getCurrentUserApi(): Promise<CurrentUserResponse> {
  const config = getConfig();
  const accessToken = useAuthStore.getState().accessToken;

  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${config.apiBaseUrl}/auth/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }

  return response.json();
}

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setUser = useAuthStore((state) => state.setUser);

  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const user = await getCurrentUserApi();
      setUser({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      });
      return user;
    },
    enabled: isAuthenticated,
  });
}
