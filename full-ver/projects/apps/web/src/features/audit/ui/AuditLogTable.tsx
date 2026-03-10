/**
 * @layer features
 * @segment audit
 * @what Audit Log Table Component
 */

'use client';

import { Inbox } from 'lucide-react';
import type { AuditLog } from '../api/types';

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getActionBadgeColor(action: string): string {
  switch (action) {
    case 'create':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    case 'update':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    case 'delete':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
    case 'authorization_denied':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    default:
      return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200';
  }
}

function getEntityTypeBadgeColor(entityType: string): string {
  switch (entityType) {
    case 'User':
      return 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300';
    default:
      return 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200';
  }
}

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-neutral-200" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
        <Inbox className="w-8 h-8 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
        <p>監査ログがありません</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
        <thead className="bg-neutral-50 dark:bg-neutral-900">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              日時
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              操作者
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              対象
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              アクション
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              エンティティID
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-700">
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                {formatTimestamp(log.timestamp)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {log.actorName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityTypeBadgeColor(log.entityType)}`}
                >
                  {log.entityType}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(log.action)}`}
                >
                  {log.action}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400 font-mono">
                {log.entityId.substring(0, 8)}...
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
