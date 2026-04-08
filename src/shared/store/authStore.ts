/**
 * Auth store — Supabase auth state + profile management.
 */

import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Profile } from '../lib/database.types';
import type { User, Session } from '@supabase/supabase-js';

let initializePromise: Promise<void> | null = null;
let authListenerRegistered = false;

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
    if (get().initialized) return;
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
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

      if (!authListenerRegistered) {
        supabase.auth.onAuthStateChange(async (_event, nextSession) => {
          set({ user: nextSession?.user ?? null, session: nextSession });
          if (nextSession?.user) {
            await get().fetchProfile();
          } else {
            set({ profile: null });
          }
        });
        authListenerRegistered = true;
      }
    })();

    if (!isSupabaseConfigured()) {
      return initializePromise;
    }
    return initializePromise;
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
    // Use standard redirect flow — popup approach doesn't work due to
    // cross-origin redirect through Google/Supabase nullifying window.opener.
    // The page redirects to Google, then back. The onAuthStateChange listener
    // in initialize() picks up the session automatically on return.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return {};
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
