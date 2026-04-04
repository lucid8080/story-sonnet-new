import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { siteUrl, stripe } from '@/lib/stripe-server';

/** Stripe substitutes this in success_url; required for server-side subscription sync. */
function ensureCheckoutSuccessUrlHasSessionTemplate(successUrl: string): string {
  if (successUrl.includes('{CHECKOUT_SESSION_ID}')) return successUrl;
  if (/[?&]session_id=/.test(successUrl)) return successUrl;
  return `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
}

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured (STRIPE_SECRET_KEY).' },
      { status: 503 }
    );
  }

  let body: {
    returnUrlSuccess?: string;
    returnUrlCancel?: string;
    interval?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body */
  }

  const billingInterval = body.interval === 'year' ? 'year' : 'month';
  const monthlyPriceId = process.env.STRIPE_PRICE_ID;
  const annualPriceId = process.env.STRIPE_PRICE_ID_ANNUAL;

  let priceId: string | undefined;
  if (billingInterval === 'year') {
    if (!annualPriceId) {
      return NextResponse.json(
        { error: 'STRIPE_PRICE_ID_ANNUAL is not set.' },
        { status: 503 }
      );
    }
    priceId = annualPriceId;
  } else {
    if (!monthlyPriceId) {
      return NextResponse.json(
        { error: 'STRIPE_PRICE_ID is not set.' },
        { status: 503 }
      );
    }
    priceId = monthlyPriceId;
  }

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  let customerId = profile?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { app_user_id: userId },
    });
    customerId = customer.id;
    await prisma.profile.update({
      where: { userId },
      data: { stripeCustomerId: customerId },
    });
  }

  const base = siteUrl();
  const successRaw =
    (body.returnUrlSuccess?.trim() || `${base}/billing/success`).trim();
  const success_url = ensureCheckoutSuccessUrlHasSessionTemplate(successRaw);

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url,
    cancel_url: body.returnUrlCancel || `${base}/billing/cancel`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
