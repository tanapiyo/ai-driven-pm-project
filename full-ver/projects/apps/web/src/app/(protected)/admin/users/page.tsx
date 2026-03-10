/**
 * @layer app
 * @what Admin Users Page (Admin role)
 */

'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  useAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
  useDeactivateAdminUser,
  AdminUserTable,
  AdminUserFilter,
  AdminUserModal,
  type AdminUserFilters,
  type AdminUser,
  type CreateAdminUserRequest,
  type UpdateAdminUserRequest,
} from '@/features/admin-users';
import { Pagination, PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE, type PageSizeOption } from '@/shared/ui';
import { NormalizedApiError } from '@/shared/api/http';

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<AdminUserFilters>(() => {
    const pageRaw = Number(searchParams.get('page'));
    const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? Math.min(pageRaw, 10_000) : 1;
    const limitRaw = Number(searchParams.get('limit'));
    const limit = (PAGE_SIZE_OPTIONS as readonly number[]).includes(limitRaw)
      ? (limitRaw as PageSizeOption)
      : DEFAULT_PAGE_SIZE;
    return { page, limit };
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | undefined>();
  const [formError, setFormError] = useState<string | undefined>();

  const { data, isLoading, error } = useAdminUsers(filters);
  const createMutation = useCreateAdminUser();
  const updateMutation = useUpdateAdminUser();
  const deactivateMutation = useDeactivateAdminUser();

  const handleFilterChange = useCallback(
    (newFilters: AdminUserFilters) => {
      setFilters(newFilters);
      const params = new URLSearchParams(searchParams.toString());
      if ((newFilters.page ?? 1) > 1) {
        params.set('page', String(newFilters.page));
      } else {
        params.delete('page');
      }
      if (newFilters.limit !== DEFAULT_PAGE_SIZE) {
        params.set('limit', String(newFilters.limit));
      } else {
        params.delete('limit');
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, pathname, router]
  );

  const handlePageChange = useCallback(
    (page: number) => {
      setFilters((prev) => ({ ...prev, page }));
      const params = new URLSearchParams(searchParams.toString());
      if (page > 1) {
        params.set('page', String(page));
      } else {
        params.delete('page');
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, pathname, router]
  );

  const handleLimitChange = useCallback(
    (limit: PageSizeOption) => {
      setFilters((prev) => ({ ...prev, limit, page: 1 }));
      const params = new URLSearchParams(searchParams.toString());
      if (limit !== DEFAULT_PAGE_SIZE) {
        params.set('limit', String(limit));
      } else {
        params.delete('limit');
      }
      params.delete('page');
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, pathname, router]
  );

  const handleOpenCreateModal = useCallback(() => {
    setEditingUser(undefined);
    setFormError(undefined);
    setIsModalOpen(true);
  }, []);

  const handleOpenEditModal = useCallback((user: AdminUser) => {
    setEditingUser(user);
    setFormError(undefined);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingUser(undefined);
    setFormError(undefined);
  }, []);

  const handleSubmit = useCallback(
    async (formData: CreateAdminUserRequest | UpdateAdminUserRequest) => {
      setFormError(undefined);
      try {
        if (editingUser) {
          await updateMutation.mutateAsync({
            id: editingUser.id,
            data: formData as UpdateAdminUserRequest,
          });
        } else {
          await createMutation.mutateAsync(formData as CreateAdminUserRequest);
        }
        handleCloseModal();
      } catch (err) {
        if (err instanceof NormalizedApiError) {
          if (err.code === 'EMAIL_EXISTS') {
            setFormError('このメールアドレスは既に使用されています');
          } else if (err.code === 'VALIDATION_ERROR') {
            setFormError(err.message);
          } else {
            setFormError('エラーが発生しました');
          }
        } else {
          setFormError('エラーが発生しました');
        }
      }
    },
    [editingUser, createMutation, updateMutation, handleCloseModal]
  );

  const handleDeactivate = useCallback(
    async (user: AdminUser) => {
      try {
        await deactivateMutation.mutateAsync(user.id);
      } catch (_err) {
        alert('無効化に失敗しました');
      }
    },
    [deactivateMutation]
  );

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">エラー</h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              {error instanceof Error ? error.message : 'ユーザー一覧の取得に失敗しました'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            ユーザー管理
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            システムユーザーの管理を行います
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center rounded-md bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 dark:hover:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
        >
          新規ユーザー作成
        </button>
      </div>

      <AdminUserFilter filters={filters} onFilterChange={handleFilterChange} />

      <div className="bg-white dark:bg-neutral-800 shadow rounded-lg">
        <AdminUserTable
          users={data?.data ?? []}
          isLoading={isLoading}
          onEdit={handleOpenEditModal}
          onDeactivate={handleDeactivate}
        />

        {data?.pagination && (
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
          />
        )}
      </div>

      <AdminUserModal
        isOpen={isModalOpen}
        user={editingUser}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        error={formError}
      />
    </div>
  );
}
