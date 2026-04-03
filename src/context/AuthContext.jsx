import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function initAuth() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (ignore) return;

      if (sessionError) {
        console.error('[Auth] Error getting session', sessionError);
        setError(sessionError.message);
        setLoading(false);
        return;
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await loadProfile(currentSession.user);
      } else {
        setLoading(false);
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        setError(null);

        if (nextSession?.user) {
          await loadProfile(nextSession.user);
        } else {
          setProfile(null);
        }
      });

      return () => {
        ignore = true;
        subscription?.unsubscribe();
      };
    }

    async function loadProfile(authUser) {
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('[Auth] Error loading profile', profileError);
          setError(profileError.message);
        }

        setProfile(data ?? null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const signUpWithEmail = async ({ email, password, fullName }) => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      return { error: signUpError.message };
    }

    return { data };
  };

  const signInWithEmail = async ({ email, password }) => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    setError(null);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      return { error: signInError.message };
    }

    return { data };
  };

  const signInWithProvider = async (provider) => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    setError(null);

    const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: import.meta.env.VITE_SITE_URL || window.location.origin,
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      return { error: oauthError.message };
    }

    return { data };
  };

  const signOut = async () => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    setError(null);

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return { error: signOutError.message };
    }

    setProfile(null);
    return {};
  };

  const requestPasswordReset = async (email) => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    setError(null);

    const redirectTo = `${import.meta.env.VITE_SITE_URL || window.location.origin}/account`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      setError(resetError.message);
      return { error: resetError.message };
    }
    return {};
  };

  const value = useMemo(
    () => ({
      supabase,
      session,
      user,
      profile,
      loading,
      error,
      signUpWithEmail,
      signInWithEmail,
      signInWithProvider,
      signOut,
      requestPasswordReset,
    }),
    [session, user, profile, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}

