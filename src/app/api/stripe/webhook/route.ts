import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { stripe } from '@/lib/stripe-server';

export const runtime = 'nodejs';

/** Stripe often sends `customer` as an id string; expanded objects must be normalized. */
function stripeCustomerIdFromPayload(
  customer:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | null
    | undefined
): string | null {
  if (customer == null || customer === '') return null;
  if (typeof customer === 'string') return customer;
  const id = (customer as Stripe.Customer).id;
  return typeof id === 'string' ? id : null;
}

/** Matches `Profile.subscriptionStatus` values written by this webhook. */
function mapStripeStatusToStored(stripeStatus: string): string {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') {
    return 'active';
  }
  if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') {
    return 'past_due';
  }
  if (stripeStatus === 'canceled' || stripeStatus === 'incomplete_expired') {
    return 'canceled';
  }
  return 'free';
}

function storedStatusIsPaying(subscriptionStatus: string): boolean {
  return subscriptionStatus === 'active';
}

async function handleSubscriptionChange(
  customerId: string | null | undefined,
  stripeStatus: string
) {
  if (!customerId) {
    return;
  }

  const newStored = mapStripeStatusToStored(stripeStatus);

  let profile = await prisma.profile.findFirst({
    where: { stripeCustomerId: customerId },
    select: { userId: true, subscriptionStatus: true, stripeCustomerId: true },
  });

  if (!profile && stripe) {
    try {
      const cust = await stripe.customers.retrieve(customerId);
      if (
        cust &&
        typeof cust !== 'string' &&
        cust.deleted !== true &&
        cust.metadata?.app_user_id
      ) {
        profile = await prisma.profile.findUnique({
          where: { userId: cust.metadata.app_user_id as string },
          select: { userId: true, subscriptionStatus: true, stripeCustomerId: true },
        });
      }
    } catch (e) {
      console.warn('[stripe webhook] customer lookup failed', e);
    }
  }

  if (!profile) {
    console.warn(
      '[stripe webhook] No profile for customer',
      customerId,
      '(subscription mapping skipped)'
    );
    return;
  }

  const oldStored = profile.subscriptionStatus;
  const wasPaying = storedStatusIsPaying(oldStored);
  const nowPaying = storedStatusIsPaying(newStored);

  await prisma.profile.update({
    where: { userId: profile.userId },
    data: {
      subscriptionStatus: newStored,
      stripeCustomerId: profile.stripeCustomerId ?? customerId,
    },
  });

  if (!wasPaying && nowPaying) {
    try {
      await prisma.adminInboxEvent.create({
        data: {
          type: 'subscription_active',
          userId: profile.userId,
          metadata: {
            stripeCustomerId: customerId,
            priorStatus: oldStored,
            stripeStatus,
          },
        },
      });
    } catch (e) {
      console.warn('[stripe webhook] admin inbox subscription event failed', e);
    }
  }
}

async function syncSubscriptionFromCheckoutSession(
  sessionObj: Stripe.Checkout.Session
) {
  const rawCustomer = sessionObj.customer;
  const customerId = stripeCustomerIdFromPayload(
    rawCustomer as
      | string
      | Stripe.Customer
      | Stripe.DeletedCustomer
      | null
  );
  if (
    sessionObj.mode === 'subscription' &&
    sessionObj.subscription &&
    customerId
  ) {
    await handleSubscriptionChange(customerId, 'active');
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
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const sessionObj = event.data.object as Stripe.Checkout.Session;
        await syncSubscriptionFromCheckoutSession(sessionObj);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const cid = stripeCustomerIdFromPayload(
          subscription.customer as
            | string
            | Stripe.Customer
            | Stripe.DeletedCustomer
            | null
        );
        if (cid) {
          await handleSubscriptionChange(cid, subscription.status);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const cid = stripeCustomerIdFromPayload(
          subscription.customer as
            | string
            | Stripe.Customer
            | Stripe.DeletedCustomer
            | null
        );
        if (cid) {
          await handleSubscriptionChange(cid, 'canceled');
        }
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
