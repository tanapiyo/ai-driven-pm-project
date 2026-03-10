/**
 * @layer features
 * @segment settings
 * @what Account info card displaying user ID, role, email, and password change
 */

'use client';

import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useCurrentUser } from '@/features/auth';
import { RoleBadge } from './RoleBadge';
import { PasswordChangeDialog } from './PasswordChangeDialog';
import { Button } from '@/shared/ui';
import { dictionary } from '@/shared/lib';

const account = dictionary.settings.account;
const commonActions = dictionary.common.actions;

export function AccountInfoCard() {
  const { data: user, isLoading, error } = useCurrentUser();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {account.title}
          </h3>
        </div>
        <div className="p-6">
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-neutral-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {account.title}
          </h3>
        </div>
        <div className="p-6">
          <p className="text-red-600 dark:text-red-400">{account.fetchError}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow">
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {account.title}
        </h3>
      </div>
      <dl className="divide-y divide-neutral-200 dark:divide-neutral-700">
        <div className="px-6 py-4">
          <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {account.fields.userId}
          </dt>
          <dd className="flex items-center gap-2">
            <span
              className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 rounded-md font-mono"
              aria-readonly="true"
            >
              {user.id}
            </span>
            <Lock
              className="h-4 w-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0"
              aria-hidden="true"
            />
          </dd>
        </div>
        <div className="px-6 py-4">
          <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {account.fields.role}
          </dt>
          <dd>
            <RoleBadge role={user.role} />
          </dd>
        </div>
        <div className="px-6 py-4">
          <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {account.fields.email}
          </dt>
          <dd className="flex items-center gap-2">
            <span
              className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 rounded-md"
              aria-readonly="true"
            >
              {user.email}
            </span>
            <Lock
              className="h-4 w-4 text-neutral-400 dark:text-neutral-500 flex-shrink-0"
              aria-hidden="true"
            />
          </dd>
        </div>
        <div className="px-6 py-4">
          <dt className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">
            {account.fields.password}
          </dt>
          <dd className="flex items-center gap-2">
            <span
              className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 rounded-md"
              aria-readonly="true"
            >
              ••••••••
            </span>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPasswordDialogOpen(true)}
              className="flex-shrink-0"
            >
              {commonActions.change}
            </Button>
          </dd>
        </div>
      </dl>
      <PasswordChangeDialog
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
      />
    </div>
  );
}
