/**
 * @what Express Request declaration merging for DI context
 * @why Provides type-safe access to appContext and currentUser on req
 *      Replaces Hono's AppEnv generic with Express declaration merging
 *
 * ADR-0013: DI Context Injection (section 4)
 *
 * Uses the Express global namespace augmentation pattern (declare namespace Express)
 * which is the officially supported way to extend Express Request without breaking
 * the existing Request/Response/NextFunction types.
 *
 * Fields are optional at the type level because middleware sets them
 * incrementally before route handlers execute.
 */

declare namespace Express {
  interface Request {
    /**
     * Application DI context (controllers, usecases, middleware)
     * Set by the context injection middleware.
     */
    appContext?: {
      [key: string]: unknown;
    };

    /**
     * Authenticated user (set by auth middleware)
     */
    currentUser?: {
      userId: string;
      email: string;
      role: string;
    };

    /**
     * Authorized user context (set by unitAccessMiddleware)
     * Contains userId and role for authorization checks
     */
    userContext?: {
      userId: string;
      role: string;
    };

    /**
     * Validated request body (set by validateBody middleware)
     * Type-safe alternative to req.body
     */
    validatedBody?: unknown;
  }
}
