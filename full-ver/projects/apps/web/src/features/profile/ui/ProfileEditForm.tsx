/**
 * @layer features
 * @segment profile
 * @what Profile edit form UI (name change + password change combined)
 */
'use client';

import { NameChangeForm } from './NameChangeForm';
import { PasswordChangeForm } from './PasswordChangeForm';

interface ProfileEditFormProps {
  currentName?: string;
}

export function ProfileEditForm({ currentName }: ProfileEditFormProps) {
  return (
    <div className="w-full max-w-md p-6 bg-white dark:bg-neutral-800 rounded-lg shadow-md space-y-8">
      <h2 className="text-2xl font-semibold text-center text-neutral-800 dark:text-neutral-200">
        プロフィール編集
      </h2>

      <div className="border-b border-neutral-200 dark:border-neutral-700 pb-6">
        <NameChangeForm currentName={currentName} />
      </div>

      <PasswordChangeForm />
    </div>
  );
}
