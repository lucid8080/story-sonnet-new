import { useMemo } from 'react';
import { useAuth } from './useAuth.js';

export function useSubscription() {
  const { profile } = useAuth();

  const subscriptionStatus = profile?.subscription_status || 'free';

  const isSubscribed = useMemo(
    () => subscriptionStatus === 'active' || subscriptionStatus === 'trialing',
    [subscriptionStatus]
  );

  return {
    subscriptionStatus,
    isSubscribed,
  };
}

