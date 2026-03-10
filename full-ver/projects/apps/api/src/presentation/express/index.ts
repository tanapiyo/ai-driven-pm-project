/**
 * @what Express presentation layer public exports
 * @why Exposes Express-specific types and utilities
 *
 * ADR-0013: Express 5.x server skeleton
 */

export { createExpressApp } from './create-express-app.js';
export { validateBody } from './validate-body.js';
export { createHealthRouter } from './routes/health.js';
export { createVersionRouter } from './routes/version.js';
export { createAuthRouter } from './routes/auth.js';
export { createProfileRouter } from './routes/profile.js';
export { createPingRouter } from './routes/ping.js';
export { createAdminUsersRouter } from './routes/admin-users.js';
export { createAdminAuditLogsRouter } from './routes/admin-audit-logs.js';
export { createRootRouter } from './routes/root.js';
