/**
 * @layer app
 * @what Health / Deep Ping ページ
 * @why フロントエンドからバックエンドへの API 疎通確認を行う
 *      Pattern A: Orval 生成クライアント（getHealth）で /health を呼び出す
 */

'use client';

import { useHealthCheck, HealthStatus } from '@/features/health';
import { Button } from '@/shared/ui';

export default function PingPage() {
  const { data, isLoading, error, check, reset } = useHealthCheck();

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-neutral-50 dark:bg-neutral-900">
      <h1 className="text-2xl font-bold mb-6 text-neutral-900 dark:text-neutral-100">
        Health Check
      </h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8 text-center max-w-md">
        Check the connectivity between the frontend and backend using the generated API client.
      </p>

      <div className="flex gap-4 mb-8">
        <Button onClick={check} disabled={isLoading}>
          {isLoading ? 'Checking...' : 'Check Health'}
        </Button>
        {data && (
          <Button variant="secondary" onClick={reset}>
            Reset
          </Button>
        )}
      </div>

      {/* エラー表示も primary 系で表現（赤系使用禁止） */}
      {error && (
        <div
          role="alert"
          className="bg-primary-50 border border-primary-200 text-primary-700 dark:bg-primary-900/20 dark:border-primary-700 dark:text-primary-300 px-4 py-3 rounded mb-4 max-w-md"
        >
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {data && <HealthStatus data={data} />}
    </main>
  );
}
