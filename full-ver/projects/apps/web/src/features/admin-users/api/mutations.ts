/**
 * @layer features
 * @segment admin-users
 * @what Admin User React Query Mutations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/http';
import { adminUsersQueryKeys } from './queries';
import type { AdminUser, CreateAdminUserRequest, UpdateAdminUserRequest } from './types';

async function createAdminUserApi(data: CreateAdminUserRequest): Promise<AdminUser> {
  return apiClient<AdminUser>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function updateAdminUserApi(id: string, data: UpdateAdminUserRequest): Promise<AdminUser> {
  return apiClient<AdminUser>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

async function deactivateAdminUserApi(id: string): Promise<AdminUser> {
  return apiClient<AdminUser>(`/admin/users/${id}`, {
    method: 'DELETE',
  });
}

export function useCreateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdminUserApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.all });
    },
  });
}

export function useUpdateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminUserRequest }) =>
      updateAdminUserApi(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.detail(id) });
    },
  });
}

export function useDeactivateAdminUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateAdminUserApi,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: adminUsersQueryKeys.detail(id) });
    },
  });
}
