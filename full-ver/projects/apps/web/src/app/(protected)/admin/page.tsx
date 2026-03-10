/**
 * @layer app
 * @what Admin Dashboard ページ (Admin role)
 */

import Link from 'next/link';

const adminMenuItems = [
  {
    title: 'ユーザー管理',
    description: 'システムユーザーの作成・編集・無効化を行います',
    href: '/admin/users',
    icon: '👤',
  },
  {
    title: '監査ログ',
    description: 'システム内のすべての重要な操作履歴を確認できます',
    href: '/admin/audit-logs',
    icon: '📋',
  },
];

export default function AdminPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          管理者ダッシュボード
        </h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          システム管理とマスターデータの管理を行います
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {adminMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="relative rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-6 py-5 shadow-sm flex items-center space-x-4 hover:border-primary-400 dark:hover:border-primary-500 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
          >
            <div className="flex-shrink-0">
              <span className="text-3xl">{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <span className="absolute inset-0" aria-hidden="true" />
              <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {item.title}
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                {item.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
