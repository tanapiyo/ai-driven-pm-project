/**
 * @layer shared
 * @segment lib
 * @what 認証関連のバリデーションスキーマ
 * @why フォームとAPIの入力バリデーションを統一
 */

import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string({ error: 'メールアドレスを入力してください' })
    .min(1, 'メールアドレスを入力してください')
    .email('有効なメールアドレスを入力してください'),
  password: z
    .string({ error: 'パスワードを入力してください' })
    .min(1, 'パスワードを入力してください'),
});

export const registerSchema = z
  .object({
    email: z
      .string({ error: 'メールアドレスを入力してください' })
      .min(1, 'メールアドレスを入力してください')
      .email('有効なメールアドレスを入力してください'),
    password: z
      .string({ error: 'パスワードを入力してください' })
      .min(8, 'パスワードは8文字以上で入力してください')
      .regex(/[A-Za-z]/, 'パスワードには英字を含めてください')
      .regex(/[0-9]/, 'パスワードには数字を含めてください'),
    confirmPassword: z
      .string({ error: 'パスワード確認を入力してください' })
      .min(1, 'パスワード確認を入力してください'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'パスワードが一致しません',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

// Type-safe schema exports for @hookform/resolvers compatibility
export const typedLoginSchema = loginSchema;
export const typedRegisterSchema = registerSchema;
