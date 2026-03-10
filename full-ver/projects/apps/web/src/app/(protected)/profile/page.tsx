'use client';

/**
 * @layer app
 * @what プロフィール編集ページ
 */

import { useCurrentUser } from '@/features/auth';
import { ProfileEditForm } from '@/features/profile';

export default function ProfilePage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-neutral-900 dark:text-neutral-100">
        プロフィール編集
      </h1>

      <ProfileEditForm currentName={user?.name} />
    </div>
  );
}
