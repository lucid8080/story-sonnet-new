import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { siteUrl, stripe } from '@/lib/stripe-server';

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured.' },
      { status: 503 }
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No Stripe customer found for this user.' },
      { status: 400 }
    );
  }

  let body: { returnUrl?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }

  const base = siteUrl();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: body.returnUrl || `${base}/account`,
  });

  return NextResponse.json({ url: portalSession.url });
}
