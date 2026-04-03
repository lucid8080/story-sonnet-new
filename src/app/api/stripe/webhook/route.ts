import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe-server';

export const runtime = 'nodejs';

async function handleSubscriptionChange(
  customerId: string,
  status: string
) {
  let profileStatus = 'free';
  if (status === 'active' || status === 'trialing') {
    profileStatus = 'active';
  } else if (status === 'past_due' || status === 'unpaid') {
    profileStatus = 'past_due';
  } else if (status === 'canceled' || status === 'incomplete_expired') {
    profileStatus = 'canceled';
  }

  const result = await prisma.profile.updateMany({
    where: { stripeCustomerId: customerId },
    data: { subscriptionStatus: profileStatus },
  });

  if (result.count === 0) {
    console.warn(
      '[stripe webhook] No profile for customer',
      customerId,
      '(debug: subscription mapping skipped)'
    );
  }
}

export async function POST(req: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Stripe webhook not configured.' },
      { status: 503 }
    );
  }

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const buf = Buffer.from(await req.arrayBuffer());

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'verify failed';
    console.error('[stripe webhook] verify failed', message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const sessionObj = event.data.object as Stripe.Checkout.Session;
        const customerId = sessionObj.customer as string;
        if (
          sessionObj.mode === 'subscription' &&
          sessionObj.subscription
        ) {
          await handleSubscriptionChange(customerId, 'active');
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(
          subscription.customer as string,
          subscription.status
        );
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(
          subscription.customer as string,
          'canceled'
        );
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('[stripe webhook] handler error', e);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
