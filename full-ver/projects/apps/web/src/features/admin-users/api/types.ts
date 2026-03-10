/**
 * @layer features
 * @segment admin-users
 * @what Admin User API Types
 */

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'inactive';

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserListResponse {
  data: AdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUserFilters {
  page?: number;
  limit?: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export interface CreateAdminUserRequest {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

export interface UpdateAdminUserRequest {
  displayName?: string;
  role?: UserRole;
  status?: UserStatus;
}
