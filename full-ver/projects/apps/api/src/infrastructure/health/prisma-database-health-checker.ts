/**
 * @what Prisma を使用したデータベースヘルスチェッカー
 * @why データベース接続の疎通確認を行う
 */

import type { PrismaClient } from '@/infrastructure/database/index.js';
import type { DatabaseHealthChecker } from '@/usecase/health/index.js';
import type { Logger } from '@/infrastructure/logger/index.js';

/**
 * Prisma を使用したデータベースヘルスチェッカー
 */
export class PrismaDatabaseHealthChecker implements DatabaseHealthChecker {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger?: Logger
  ) {}

  async check(): Promise<{ ok: boolean; message: string }> {
    try {
      // 簡単なクエリを実行して接続確認
      await this.prisma.$queryRaw`SELECT 1`;
      return { ok: true, message: 'Database connection successful' };
    } catch (error) {
      this.logger?.errorWithException('Database health check failed', error, {
        operation: 'check',
      });
      const message = error instanceof Error ? error.message : 'Database connection failed';
      return { ok: false, message };
    }
  }
}
