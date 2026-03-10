/**
 * @layer shared
 * @segment ui
 * @what Reusable error fallback component
 * @why コンポーネント単位でのエラー表示に使用
 */

import { getConfig } from '@/shared/config';
import { Button } from './Button';

interface ErrorFallbackProps {
  error?: Error;
  message?: string;
  onRetry?: () => void;
}

export function ErrorFallback({
  error,
  message = 'エラーが発生しました',
  onRetry,
}: ErrorFallbackProps) {
  const config = getConfig();

  /* エラー表示も primary 系で表現（赤系使用禁止） */
  return (
    <div className="p-6 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 rounded-lg text-center">
      <p className="text-primary-700 dark:text-primary-300 font-medium mb-2">{message}</p>
      {error && config.isDevelopment && (
        <p className="text-sm text-primary-700 dark:text-primary-400 mb-4">{error.message}</p>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="danger">
          再試行
        </Button>
      )}
    </div>
  );
}
