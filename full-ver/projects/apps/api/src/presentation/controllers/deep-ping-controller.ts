/**
 * @what Deep Ping コントローラー
 * @why HTTP リクエストを処理し、Deep Ping ユースケースを実行
 *
 * presentation層のルール:
 * - usecase層のみimport可能
 * - domain層、infrastructure層を直接importしない
 *
 * ADR-0013: Migrated from Hono Context to Express RequestHandler
 */

import type { Request, Response } from 'express';
import type { DeepPingUseCase } from '@/usecase/health/index.js';
import type { ControllerLogger } from './auth-controller.js';

/**
 * Deep Ping コントローラー
 */
export class DeepPingController {
  constructor(
    private readonly deepPingUseCase: DeepPingUseCase,
    private readonly logger: ControllerLogger
  ) {}

  /**
   * GET /ping/deep - Deep Ping を実行
   */
  async deepPing(_req: Request, res: Response): Promise<void> {
    try {
      const result = await this.deepPingUseCase.execute();
      res.status(200).json(result);
    } catch (error) {
      this.logger.errorWithException('Deep ping failed', error, {
        operation: 'deepPing',
      });
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }
}
