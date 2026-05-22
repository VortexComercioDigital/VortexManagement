'use client';

import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Profile, Role } from '@/types/database';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  isAdmin: () => boolean;
  isVendedor: () => boolean;
  isDev: () => boolean;
  hasRole: (role: Role) => boolean;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  isAdmin: () => get().profile?.role === 'admin',
  isVendedor: () => get().profile?.role === 'vendedor',
  isDev: () => get().profile?.role === 'dev',
  hasRole: (role) => get().profile?.role === role,
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
}));
