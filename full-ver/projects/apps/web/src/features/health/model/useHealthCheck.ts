/**
 * @layer features
 * @segment health/model
 * @what /health エンドポイントへの疎通確認フック
 * @why Pattern A: Orval 生成クライアント経由で API を呼び出す
 */

'use client';

import { useState, useCallback } from 'react';
import { fetchHealth } from '../api';
import type { HealthResponse } from '../api';

export interface UseHealthCheckState {
  data: HealthResponse | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseHealthCheckReturn extends UseHealthCheckState {
  check: () => Promise<void>;
  reset: () => void;
}

/**
 * /health エンドポイントを呼び出すカスタムフック（Pattern A）
 */
export function useHealthCheck(): UseHealthCheckReturn {
  const [state, setState] = useState<UseHealthCheckState>({
    data: null,
    isLoading: false,
    error: null,
  });

  const check = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await fetchHealth();
      setState({ data, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check health';
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    check,
    reset,
  };
}
