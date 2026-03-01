import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '../supabase/client';
import { AuthContext } from './AuthContext';
import type { AuthState } from './AuthContext';
import type { Session } from '@supabase/supabase-js';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const supabase = getSupabase();
    if (!supabase) {
      const timeoutId = window.setTimeout(() => {
        if (!mounted) return;
        setLoading(false);
      }, 0);
      return () => {
        mounted = false;
        window.clearTimeout(timeoutId);
      };
    }

    const syncProfile = (nextSession: Session | null) => {
      if (!nextSession?.user) return;
      const fullName =
        ((nextSession.user.user_metadata?.full_name as string | undefined)?.trim())
        || ((nextSession.user.user_metadata?.name as string | undefined)?.trim())
        || ((nextSession.user.email as string | undefined)?.split('@')[0] ?? 'Me');
      const avatarUrl = (nextSession.user.user_metadata?.avatar_url as string | undefined) ?? null;
      void (async () => {
        try {
          await supabase.from('profiles').upsert(
            {
              id: nextSession.user.id,
              full_name: fullName,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
        } catch {
          // Ignore profile sync failures; auth/session flow should still continue.
        }
      })();
    };

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      syncProfile(data.session ?? null);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      syncProfile(nextSession);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(() => ({
    session,
    user: session?.user ?? null,
    loading,
  }), [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
