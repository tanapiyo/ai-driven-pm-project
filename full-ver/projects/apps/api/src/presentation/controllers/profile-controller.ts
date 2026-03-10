/**
 * @what プロフィールHTTPコントローラー
 * @why プロフィール編集関連のエンドポイントを処理
 *
 * presentation層のルール:
 * - usecase層のみimport可能
 * - domain層、infrastructure層を直接importしない
 *
 * ADR-0013: Migrated from Hono Context to Express RequestHandler
 */

import type { Request, Response } from 'express';
import type { ChangeNameUseCase, ChangePasswordUseCase } from '@/usecase/index.js';
import type { ControllerLogger } from './auth-controller.js';

export class ProfileController {
  constructor(
    private readonly changeNameUseCase: ChangeNameUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly logger: ControllerLogger
  ) {}

  /**
   * PATCH /users/me/name
   */
  async updateName(req: Request, res: Response, userId: string): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();

    try {
      const body = req.body as { name: string };
      const { name } = body;

      const result = await this.changeNameUseCase.execute({
        userId,
        name,
        causationId: requestId,
        correlationId: requestId,
      });

      if (result.isFailure()) {
        switch (result.error) {
          case 'user_not_found':
            res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
            return;
          case 'invalid_name':
            res
              .status(400)
              .json({ code: 'INVALID_NAME', message: 'Name must be 1-100 characters' });
            return;
          case 'same_name':
            res
              .status(400)
              .json({ code: 'SAME_NAME', message: 'Name is the same as current name' });
            return;
          default:
            res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
            return;
        }
      }

      res.status(200).json({
        id: result.value.id,
        name: result.value.name,
        updatedAt: result.value.updatedAt.toISOString(),
      });
    } catch (error) {
      this.logger.errorWithException('Failed to update name', error, {
        requestId,
        userId,
        operation: 'updateName',
      });
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }

  /**
   * PATCH /users/me/password
   */
  async updatePassword(req: Request, res: Response, userId: string): Promise<void> {
    const requestId = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();

    try {
      const body = req.body as {
        currentPassword: string;
        newPassword: string;
      };
      const { currentPassword, newPassword } = body;

      const result = await this.changePasswordUseCase.execute({
        userId,
        currentPassword,
        newPassword,
        causationId: requestId,
        correlationId: requestId,
      });

      if (result.isFailure()) {
        switch (result.error) {
          case 'user_not_found':
            res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
            return;
          case 'incorrect_password':
            res
              .status(400)
              .json({ code: 'INCORRECT_PASSWORD', message: 'Current password is incorrect' });
            return;
          case 'weak_password':
            res.status(400).json({
              code: 'WEAK_PASSWORD',
              message: 'Password must be at least 8 characters with letters and numbers',
            });
            return;
          default:
            res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
            return;
        }
      }

      res.status(200).json({ message: result.value.message });
    } catch (error) {
      this.logger.errorWithException('Failed to update password', error, {
        requestId,
        userId,
        operation: 'updatePassword',
      });
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }
}
