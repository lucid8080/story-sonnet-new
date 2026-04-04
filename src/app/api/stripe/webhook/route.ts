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

async function handleSubscriptionChange(
  customerId: string | null | undefined,
  status: string
) {
  if (!customerId) {
    return;
  }

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

  if (result.count === 0 && stripe) {
    try {
      const cust = await stripe.customers.retrieve(customerId);
      if (
        cust &&
        typeof cust !== 'string' &&
        cust.deleted !== true &&
        cust.metadata?.app_user_id
      ) {
        const r2 = await prisma.profile.updateMany({
          where: { userId: cust.metadata.app_user_id },
          data: {
            subscriptionStatus: profileStatus,
            stripeCustomerId: customerId,
          },
        });
        if (r2.count > 0) {
          return;
        }
      }
    } catch (e) {
      console.warn('[stripe webhook] customer metadata fallback failed', e);
    }
  }

  if (result.count === 0) {
    console.warn(
      '[stripe webhook] No profile for customer',
      customerId,
      '(subscription mapping skipped)'
    );
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
