/**
 * @layer features
 * @segment admin-users
 * @what Admin User React Query Queries
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/http';
import { useAuthStore } from '@/features/auth';
import type { AdminUserListResponse, AdminUserFilters, AdminUser } from './types';

export const adminUsersQueryKeys = {
  all: ['admin', 'users'] as const,
  list: (filters: AdminUserFilters) => [...adminUsersQueryKeys.all, 'list', filters] as const,
  detail: (id: string) => [...adminUsersQueryKeys.all, 'detail', id] as const,
};

async function getAdminUsersApi(filters: AdminUserFilters): Promise<AdminUserListResponse> {
  const params = new URLSearchParams();

  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.role) params.set('role', filters.role);
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);

  const queryString = params.toString();
  const path = `/admin/users${queryString ? `?${queryString}` : ''}`;

  return apiClient<AdminUserListResponse>(path);
}

async function getAdminUserApi(id: string): Promise<AdminUser> {
  return apiClient<AdminUser>(`/admin/users/${id}`);
}

export function useAdminUsers(filters: AdminUserFilters = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: adminUsersQueryKeys.list(filters),
    queryFn: () => getAdminUsersApi(filters),
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
  });
}

export function useAdminUser(id: string) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: adminUsersQueryKeys.detail(id),
    queryFn: () => getAdminUserApi(id),
    enabled: isAuthenticated && !!id,
    staleTime: 30 * 1000,
  });
}
