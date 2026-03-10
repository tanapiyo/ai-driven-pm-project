/**
 * @what Admin Users Express router
 * @why Admin user management endpoints (CRUD)
 *
 * ADR-0013: Wave 4 - Admin routes migrated from Hono to Express
 *
 * Routes:
 *   GET    /admin/users
 *   POST   /admin/users
 *   GET    /admin/users/:userId
 *   PATCH  /admin/users/:userId
 *   DELETE /admin/users/:userId
 */

import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { RouteContext } from '@/presentation/index.js';
import { validateBody } from '../validate-body.js';

/** POST /admin/users request body schema */
const CreateUserBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  displayName: z.string().min(1, 'Display name is required'),
  role: z.enum(['admin', 'user'], { message: 'Role must be admin or user' }),
});

/** PATCH /admin/users/:userId request body schema */
const UpdateUserBodySchema = z
  .object({
    displayName: z.string().min(1, 'Display name must not be empty').optional(),
    role: z.enum(['admin', 'user']).optional(),
    status: z.enum(['active', 'inactive']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

/**
 * Admin-only role check middleware
 */
const requireAdmin: RequestHandler = (req, res, next) => {
  const user = req.currentUser;
  if (!user) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
    return;
  }
  next();
};

/**
 * Creates the admin users router.
 * Mount at /admin/users: app.use('/admin/users', createAdminUsersRouter())
 */
export function createAdminUsersRouter(): Router {
  const router = Router();

  /**
   * GET /admin/users
   * Admin only
   */
  const listUsersHandler: RequestHandler = async (req, res) => {
    const context = req.appContext as unknown as RouteContext;
    await context.adminUserController.list(req, res);
  };
  router.get('/', requireAdmin, listUsersHandler);

  /**
   * POST /admin/users
   * Admin only
   */
  const createUserHandler: RequestHandler = async (req, res) => {
    const context = req.appContext as unknown as RouteContext;
    await context.adminUserController.create(req, res);
  };
  router.post('/', validateBody(CreateUserBodySchema), requireAdmin, createUserHandler);

  /**
   * GET /admin/users/:userId
   * Admin only
   */
  const getUserHandler: RequestHandler = async (req, res) => {
    const context = req.appContext as unknown as RouteContext;
    await context.adminUserController.getById(req, res);
  };
  router.get('/:userId', requireAdmin, getUserHandler);

  /**
   * PATCH /admin/users/:userId
   * Admin only
   */
  const updateUserHandler: RequestHandler = async (req, res) => {
    const context = req.appContext as unknown as RouteContext;
    await context.adminUserController.update(req, res);
  };
  router.patch('/:userId', validateBody(UpdateUserBodySchema), requireAdmin, updateUserHandler);

  /**
   * DELETE /admin/users/:userId
   * Admin only (deactivates the user)
   */
  const deactivateUserHandler: RequestHandler = async (req, res) => {
    const context = req.appContext as unknown as RouteContext;
    await context.adminUserController.deactivate(req, res);
  };
  router.delete('/:userId', requireAdmin, deactivateUserHandler);

  return router;
}
