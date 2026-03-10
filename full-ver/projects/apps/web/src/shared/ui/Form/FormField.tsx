/**
 * @layer shared
 * @segment ui
 * @what Reusable form field component
 * @why フォームの入力フィールドとエラー表示を統一
 */

import type { InputHTMLAttributes, ReactNode } from 'react';
import type { FieldError } from 'react-hook-form';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: FieldError;
  children?: ReactNode;
  helperText?: string;
  isValid?: boolean;
  requiredIndicator?: boolean;
  /** data-testid for E2E testing */
  'data-testid'?: string;
}

export function FormField({
  label,
  error,
  helperText,
  isValid = false,
  requiredIndicator,
  id,
  children,
  className = '',
  'data-testid': testId,
  ...props
}: FormFieldProps) {
  const inputId = id ?? props.name;
  const isRequired = requiredIndicator ?? Boolean(props.required);
  const showValidState = isValid && !error;
  const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined;

  return (
    <div className="space-y-1">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        {label}
        {isRequired && (
          <span className="ml-1 text-error-500 dark:text-error-400" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative">
        {children ?? (
          <input
            id={inputId}
            data-testid={testId}
            className={`w-full px-3 py-2 bg-white border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-500 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder-neutral-400 dark:focus:ring-primary-700 dark:focus:border-primary-400 ${
              error
                ? 'border-error-500 dark:border-error-400'
                : showValidState
                  ? 'border-success-500 dark:border-success-400 pr-10'
                  : 'border-neutral-300 dark:border-neutral-600'
            } ${className}`}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={describedBy}
            {...props}
          />
        )}
        {showValidState && !children && (
          <span
            className="absolute inset-y-0 right-3 flex items-center text-success-600 dark:text-success-400 pointer-events-none"
            aria-hidden="true"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.704 5.29a1 1 0 0 1 .006 1.414l-8.004 8.073a1 1 0 0 1-1.42 0L3.29 10.747a1 1 0 1 1 1.42-1.408l3.286 3.316 7.294-7.359a1 1 0 0 1 1.414-.006Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        )}
      </div>
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-sm text-error-600 dark:text-error-400"
          role="alert"
        >
          {error.message}
        </p>
      )}
      {!error && helperText && (
        <p id={`${inputId}-helper`} className="text-xs text-neutral-500 dark:text-neutral-400">
          {helperText}
        </p>
      )}
    </div>
  );
}
