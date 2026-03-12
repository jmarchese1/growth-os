'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '../../lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface SessionContextValue {
  user: User | null;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  loading: true,
});

export function SessionProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: User | null;
}) {
  const [user, setUser] = useState<User | null>(initialUser);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <SessionContext.Provider value={{ user, loading: false }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
