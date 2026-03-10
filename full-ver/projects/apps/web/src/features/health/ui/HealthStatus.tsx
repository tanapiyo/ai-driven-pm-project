/**
 * @layer features
 * @segment health/ui
 * @what /health API の結果表示コンポーネント
 * @why Pattern A: Orval 生成クライアントで取得した health 結果を表示する
 */

'use client';

import * as React from 'react';
import type { HealthResponse } from '../api';

interface HealthStatusProps {
  data: HealthResponse;
}

export function HealthStatus({ data }: HealthStatusProps) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow dark:shadow-neutral-900/50 p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Health Status
        </h2>
        {/* 状態表示は primary 系で行う（緑/赤使用禁止） */}
        <span className="px-2 py-1 rounded text-sm font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
          {data.status}
        </span>
      </div>

      <div className="text-sm text-neutral-500 dark:text-neutral-400">
        <p>
          <span className="font-medium text-neutral-700 dark:text-neutral-300">Timestamp: </span>
          {new Date(data.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
}
