import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

const MIN_PASSWORD_LENGTH = 8;

function validateNewPassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'New password must contain at least one letter and one number.';
  }
  return null;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | {
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      }
    | null;

  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const currentPassword = body.currentPassword?.trim() ?? '';
  const newPassword = body.newPassword ?? '';
  const confirmPassword = body.confirmPassword ?? '';

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json(
      { error: 'Current password, new password, and confirmation are required.' },
      { status: 400 }
    );
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json(
      { error: 'New password and confirmation do not match.' },
      { status: 400 }
    );
  }

  const passwordPolicyError = validateNewPassword(newPassword);
  if (passwordPolicyError) {
    return NextResponse.json({ error: passwordPolicyError }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json(
        {
          error:
            'Password change is unavailable for this account. Sign in with your provider and add password setup support first.',
        },
        { status: 400 }
      );
    }

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return NextResponse.json(
        { error: 'Current password is incorrect.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[account/password POST]', error);
    return NextResponse.json(
      { error: 'Password change failed. Please try again.' },
      { status: 500 }
    );
  }
}
