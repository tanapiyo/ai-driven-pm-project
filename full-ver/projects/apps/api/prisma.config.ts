/**
 * @what Prisma 7 configuration
 * @why DATABASE_URL is now configured here instead of schema.prisma
 *
 * Note: Using process.env instead of env() helper so that `prisma generate`
 * works without DATABASE_URL (only needed for migrations/db operations)
 */

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
