/**
 * Supabase client.
 *
 * Credentials come from the environment (`.env` → `EXPO_PUBLIC_*`, inlined at
 * build time). When they are absent the app runs entirely against the demo
 * dataset — see `src/data/store.tsx`. That means a fresh clone runs with no
 * setup, and pointing it at a real project is a credentials change rather than
 * a code change.
 */
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** True when real credentials are configured. */
export const isSupabaseConfigured = Boolean(url && anonKey);

const isWeb = Platform.OS === 'web';

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        // On web the browser keeps the session; native uses AsyncStorage.
        storage: isWeb ? undefined : AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        // Web returns from Google OAuth with a code in the URL to exchange;
        // native has no URL to parse and exchanges the code by hand.
        detectSessionInUrl: isWeb,
      },
    })
  : null;

/** Narrowing helper for call sites that require a live client. */
export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return supabase;
}
