import { useAuthContext } from '../context/AuthContext.jsx';

export function useAuth() {
  const ctx = useAuthContext();
  return ctx || {
    supabase: null,
    session: null,
    user: null,
    profile: null,
    loading: false,
    error: null,
    signUpWithEmail: async () => ({ error: 'Auth not available' }),
    signInWithEmail: async () => ({ error: 'Auth not available' }),
    signInWithProvider: async () => ({ error: 'Auth not available' }),
    signOut: async () => ({ error: 'Auth not available' }),
    requestPasswordReset: async () => ({ error: 'Auth not available' }),
  };
}

