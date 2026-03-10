/**
 * @what Deep Ping ユースケース
 * @why サーバーおよび依存サービスの疎通確認を実行
 *
 * usecase層のルール:
 * - domain層のみimport可能
 * - infrastructure層を直接importしない（インターフェース経由）
 */

/**
 * ヘルスチェック項目の結果
 */
export interface HealthCheck {
  name: string;
  status: 'ok' | 'error';
  latencyMs: number;
  message?: string;
}

/**
 * Deep Ping の出力
 */
export interface DeepPingOutput {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  totalLatencyMs: number;
  checks: HealthCheck[];
}

/**
 * データベース接続チェッカーのインターフェース
 */
export interface DatabaseHealthChecker {
  check(): Promise<{ ok: boolean; message: string }>;
}

/**
 * Deep Ping ユースケース
 */
export class DeepPingUseCase {
  constructor(private readonly databaseChecker: DatabaseHealthChecker | null) {}

  async execute(): Promise<DeepPingOutput> {
    const checks: HealthCheck[] = [];
    const startTime = Date.now();

    // Server check (always ok if we reach here)
    const serverStart = Date.now();
    checks.push({
      name: 'server',
      status: 'ok',
      latencyMs: Date.now() - serverStart,
      message: 'Server is running',
    });

    // Database check
    if (this.databaseChecker) {
      const dbStart = Date.now();
      try {
        const result = await this.databaseChecker.check();
        checks.push({
          name: 'database',
          status: result.ok ? 'ok' : 'error',
          latencyMs: Date.now() - dbStart,
          message: result.message,
        });
      } catch (error) {
        checks.push({
          name: 'database',
          status: 'error',
          latencyMs: Date.now() - dbStart,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const totalLatencyMs = Date.now() - startTime;

    // Determine overall status
    const errorCount = checks.filter((c) => c.status === 'error').length;
    let status: 'ok' | 'degraded' | 'error';
    if (errorCount === 0) {
      status = 'ok';
    } else if (errorCount < checks.length) {
      status = 'degraded';
    } else {
      status = 'error';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      totalLatencyMs,
      checks,
    };
  }
}
