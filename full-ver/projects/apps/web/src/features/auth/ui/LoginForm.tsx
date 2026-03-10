/**
 * @layer features
 * @segment auth
 * @what ログインフォーム UI
 */
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useAuth } from '../model/useAuth';
import { loginSchema, type LoginFormData } from '@/shared/lib/validation';
import { Button, FormField } from '@/shared/ui';
import { dictionary } from '@/shared/lib';

const login = dictionary.auth.login;

export function LoginForm() {
  const router = useRouter();
  const { isAuthenticated, login: authLogin, isLoading, error } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields, dirtyFields },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    delayError: 350,
  });

  const onSubmit = (data: LoginFormData) => {
    authLogin(data.email, data.password);
  };

  const values = watch();
  const isEmailValid =
    (values.email ?? '').trim().length > 0 &&
    !errors.email &&
    Boolean(touchedFields.email || dirtyFields.email);
  const isPasswordValid =
    (values.password ?? '').trim().length > 0 &&
    !errors.password &&
    Boolean(touchedFields.password || dirtyFields.password);

  // ログイン成功時に自動的にダッシュボードへリダイレクト
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="w-full max-w-md p-6 bg-white dark:bg-neutral-800 rounded-lg shadow-md space-y-4"
      data-testid="login-form"
    >
      <h2 className="text-2xl font-semibold text-center text-neutral-800 dark:text-neutral-200">
        {login.title}
      </h2>

      {error && (
        <div
          className="p-3 text-sm text-error-600 dark:text-error-400 bg-error-50 dark:bg-error-900/50 rounded-md"
          role="alert"
        >
          {error}
        </div>
      )}

      <FormField
        label={login.email.label}
        type="email"
        placeholder={login.email.placeholder}
        autoComplete="email"
        error={errors.email}
        isValid={isEmailValid}
        helperText={login.email.helperText}
        required
        data-testid="login-email-input"
        {...register('email')}
      />

      <FormField
        label={login.password.label}
        type="password"
        placeholder={login.password.placeholder}
        autoComplete="current-password"
        error={errors.password}
        isValid={isPasswordValid}
        helperText={login.password.helperText}
        required
        data-testid="login-password-input"
        {...register('password')}
      />

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="login-submit"
      >
        {isLoading ? login.submitting : login.title}
      </Button>

      <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3 text-center">
          {login.quickLogin.heading}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => authLogin('user@example.com', 'Password123')}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {login.quickLogin.userButton}
          </button>
          <button
            type="button"
            onClick={() => authLogin('admin@example.com', 'Password123')}
            disabled={isLoading}
            className="px-4 py-2 text-sm bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {login.quickLogin.adminButton}
          </button>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 text-center">
          {login.quickLogin.demoNote}
        </p>
      </div>
    </form>
  );
}
