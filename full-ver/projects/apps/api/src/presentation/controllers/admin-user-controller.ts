/**
 * @what Admin ユーザー管理コントローラ
 * @why ユーザーの CRUD を HTTP API として提供
 *
 * ADR-0013: Migrated from Hono Context to Express RequestHandler
 */

import type { Request, Response } from 'express';
import type {
  ListUsersUseCase,
  GetUserByIdUseCase,
  AdminCreateUserUseCase,
  AdminUpdateUserUseCase,
  DeactivateUserUseCase,
} from '@/usecase/admin/index.js';
import type { UserRole, UserStatus } from '@/domain/auth/index.js';

export class AdminUserController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly createUserUseCase: AdminCreateUserUseCase,
    private readonly updateUserUseCase: AdminUpdateUserUseCase,
    private readonly deactivateUserUseCase: DeactivateUserUseCase
  ) {}

  async list(req: Request, res: Response): Promise<void> {
    const query = req.query as {
      page?: string;
      limit?: string;
      role?: string;
      status?: string;
      search?: string;
    };

    const page = query.page ? parseInt(query.page, 10) : 1;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;

    const result = await this.listUsersUseCase.execute({
      filter: {
        role: query.role as UserRole | undefined,
        status: query.status as UserStatus | undefined,
        search: query.search,
      },
      pagination: { page, limit },
    });

    if (result.isFailure()) {
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
      return;
    }

    res.status(200).json(result.value);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const rawUserId = req.params['userId'];
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    if (!userId) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      return;
    }

    const result = await this.getUserByIdUseCase.execute(userId);

    if (result.isFailure()) {
      if (result.error === 'not_found') {
        res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
        return;
      }
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
      return;
    }

    res.status(200).json(result.value);
  }

  async create(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      email: string;
      password: string;
      displayName: string;
      role: UserRole;
    };

    const result = await this.createUserUseCase.execute({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
      role: body.role,
    });

    if (result.isFailure()) {
      if (result.error === 'invalid_email') {
        res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid email format' });
        return;
      }
      if (result.error === 'email_already_exists') {
        res.status(409).json({ code: 'EMAIL_EXISTS', message: 'Email already exists' });
        return;
      }
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
      return;
    }

    res.status(201).json(result.value);
  }

  async update(req: Request, res: Response): Promise<void> {
    const rawUserId = req.params['userId'];
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    if (!userId) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      return;
    }

    const body = req.body as {
      displayName?: string;
      role?: UserRole;
      status?: UserStatus;
    };

    const result = await this.updateUserUseCase.execute(userId, {
      displayName: body.displayName,
      role: body.role,
      status: body.status,
    });

    if (result.isFailure()) {
      if (result.error === 'not_found') {
        res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
        return;
      }
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
      return;
    }

    res.status(200).json(result.value);
  }

  async deactivate(req: Request, res: Response): Promise<void> {
    const rawUserId = req.params['userId'];
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    if (!userId) {
      res.status(400).json({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      return;
    }

    const result = await this.deactivateUserUseCase.execute(userId);

    if (result.isFailure()) {
      if (result.error === 'not_found') {
        res.status(404).json({ code: 'NOT_FOUND', message: 'User not found' });
        return;
      }
      if (result.error === 'already_inactive') {
        res.status(400).json({ code: 'ALREADY_INACTIVE', message: 'User is already inactive' });
        return;
      }
      res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
      return;
    }

    res.status(200).json(result.value);
  }
}
