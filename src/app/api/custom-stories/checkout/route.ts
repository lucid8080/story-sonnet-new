import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { customStoryCheckoutSchema } from '@/lib/custom-stories/schemas';
import { CUSTOM_STORY_STATUS } from '@/lib/custom-stories/config';
import { siteUrl, stripe } from '@/lib/stripe-server';

function successUrlWithSessionId(successRaw: string): string {
  if (successRaw.includes('{CHECKOUT_SESSION_ID}')) return successRaw;
  if (/[?&]session_id=/.test(successRaw)) return successRaw;
  return `${successRaw}${successRaw.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
}

export async function POST(req: Request) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 503 });
  }
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = customStoryCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const order = await prisma.customStoryOrder.findFirst({
    where: { id: parsed.data.orderId, userId: session.user.id },
  });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status === CUSTOM_STORY_STATUS.COMPLETED) {
    return NextResponse.json({ error: 'Order is already completed' }, { status: 409 });
  }
  if (order.status === CUSTOM_STORY_STATUS.PAID || order.status === CUSTOM_STORY_STATUS.GENERATING) {
    return NextResponse.json({ error: 'Order is already paid' }, { status: 409 });
  }

  const profile = await prisma.profile.findUnique({ where: { userId: session.user.id } });
  let customerId = profile?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: { app_user_id: session.user.id },
    });
    customerId = customer.id;
    await prisma.profile.update({
      where: { userId: session.user.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const base = siteUrl();
  const success = successUrlWithSessionId(parsed.data.returnUrlSuccess ?? `${base}/account/custom-stories`);
  const cancel = parsed.data.returnUrlCancel ?? `${base}/custom-stories/create`;
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    client_reference_id: session.user.id,
    metadata: {
      custom_story_order_id: order.id,
      custom_story_user_id: session.user.id,
    },
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: order.priceCents,
          product_data: {
            name: `Custom Story (${order.packageType})`,
            description: `${order.episodeCount} episodes, up to 5 minutes each`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: success,
    cancel_url: cancel,
  });

  await prisma.customStoryOrder.update({
    where: { id: order.id },
    data: {
      status: CUSTOM_STORY_STATUS.PAYMENT_PENDING,
      stripeSessionId: checkoutSession.id,
    },
  });

  return NextResponse.json({ ok: true, url: checkoutSession.url, sessionId: checkoutSession.id });
}
