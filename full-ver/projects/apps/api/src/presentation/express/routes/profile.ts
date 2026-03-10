/**
 * @what Profile Express router
 * @why User profile management endpoints
 *
 * ADR-0013: Wave 2 - Profile routes migrated from Hono to Express
 *
 * Routes:
 *   PATCH /users/me/name
 *   PATCH /users/me/password
 */

import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { RouteContext } from '@/presentation/index.js';
import { validateBody } from '../validate-body.js';

/** PATCH /users/me/name request body schema */
const UpdateNameBodySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
});

/** PATCH /users/me/password request body schema */
const UpdatePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * Creates the profile (my-user) router.
 * Mount at /users/me: app.use('/users/me', createProfileRouter())
 */
export function createProfileRouter(): Router {
  const router = Router();

  /**
   * PATCH /users/me/name
   * Requires authentication
   */
  const updateNameHandler: RequestHandler = async (req, res) => {
    const user = req.currentUser;
    if (!user) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }
    const context = req.appContext as unknown as RouteContext;
    await context.profileController.updateName(req, res, user.userId);
  };
  router.patch('/name', validateBody(UpdateNameBodySchema), updateNameHandler);

  /**
   * PATCH /users/me/password
   * Requires authentication
   */
  const updatePasswordHandler: RequestHandler = async (req, res) => {
    const user = req.currentUser;
    if (!user) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }
    const context = req.appContext as unknown as RouteContext;
    await context.profileController.updatePassword(req, res, user.userId);
  };
  router.patch('/password', validateBody(UpdatePasswordBodySchema), updatePasswordHandler);

  return router;
}
