/**
 * @layer features
 * @segment dashboard
 * @what ダッシュボードホーム
 */

'use client';

import * as React from 'react';
import { useAuthStore } from '@/features/auth';
import { t, dictionary } from '@/shared/lib';

const db = dictionary.dashboard;

export function DashboardHome() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-8 text-3xl font-bold text-neutral-900 dark:text-neutral-100">{db.title}</h1>

      <div className="rounded-lg bg-white p-6 shadow dark:bg-neutral-800">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          {t('dashboard.welcome', { vars: { name: user.name || user.email } })}
        </h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          {t('dashboard.loggedInAs', { vars: { role: getRoleLabel(user.role) } })}
        </p>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">{db.selectFeature}</p>
      </div>
    </div>
  );
}

function getRoleLabel(role: string): string {
  if (role in db.roles) {
    return db.roles[role as keyof typeof db.roles];
  }
  return role;
}
