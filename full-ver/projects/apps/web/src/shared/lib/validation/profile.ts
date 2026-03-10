/**
 * @layer shared
 * @segment lib
 * @what プロフィール関連のバリデーションスキーマ
 * @why フォームとAPIの入力バリデーションを統一
 */

import { z } from 'zod';

export const updateNameSchema = z.object({
  name: z
    .string({ error: '名前を入力してください' })
    .min(1, '名前を入力してください')
    .max(100, '名前は100文字以内で入力してください'),
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: '現在のパスワードを入力してください' })
      .min(1, '現在のパスワードを入力してください'),
    newPassword: z
      .string({ error: '新しいパスワードを入力してください' })
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(/[A-Za-z]/, 'パスワードには英字を含めてください')
      .regex(/[0-9]/, 'パスワードには数字を含めてください'),
    confirmPassword: z
      .string({ error: 'パスワード確認を入力してください' })
      .min(1, 'パスワード確認を入力してください'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

export type UpdateNameFormData = z.infer<typeof updateNameSchema>;
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;

// Type-safe schema exports for @hookform/resolvers compatibility
export const typedUpdateNameSchema = updateNameSchema;
export const typedUpdatePasswordSchema = updatePasswordSchema;
