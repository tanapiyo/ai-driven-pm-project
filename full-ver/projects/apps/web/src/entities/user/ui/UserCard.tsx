/**
 * @layer entities
 * @segment user
 * @what ユーザーカード UI
 */
import type { User } from '../model/types';

interface UserCardProps {
  user: User;
}

export function UserCard({ user }: UserCardProps) {
  return (
    <div className="space-y-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white p-4 shadow-sm dark:bg-neutral-800">
      <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
        {user.name}
      </h3>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{user.email}</p>
    </div>
  );
}
