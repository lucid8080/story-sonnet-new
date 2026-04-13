import type { CampaignAudience } from '@prisma/client';
import type { CampaignUserContext } from './types';
import { isPayingSubscriber } from './context';

export function matchesAudience(
  audience: CampaignAudience,
  ctx: CampaignUserContext,
  newUserMaxAgeDays?: number | null
): boolean {
  switch (audience) {
    case 'all':
      return true;
    case 'logged_out':
      return !ctx.isLoggedIn;
    case 'logged_in':
      return ctx.isLoggedIn;
    case 'subscribers':
      return ctx.isLoggedIn && isPayingSubscriber(ctx.subscriptionStatus);
    case 'free_users':
      return (
        ctx.isLoggedIn &&
        !isPayingSubscriber(ctx.subscriptionStatus) &&
        ctx.subscriptionStatus !== 'trialing'
      );
    case 'trial_users':
      return ctx.isLoggedIn && ctx.subscriptionStatus === 'trialing';
    case 'new_users': {
      if (!ctx.isLoggedIn || !ctx.profileCreatedAt) return false;
      const days =
        typeof newUserMaxAgeDays === 'number' && newUserMaxAgeDays > 0
          ? newUserMaxAgeDays
          : 14;
      const ms = days * 24 * 60 * 60 * 1000;
      return Date.now() - ctx.profileCreatedAt.getTime() <= ms;
    }
    default:
      return false;
  }
}

export type TrialEligibilityJson = {
  newAccountsOnly?: boolean;
  neverPaidOnly?: boolean;
  loggedOutOnly?: boolean;
  specificPlanOnly?: string | null;
  excludeActiveSubscribers?: boolean;
  newUserMaxAgeDays?: number | null;
};

export function parseTrialEligibility(raw: unknown): TrialEligibilityJson {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return raw as TrialEligibilityJson;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whether a trial offer should be shown for this viewer, for signup-relative windows only.
 * Matches {@link trialEligibilityReason} for `newUserMaxAgeDays` (logged-out viewers still pass).
 */
export function trialOfferVisibleForSignupWindow(
  rules: TrialEligibilityJson,
  ctx: CampaignUserContext,
  now: Date
): boolean {
  const maxAge = rules.newUserMaxAgeDays;
  if (typeof maxAge !== 'number' || maxAge <= 0) return true;
  if (!ctx.isLoggedIn || !ctx.profileCreatedAt) return true;
  return now.getTime() - ctx.profileCreatedAt.getTime() <= maxAge * MS_PER_DAY;
}

export function trialEligibilityReason(
  rules: TrialEligibilityJson,
  ctx: CampaignUserContext
): { ok: true } | { ok: false; code: string; message: string } {
  if (rules.loggedOutOnly && ctx.isLoggedIn) {
    return { ok: false, code: 'logged_out_only', message: 'This offer is only available before you sign in.' };
  }
  if (!rules.loggedOutOnly && !ctx.isLoggedIn) {
    return { ok: false, code: 'login_required', message: 'Sign in to claim this offer.' };
  }
  if (rules.newAccountsOnly && ctx.profileCreatedAt) {
    const maxAgeMs = 48 * 60 * 60 * 1000;
    if (Date.now() - ctx.profileCreatedAt.getTime() > maxAgeMs) {
      return { ok: false, code: 'new_accounts_only', message: 'This offer is for new accounts only.' };
    }
  }
  if (rules.neverPaidOnly && ctx.hadPaidPurchase) {
    return { ok: false, code: 'never_paid_only', message: 'This offer is for users who have not purchased before.' };
  }
  if (rules.excludeActiveSubscribers && isPayingSubscriber(ctx.subscriptionStatus)) {
    return {
      ok: false,
      code: 'exclude_subscribers',
      message: 'This offer is not available for current subscribers.',
    };
  }
  if (rules.specificPlanOnly && rules.specificPlanOnly.trim()) {
    const want = rules.specificPlanOnly.trim().toLowerCase();
    const have = (ctx.subscriptionPlan || ctx.subscriptionStatus || '').toLowerCase();
    if (have !== want) {
      return { ok: false, code: 'plan_mismatch', message: 'Your plan is not eligible for this offer.' };
    }
  }
  const maxAge = rules.newUserMaxAgeDays;
  if (typeof maxAge === 'number' && maxAge > 0 && ctx.profileCreatedAt) {
    if (Date.now() - ctx.profileCreatedAt.getTime() > maxAge * 24 * 60 * 60 * 1000) {
      return { ok: false, code: 'new_user_window', message: 'This offer is for newer accounts only.' };
    }
  }
  return { ok: true };
}
