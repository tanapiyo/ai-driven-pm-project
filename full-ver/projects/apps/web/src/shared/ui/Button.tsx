/**
 * @layer shared
 * @segment ui
 * @what Generic button component
 */
import React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  children: ReactNode;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  const baseStyles =
    'px-4 py-2 rounded-full font-medium transition-colors duration-300 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-neutral-900 disabled:bg-primary-200 disabled:text-white dark:disabled:bg-primary-800 dark:disabled:text-neutral-400';
  const variantStyles = {
    /* プライマリーボタン: 背景 primary-500, 文字 white, hover primary-600 */
    primary:
      'bg-primary-500 text-white hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500',
    /* セカンダリーボタン: 背景 white, 枠線 primary-500, 文字 primary-600, hover 背景 primary-50 */
    secondary:
      'bg-white border border-primary-500 text-primary-600 hover:bg-primary-50 dark:bg-neutral-800 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-neutral-700',
    /* 危険操作ボタン: 背景 primary-700, 文字 white, hover primary-800 (赤系使用禁止) */
    danger:
      'bg-primary-700 text-white hover:bg-primary-800 dark:bg-primary-800 dark:hover:bg-primary-700',
  };

  return (
    <button className={`${baseStyles} ${variantStyles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
