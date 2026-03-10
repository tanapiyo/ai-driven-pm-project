/**
 * @layer features
 * @segment profile
 * @what Name change form UI
 */
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUpdateName } from '../api';
import { updateNameSchema, type UpdateNameFormData } from '@/shared/lib/validation';
import { Button, FormField } from '@/shared/ui';

interface NameChangeFormProps {
  currentName?: string;
  onSuccess?: () => void;
}

export function NameChangeForm({ currentName = '', onSuccess }: NameChangeFormProps) {
  const updateNameMutation = useUpdateName();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateNameFormData>({
    resolver: zodResolver(updateNameSchema),
    defaultValues: {
      name: currentName,
    },
  });

  const onSubmit = (data: UpdateNameFormData) => {
    updateNameMutation.mutate(
      { name: data.name },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">名前の変更</h3>

      {updateNameMutation.error && (
        <div
          className="p-3 text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/20 rounded-md"
          role="alert"
        >
          {updateNameMutation.error.message}
        </div>
      )}

      {updateNameMutation.isSuccess && (
        <div
          className="p-3 text-sm text-success-600 dark:text-success-400 bg-success-50 dark:bg-success-900/20 rounded-md"
          role="status"
        >
          名前を変更しました
        </div>
      )}

      <FormField
        label="名前"
        type="text"
        placeholder="表示名を入力"
        autoComplete="name"
        error={errors.name}
        {...register('name')}
      />

      <Button
        type="submit"
        disabled={updateNameMutation.isPending}
        className="disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {updateNameMutation.isPending ? '変更中...' : '名前を変更'}
      </Button>
    </form>
  );
}
