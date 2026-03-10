/**
 * @layer features
 * @segment health/api
 * @what Health API クエリ
 * @why Pattern A: Orval 生成クライアント経由で /health を呼び出す
 */

import { getHealth } from '@monorepo/api-contract';
import type { HealthResponse } from '@monorepo/api-contract';

/**
 * /health エンドポイントを呼び出す（Pattern A: 生成クライアント）
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await getHealth();
  return response.data;
}
