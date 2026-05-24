'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import type { Profile } from '@/types/database';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error.message);
    return null;
  }

  if (!data) {
    // Profile might not exist yet (trigger race condition). Retry once.
    await new Promise((r) => setTimeout(r, 500));
    const { data: retry } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    return retry as Profile | null;
  }

  return data as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setUser(session?.user ?? null);

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (mounted) setProfile(profile);
      }
      if (mounted) setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;
      setUser(session?.user ?? null);

      if (session?.user) {
        (async () => {
          const profile = await fetchProfile(session.user.id);
          if (mounted) setProfile(profile);
        })();
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setUser, setProfile, setLoading]);

  return <>{children}</>;
}
