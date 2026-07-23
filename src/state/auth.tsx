/**
 * Authentication and roles.
 *
 * The portal a person sees is decided by the roles on their account, not by a
 * switcher in the UI: a super-admin login shows the super-admin app, a kitchen
 * owner's login shows their kitchen. Accounts that genuinely hold several roles
 * (the founder does) can move between the ones they hold — and only those.
 *
 * With no Supabase credentials configured the app runs in demo mode: signed in
 * as a fictional founder holding every role, so every screen stays reachable
 * without a backend.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

import { supabase, isSupabaseConfigured } from '../data/supabase';
import { registerForPush, unregisterPush } from '../lib/notifications';

// Ensures the OAuth browser tab hands control back to the app after redirect.
WebBrowser.maybeCompleteAuthSession();

/**
 * Google Sign-In is available only once it's configured — a Google OAuth
 * client wired into Supabase, and this flag flipped on for the build. Until
 * then the button is hidden, so people never meet a button that errors.
 */
export const GOOGLE_ENABLED = process.env.EXPO_PUBLIC_ENABLE_GOOGLE === 'true';

export type Role = 'customer' | 'kitchen' | 'instructor' | 'super';

export const ROLE_LABELS: Record<Role, string> = {
  customer: 'Customer',
  kitchen: 'Kitchen owner',
  instructor: 'Instructor',
  super: 'Super admin',
};

/** Database role names map onto the app's portal names. */
const ROLE_FROM_DB: Record<string, Role> = {
  customer: 'customer',
  kitchen_owner: 'kitchen',
  instructor: 'instructor',
  super_admin: 'super',
};

/** Portal precedence when an account holds several roles. */
const ROLE_PRIORITY: Role[] = ['super', 'kitchen', 'instructor', 'customer'];

export type AuthUser = {
  id: string;
  email: string | null;
  name: string;
};

type AuthValue = {
  /** True while the initial session is being restored. */
  loading: boolean;
  /** Null when signed out (only possible with Supabase configured). */
  user: AuthUser | null;
  /** Roles this account actually holds. */
  roles: Role[];
  /** The portal currently on screen. */
  role: Role;
  /** Switch portals — only permitted among roles the account holds. */
  setRole: (role: Role) => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  /** One-tap Google sign-in; only meaningful when GOOGLE_ENABLED. */
  signInWithGoogle: () => Promise<{ error: string | null }>;
  /** Whether the Google button should be shown. */
  googleEnabled: boolean;
  signOut: () => Promise<void>;
  /** Re-read roles, e.g. after claiming a kitchen invite. */
  refreshRoles: () => Promise<void>;
  /** True when running against demo data with no backend. */
  demo: boolean;
};

const AuthContext = createContext<AuthValue | null>(null);

/** The fictional founder used when no backend is configured. */
const DEMO_USER: AuthUser = { id: 'demo-user', email: 'demo@nandhandelight.in', name: 'Nandhan Delight' };
const DEMO_ROLES: Role[] = ['customer', 'kitchen', 'instructor', 'super'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const demo = !isSupabaseConfigured;

  const [loading, setLoading] = useState(!demo);
  const [user, setUser] = useState<AuthUser | null>(demo ? DEMO_USER : null);
  const [roles, setRoles] = useState<Role[]>(demo ? DEMO_ROLES : []);
  const [role, setRoleState] = useState<Role>('customer');

  /** Load the caller's roles and pick the portal their account implies. */
  const loadRoles = useCallback(async (session: Session | null) => {
    if (!supabase || !session) {
      setRoles([]);
      return;
    }
    const { data, error } = await supabase.rpc('my_roles');
    if (error) {
      console.warn('[spice-route] my_roles failed', error);
      // A signed-in account with no readable roles is still a customer.
      setRoles(['customer']);
      return;
    }
    const mapped = (Array.isArray(data) ? data : [])
      .map((r: unknown) => ROLE_FROM_DB[String(r)])
      .filter(Boolean) as Role[];
    const unique = ROLE_PRIORITY.filter((r) => mapped.includes(r));
    setRoles(unique.length ? unique : ['customer']);
    // Land on the highest-privilege portal this account holds.
    setRoleState(unique[0] ?? 'customer');
  }, []);

  const applySession = useCallback(
    async (session: Session | null) => {
      if (!session?.user) {
        setUser(null);
        setRoles([]);
        return;
      }
      const meta = session.user.user_metadata as { full_name?: string } | undefined;
      setUser({
        id: session.user.id,
        email: session.user.email ?? null,
        name: meta?.full_name || session.user.email?.split('@')[0] || 'Guest',
      });
      await loadRoles(session);
      // Fire and forget: a device that refuses notifications still signs in.
      void registerForPush(session.user.id);
    },
    [loadRoles],
  );

  useEffect(() => {
    if (demo || !supabase) return;

    let active = true;

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      await applySession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [demo, applySession]);

  const setRole = useCallback(
    (next: Role) => {
      // Never let the UI grant a portal the account doesn't hold.
      if (!roles.includes(next)) return;
      setRoleState(next);
    },
    [roles],
  );

  const signIn = useCallback<AuthValue['signIn']>(async (email, password) => {
    if (!supabase) return { error: 'Supabase is not configured' };
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback<AuthValue['signUp']>(async (email, password, name) => {
    if (!supabase) return { error: 'Supabase is not configured' };
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    });
    return { error: error?.message ?? null };
  }, []);

  const signInWithGoogle = useCallback<AuthValue['signInWithGoogle']>(async () => {
    if (!supabase) return { error: 'Supabase is not configured' };
    try {
      // The browser tab returns to the app at this deep link.
      const redirectTo = makeRedirectUri({ scheme: 'spiceroute', path: 'auth-callback' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error || !data?.url) return { error: error?.message ?? 'Could not start Google sign-in' };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return { error: null }; // user closed the tab; not an error

      // supabase-js uses PKCE: the redirect carries a code we exchange for a session.
      const { params, errorCode } = QueryParams.getQueryParams(result.url);
      if (errorCode) return { error: errorCode };
      if (params.code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
        if (exchangeError) return { error: exchangeError.message };
      }
      // The auth listener picks up the new session and swaps the navigator.
      return { error: null };
    } catch (e) {
      return { error: String(e) };
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await unregisterPush();
    await supabase.auth.signOut();
    setUser(null);
    setRoles([]);
    setRoleState('customer');
  }, []);

  const refreshRoles = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    await loadRoles(data.session);
  }, [loadRoles]);

  const value = useMemo<AuthValue>(
    () => ({
      loading, user, roles, role, setRole, signIn, signUp,
      signInWithGoogle, googleEnabled: GOOGLE_ENABLED && !demo,
      signOut, refreshRoles, demo,
    }),
    [loading, user, roles, role, setRole, signIn, signUp, signInWithGoogle, signOut, refreshRoles, demo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
