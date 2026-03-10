/**
 * @what Prisma クライアントのシングルトン（Prisma 7 対応）
 * @why コネクションプールを効率的に管理
 */

import { PrismaClient } from '../../../prisma/generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL ?? '');
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export type { PrismaClient };
