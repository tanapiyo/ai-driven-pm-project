/**
 * @what Database seed script
 * @why CI Seed Integrity Check で使用。初期データを投入する。
 */

import { PrismaClient } from './generated/prisma/client.js';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

async function main() {
  const adapter = new PrismaMariaDb(process.env.DATABASE_URL ?? '');
  const prisma = new PrismaClient({ adapter });

  try {
    const adminEmail = 'admin@example.com';

    const existing = await prisma.authUser.findUnique({
      where: { email: adminEmail },
    });

    if (existing) {
      console.log(`Seed: admin user already exists (${adminEmail})`);
      return;
    }

    const passwordHash = await bcrypt.hash('Admin1234', BCRYPT_ROUNDS);

    await prisma.authUser.create({
      data: {
        email: adminEmail,
        name: 'Admin',
        role: 'admin',
        status: 'active',
        passwordHash,
      },
    });

    console.log(`Seed: created admin user (${adminEmail})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
