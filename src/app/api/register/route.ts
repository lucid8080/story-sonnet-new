import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { validatePasswordPolicy } from '@/lib/auth/passwordPolicy';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const fullName =
      typeof body.fullName === 'string' ? body.fullName.trim() : null;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Valid email and password are required.' },
        { status: 400 }
      );
    }

    const policyError = validatePasswordPolicy(password, 'register');
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashed,
        name: fullName || null,
      },
    });

    await prisma.profile.create({
      data: {
        userId: user.id,
        fullName,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[register]', e);
    return NextResponse.json(
      { error: 'Registration failed. Check server logs.' },
      { status: 500 }
    );
  }
}
