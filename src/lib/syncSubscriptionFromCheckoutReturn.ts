import Stripe from 'stripe';
import prisma from '@/lib/prisma';

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
 * After Checkout redirect, sync Prisma profile from the Checkout Session.
 * Uses `client_reference_id` (set when creating the session) so this works
 * even when the NextAuth session cookie is missing right after Stripe redirect.
 */
export async function syncSubscriptionFromCheckoutReturn(options: {
  stripe: InstanceType<typeof Stripe>;
  checkoutSessionId: string;
  /** If set, must match the session's `client_reference_id`. */
  sessionUserId?: string | null;
}): Promise<{ ok: boolean; reason: string }> {
  const { stripe, checkoutSessionId, sessionUserId } = options;

  try {
    const cs = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
      expand: ['subscription'],
    });

    const refUserId = cs.client_reference_id || null;
    if (!refUserId) {
      return { ok: false, reason: 'no_client_reference_id' };
    }

    if (sessionUserId && sessionUserId !== refUserId) {
      return { ok: false, reason: 'session_user_mismatch' };
    }

    const userId = refUserId;

    if (cs.mode !== 'subscription') {
      return { ok: false, reason: 'not_subscription_mode' };
    }

    const customerId = customerIdFromStripe(cs.customer);
    if (!customerId) {
      return { ok: false, reason: 'no_customer' };
    }

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
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

    return { ok: true, reason: 'updated' };
  } catch {
    return { ok: false, reason: 'error' };
  }
}
