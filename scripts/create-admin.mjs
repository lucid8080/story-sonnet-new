/**
 * Creates or promotes an admin user (credentials login + profile.role = admin).
 * Usage: set ADMIN_EMAIL and ADMIN_PASSWORD, then:
 *   node --env-file=.env scripts/create-admin.mjs
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const email = process.env.ADMIN_EMAIL?.trim();
const password = process.env.ADMIN_PASSWORD;

async function main() {
  if (!email || !password) {
    console.error(
      '[create-admin] Set ADMIN_EMAIL and ADMIN_PASSWORD (e.g. in .env or the shell).'
    );
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (!existing.password) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { password: hashed },
      });
      console.log('[create-admin] Set password for OAuth-only user:', email);
    }
    await prisma.profile.upsert({
      where: { userId: existing.id },
      create: {
        userId: existing.id,
        fullName: 'Admin',
        role: 'admin',
      },
      update: { role: 'admin' },
    });
    console.log('[create-admin] User is now admin:', email);
  } else {
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: 'Admin',
      },
    });
    await prisma.profile.create({
      data: {
        userId: user.id,
        fullName: 'Admin',
        role: 'admin',
      },
    });
    console.log('[create-admin] Created admin user:', email);
  }
}

main()
  .catch((e) => {
    console.error('[create-admin]', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
