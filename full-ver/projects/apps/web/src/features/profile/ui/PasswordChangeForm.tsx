/**
 * @layer features
 * @segment profile
 * @what Password change form UI
 */
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useUpdatePassword, PasswordChangeError } from '../api';
import { updatePasswordSchema, type UpdatePasswordFormData } from '@/shared/lib/validation';
import { Button, FormField } from '@/shared/ui';

interface PasswordChangeFormProps {
  onSuccess?: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function PasswordChangeForm({ onSuccess, onDirtyChange }: PasswordChangeFormProps = {}) {
  const router = useRouter();
  const updatePasswordMutation = useUpdatePassword();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted, isDirty },
    setError,
    reset,
    clearErrors,
  } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    mode: 'onSubmit',
  });

  // APIエラーをフィールドにマッピング
  useEffect(() => {
    if (updatePasswordMutation.error instanceof PasswordChangeError) {
      const errorCode = updatePasswordMutation.error.code;

      switch (errorCode) {
        case 'INCORRECT_PASSWORD':
          setError('currentPassword', {
            type: 'server',
            message: '現在のパスワードが正しくありません',
          });
          break;
        case 'WEAK_PASSWORD':
          setError('newPassword', {
            type: 'server',
            message: 'パスワードは8文字以上で、英字と数字を含めてください',
          });
          break;
        default:
          setError('currentPassword', {
            type: 'server',
            message: updatePasswordMutation.error.message,
          });
      }
    }
  }, [updatePasswordMutation.error, setError]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const onSubmit = (data: UpdatePasswordFormData) => {
    clearErrors();
    updatePasswordMutation.mutate(
      {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
      {
        onSuccess: () => {
          reset();
          onDirtyChange?.(false);
          onSuccess?.();
          router.push('/login?password_changed=true');
        },
      }
    );
  };

  // 送信後のみエラーを表示
  const showErrors = isSubmitted;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        label="現在のパスワード"
        type="password"
        placeholder="現在のパスワードを入力"
        autoComplete="current-password"
        error={showErrors ? errors.currentPassword : undefined}
        {...register('currentPassword')}
      />

      <FormField
        label="新しいパスワード"
        type="password"
        placeholder="8文字以上、英字と数字を含む"
        autoComplete="new-password"
        error={showErrors ? errors.newPassword : undefined}
        {...register('newPassword')}
      />

      <FormField
        label="新しいパスワード（確認）"
        type="password"
        placeholder="新しいパスワードを再入力"
        autoComplete="new-password"
        error={showErrors ? errors.confirmPassword : undefined}
        {...register('confirmPassword')}
      />

      <Button
        type="submit"
        disabled={updatePasswordMutation.isPending}
        className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {updatePasswordMutation.isPending ? '変更中...' : 'パスワードを変更'}
      </Button>

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        パスワードを変更すると、セキュリティのため再ログインが必要になります。
      </p>
    </form>
  );
}
