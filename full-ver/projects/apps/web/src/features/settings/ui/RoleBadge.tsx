/**
 * @layer features
 * @segment settings
 * @what Role badge component with Japanese labels
 */

'use client';

import React from 'react';
import type { UserRole } from '@/features/auth';

interface RoleBadgeProps {
  role: UserRole;
}

const ROLE_CONFIG: Record<UserRole, { label: string; bgColor: string; textColor: string }> = {
  admin: {
    label: '管理者',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-800 dark:text-red-300',
  },
  user: {
    label: 'ユーザー',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-800 dark:text-blue-300',
  },
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] ?? {
    label: role,
    bgColor: 'bg-neutral-100 dark:bg-neutral-800',
    textColor: 'text-neutral-800 dark:text-neutral-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      {config.label}
    </span>
  );
}
