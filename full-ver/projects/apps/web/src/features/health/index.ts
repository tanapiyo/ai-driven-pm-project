/**
 * @layer features
 * @segment health
 * @what Health feature 公開 API
 */

// Pattern A: 生成クライアント経由の health check
export {
  useHealthCheck,
  type UseHealthCheckReturn,
  type UseHealthCheckState,
} from './model/useHealthCheck';
export { HealthStatus } from './ui/HealthStatus';
export type { HealthResponse } from './api';
