import { useMemo } from 'react';
import { useAuth } from './useAuth.js';

export function useAdmin() {
  const { profile, supabase } = useAuth();

  const isAdmin = useMemo(() => {
    // When Supabase is not configured (local/dev without env vars),
    // treat the current user as admin so you can access /admin locally.
    if (!supabase) return true;
    return profile?.role === 'admin';
  }, [profile?.role, supabase]);

  return {
    isAdmin,
  };
}

