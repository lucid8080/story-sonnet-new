import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { agentDebugLog } from '@/lib/agent-debug-log';

function customerIdFromStripe(
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

function mapStripeSubscriptionToProfileStatus(status: string): string {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  if (status === 'canceled' || status === 'incomplete_expired') return 'canceled';
  return 'free';
}

/**
 * After Checkout redirect, sync Prisma profile from the Checkout Session so
 * subscription works even if webhooks are missing, misconfigured, or delayed.
 */
export async function syncSubscriptionFromCheckoutReturn(options: {
  stripe: InstanceType<typeof Stripe>;
  userId: string;
  checkoutSessionId: string;
}): Promise<{ ok: boolean; reason: string }> {
  const { stripe, userId, checkoutSessionId } = options;

  try {
    const cs = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ['subscription'],
    });

    if (cs.mode !== 'subscription') {
      agentDebugLog({
        location: 'syncSubscriptionFromCheckoutReturn',
        message: 'skip: not subscription mode',
        hypothesisId: 'H6',
        data: { mode: cs.mode },
      });
      return { ok: false, reason: 'not_subscription_mode' };
    }

    const customerId = customerIdFromStripe(cs.customer);
    if (!customerId) {
      agentDebugLog({
        location: 'syncSubscriptionFromCheckoutReturn',
        message: 'skip: no customer id',
        hypothesisId: 'H6',
      });
      return { ok: false, reason: 'no_customer' };
    }

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      agentDebugLog({
        location: 'syncSubscriptionFromCheckoutReturn',
        message: 'skip: no profile',
        hypothesisId: 'H6',
      });
      return { ok: false, reason: 'no_profile' };
    }

    let allowed =
      !!profile.stripeCustomerId && profile.stripeCustomerId === customerId;

    if (!allowed) {
      const cust = await stripe.customers.retrieve(customerId);
      if (
        cust &&
        typeof cust !== 'string' &&
        cust.deleted !== true &&
        cust.metadata?.app_user_id === userId
      ) {
        allowed = true;
      }
    }

    if (!allowed) {
      agentDebugLog({
        location: 'syncSubscriptionFromCheckoutReturn',
        message: 'skip: session not owned by user',
        hypothesisId: 'H6',
        data: { customerIdTail: customerId.slice(-6) },
      });
      return { ok: false, reason: 'ownership_mismatch' };
    }

    const subRef = cs.subscription;
    let stripeStatus: string | null = null;
    if (typeof subRef === 'string') {
      const sub = await stripe.subscriptions.retrieve(subRef);
      stripeStatus = sub.status;
    } else if (subRef && typeof subRef === 'object' && 'status' in subRef) {
      stripeStatus = (subRef as Stripe.Subscription).status;
    }

    if (!stripeStatus) {
      agentDebugLog({
        location: 'syncSubscriptionFromCheckoutReturn',
        message: 'skip: no subscription on session',
        hypothesisId: 'H6',
      });
      return { ok: false, reason: 'no_subscription' };
    }

    const profileStatus = mapStripeSubscriptionToProfileStatus(stripeStatus);

    await prisma.profile.update({
      where: { userId },
      data: {
        subscriptionStatus: profileStatus,
        stripeCustomerId: customerId,
      },
    });

    agentDebugLog({
      location: 'syncSubscriptionFromCheckoutReturn',
      message: 'profile synced from checkout return',
      hypothesisId: 'H6',
      data: {
        stripeStatus,
        profileStatus,
        customerIdTail: customerId.slice(-6),
      },
    });

    return { ok: true, reason: 'updated' };
  } catch (e) {
    agentDebugLog({
      location: 'syncSubscriptionFromCheckoutReturn',
      message: 'sync threw',
      hypothesisId: 'H6',
      data: {
        err: e instanceof Error ? e.message.slice(0, 200) : 'unknown',
      },
    });
    return { ok: false, reason: 'error' };
  }
}
