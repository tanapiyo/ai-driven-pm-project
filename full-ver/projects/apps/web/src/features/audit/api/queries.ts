/**
 * @layer features
 * @segment audit
 * @what Audit Log React Query Queries
 */

import { useQuery } from '@tanstack/react-query';
import { getConfig } from '@/shared/config';
import { useAuthStore } from '@/features/auth';
import type { AuditLogListResponse, AuditLogFilters } from './types';

function getAuthHeaders(): Record<string, string> {
  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

async function getAuditLogsApi(filters: AuditLogFilters): Promise<AuditLogListResponse> {
  const config = getConfig();
  const params = new URLSearchParams();

  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.actorId) params.set('actorId', filters.actorId);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.action) params.set('action', filters.action);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  const queryString = params.toString();
  const url = `${config.apiBaseUrl}/admin/audit-logs${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || 'Failed to fetch audit logs');
  }

  return response.json();
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ['audit', 'logs', filters],
    queryFn: () => getAuditLogsApi(filters),
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
  });
}
