'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession } from './session-provider';

interface BusinessCounts {
  contacts: number;
  callLogs: number;
  chatSessions: number;
  appointments: number;
  leads: number;
}

interface BusinessData {
  id: string;
  name: string;
  slug: string;
  type: string;
  status: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: Record<string, string> | null;
  timezone: string;
  elevenLabsAgentId: string | null;
  twilioPhoneNumber: string | null;
  instagramPageId: string | null;
  facebookPageId: string | null;
  settings: Record<string, unknown> | null;
  counts: BusinessCounts;
  createdAt: string;
}

interface EmbedoUser {
  id: string;
  supabaseId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  businessId: string | null;
}

interface MatchedBusiness {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: Record<string, string> | null;
  status: string;
}

interface BusinessContextValue {
  business: BusinessData | null;
  embedoUser: EmbedoUser | null;
  loading: boolean;
  needsOnboarding: boolean;
  matchedBusiness: MatchedBusiness | null;
  refresh: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue>({
  business: null,
  embedoUser: null,
  loading: true,
  needsOnboarding: false,
  matchedBusiness: null,
  refresh: async () => {},
});

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useSession();
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [embedoUser, setEmbedoUser] = useState<EmbedoUser | null>(null);
  const [matchedBusiness, setMatchedBusiness] = useState<MatchedBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const fetchMe = useCallback(async () => {
    if (!user?.id) {
      setBusiness(null);
      setEmbedoUser(null);
      setNeedsOnboarding(false);
      setMatchedBusiness(null);
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({ supabaseId: user.id });
      if (user.email) params.set('email', user.email);

      const res = await fetch(`${API_BASE}/me?${params.toString()}`);
      if (!res.ok) {
        console.error('Failed to fetch /me:', res.status);
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setEmbedoUser(data.user);
        setBusiness(data.business);

        // If user has no business, check for existing profile match
        if (!data.business && !data.user?.businessId) {
          setNeedsOnboarding(true);
          try {
            const matchRes = await fetch(`${API_BASE}/me/match-business?supabaseId=${user.id}`);
            if (matchRes.ok) {
              const matchData = await matchRes.json();
              if (matchData.success && matchData.match) {
                setMatchedBusiness(matchData.match);
              }
            }
          } catch {
            // Non-critical — continue without match
          }
        } else {
          setNeedsOnboarding(false);
          setMatchedBusiness(null);
        }
      }
    } catch (err) {
      console.error('Error fetching /me:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.email]);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  return (
    <BusinessContext.Provider value={{ business, embedoUser, loading, needsOnboarding, matchedBusiness, refresh: fetchMe }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  return useContext(BusinessContext);
}
