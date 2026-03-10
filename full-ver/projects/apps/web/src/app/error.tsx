'use client';

/**
 * @layer app
 * @what Next.js App Router error boundary
 * @why クライアントサイドエラーをキャッチしてユーザーフレンドリーなUIを表示
 */

import { useEffect } from 'react';
import { Button } from '@/shared/ui';
import { getConfig } from '@/shared/config';
import { dictionary } from '@/shared/lib';

const errorDict = dictionary.error.unexpected;
const commonActions = dictionary.common.actions;

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const config = getConfig();

  useEffect(() => {
    // TODO(#617): エラーログサービスに送信
    if (config.isDevelopment) {
      console.error('Application error:', error);
    }
  }, [error, config.isDevelopment]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md p-6 bg-white dark:bg-neutral-800 rounded-lg shadow-md text-center">
        <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
          {errorDict.title}
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">{errorDict.description}</p>
        {config.isDevelopment && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-neutral-500 dark:text-neutral-400">
              {errorDict.detailSummary}
            </summary>
            <pre className="mt-2 p-3 bg-neutral-100 dark:bg-neutral-800 rounded text-xs overflow-auto text-neutral-800 dark:text-neutral-200">
              {error.message}
              {error.digest && `\nDigest: ${error.digest}`}
            </pre>
          </details>
        )}
        <Button onClick={reset} variant="primary">
          {commonActions.retry}
        </Button>
      </div>
    </main>
  );
}
