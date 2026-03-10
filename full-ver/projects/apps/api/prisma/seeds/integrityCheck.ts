/**
 * @what Seed integrity check
 * @why seed 投入後のデータ整合性を CI で検証する
 */

import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL ?? '');
  const prisma = new PrismaClient({ adapter });

  const errors: string[] = [];

  try {
    const adminUser = await prisma.authUser.findUnique({
      where: { email: 'admin@example.com' },
    });

    if (!adminUser) {
      errors.push('Missing admin user (admin@example.com)');
    } else {
      if (adminUser.role !== 'admin') {
        errors.push(`Admin user role is "${adminUser.role}", expected "admin"`);
      }
      if (adminUser.status !== 'active') {
        errors.push(`Admin user status is "${adminUser.status}", expected "active"`);
      }
    }

    if (errors.length > 0) {
      console.error('Seed integrity check FAILED:');
      for (const error of errors) {
        console.error(`  - ${error}`);
      }
      process.exit(1);
    }

    console.log('Seed integrity check PASSED');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Integrity check failed:', e);
  process.exit(1);
});
