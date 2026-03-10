/**
 * @what Auth Express router
 * @why Authentication endpoints (login, logout, refresh, me)
 *
 * ADR-0013: Wave 2 - Auth routes migrated from Hono to Express
 *
 * Routes:
 *   POST /auth/login
 *   POST /auth/logout
 *   POST /auth/refresh
 *   GET  /auth/me
 */

import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import type { RouteContext } from '@/presentation/index.js';
import { validateBody } from '../validate-body.js';

/** POST /auth/login request body schema */
const LoginBodySchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

/** POST /auth/refresh request body schema (refreshToken is optional — can also come from cookie) */
const RefreshBodySchema = z.object({
  refreshToken: z.string().optional(),
});

/**
 * Creates the auth router.
 * Mount at /auth: app.use('/auth', createAuthRouter())
 */
export function createAuthRouter(): Router {
  const router = Router();

  /**
   * POST /auth/login
   * Public endpoint - no auth required
   */
  const loginHandler: RequestHandler = async (req, res) => {
    const context = req.appContext as unknown as RouteContext;
    await context.authController.login(req, res);
  };
  router.post('/login', validateBody(LoginBodySchema), loginHandler);

  /**
   * POST /auth/logout
   * Requires authentication
   */
  const logoutHandler: RequestHandler = async (req, res) => {
    const user = req.currentUser;
    if (!user) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }
    const context = req.appContext as unknown as RouteContext;
    await context.authController.logout(req, res, user.userId);
  };
  router.post('/logout', logoutHandler);

  /**
   * POST /auth/refresh
   * Public endpoint - refreshes using token from body or cookie
   */
  const refreshHandler: RequestHandler = async (req, res) => {
    const context = req.appContext as unknown as RouteContext;
    await context.authController.refresh(req, res);
  };
  router.post('/refresh', validateBody(RefreshBodySchema), refreshHandler);

  /**
   * GET /auth/me
   * Requires authentication
   */
  const getCurrentUserHandler: RequestHandler = async (req, res) => {
    const user = req.currentUser;
    if (!user) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }
    const context = req.appContext as unknown as RouteContext;
    await context.authController.getCurrentUser(req, res, user.userId);
  };
  router.get('/me', getCurrentUserHandler);

  return router;
}
