/**
 * Auth store — Supabase auth state + profile management.
 */

import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile } from '../lib/database.types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthStore {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { username?: string; display_name?: string; avatar_url?: string }) => Promise<{ error?: string }>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    if (!isSupabaseConfigured()) {
      set({ initialized: true });
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      set({ user: session.user, session });
      await get().fetchProfile();
    }
    set({ initialized: true });

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ user: session?.user ?? null, session });
      if (session?.user) {
        await get().fetchProfile();
      } else {
        set({ profile: null });
      }
    });
  },

  signInWithEmail: async (email, password) => {
    set({ loading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) return { error: error.message };
    return {};
  },

  signUpWithEmail: async (email, password, username) => {
    set({ loading: true });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    set({ loading: false });
    if (error) return { error: error.message };
    return {};
  },

  signInWithGoogle: async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          scopes: 'openid email profile',
          queryParams: { prompt: 'consent' },
          skipBrowserRedirect: true,
        },
      });
      if (error) return { error: error.message };
      if (!data.url) return { error: 'No auth URL returned' };

      // Open popup instead of redirecting
      const popup = window.open(data.url, 'google-auth', 'width=500,height=600,popup=yes');
      if (!popup) return { error: 'Popup blocked. Please allow popups for this site.' };

      // Listen for auth state change from the popup (via shared localStorage)
      return new Promise<{ error?: string }>((resolve) => {
        let resolved = false;

        // Method 1: Listen for storage events (popup writes session to localStorage)
        const handleStorage = async () => {
          if (resolved) return;
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            resolved = true;
            window.removeEventListener('storage', handleStorage);
            clearInterval(pollInterval);
            set({ user: session.user, session });
            await get().fetchProfile();
            resolve({});
          }
        };
        window.addEventListener('storage', handleStorage);

        // Method 2: Poll — check both popup closed state and session
        const pollInterval = setInterval(async () => {
          if (resolved) { clearInterval(pollInterval); return; }

          // Try refreshing the session from storage
          const { data: { session } } = await supabase.auth.refreshSession();
          if (session?.user) {
            resolved = true;
            window.removeEventListener('storage', handleStorage);
            clearInterval(pollInterval);
            set({ user: session.user, session });
            await get().fetchProfile();
            resolve({});
            return;
          }

          if (popup.closed) {
            clearInterval(pollInterval);
            window.removeEventListener('storage', handleStorage);
            if (!resolved) {
              // One last try
              const { data: { session: lastTry } } = await supabase.auth.refreshSession();
              if (lastTry?.user) {
                set({ user: lastTry.user, session: lastTry });
                await get().fetchProfile();
                resolve({});
              } else {
                resolve({ error: 'Sign in was cancelled' });
              }
            }
          }
        }, 1000);
      });
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Sign in failed' };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) return { error: 'Not signed in' };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) return { error: error.message };
    await get().fetchProfile();
    return {};
  },

  fetchProfile: async () => {
    const user = get().user;
    if (!user) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) set({ profile: data as Profile });
  },
}));
