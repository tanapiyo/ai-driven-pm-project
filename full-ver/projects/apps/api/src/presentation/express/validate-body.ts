/**
 * @what Zod validation middleware for Express
 * @why Provides type-safe validated body access (equivalent to Hono's c.req.valid('json'))
 *
 * ADR-0013: Zod Request Validation Middleware (section 2)
 *
 * Usage:
 *   router.post('/resource', validateBody(MySchema), (req, res) => {
 *     const data = req.validatedBody as z.infer<typeof MySchema>;
 *   });
 */

import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Creates a middleware that validates req.body against a Zod schema.
 * On success, sets req.validatedBody with the parsed data.
 * On failure, returns 422 with structured error details.
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(422).json({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: result.error.flatten(),
      });
      return;
    }
    req.validatedBody = result.data;
    next();
  };
}
