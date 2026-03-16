'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useBusiness } from '../../../components/auth/business-provider';

/* ──────────────────────────────────────────────
   Types
   ────────────────────────────────────────────── */

type ServiceStatus = 'active' | 'inactive' | 'provisioning' | 'error';
type OAuthStatus = 'connected' | 'not_connected' | 'expired';

interface ManagedService {
  kind: 'managed';
  id: string;
  name: string;
  description: string;
  status: ServiceStatus;
  statusLabel: string;
  icon: React.ReactNode;
  color: string;
  powersModules: string[];
  detail?: string;
}

interface SocialAccount {
  kind: 'oauth';
  id: string;
  name: string;
  description: string;
  status: OAuthStatus;
  icon: React.ReactNode;
  color: string;
  powersModules: string[];
  accountName?: string;
}

/* ──────────────────────────────────────────────
   Managed Services (Embedo provisions these)
   ────────────────────────────────────────────── */

const MANAGED_SERVICES: ManagedService[] = [
  {
    kind: 'managed',
    id: 'voice-agent',
    name: 'AI Voice Agent',
    description: 'AI-powered phone receptionist that handles inbound calls, takes reservations, captures leads, and answers FAQs.',
    status: 'inactive',
    statusLabel: 'Not deployed',
    color: 'violet',
    powersModules: ['Voice Agent'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    kind: 'managed',
    id: 'phone-number',
    name: 'Dedicated Phone Number',
    description: 'Your own business phone number for inbound calls and outbound SMS notifications.',
    status: 'inactive',
    statusLabel: 'Not provisioned',
    color: 'rose',
    powersModules: ['Voice Agent', 'Surveys', 'Contacts & Leads'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
      </svg>
    ),
  },
  {
    kind: 'managed',
    id: 'ai-chatbot',
    name: 'AI Chatbot',
    description: 'Intelligent chat assistant for your website, Instagram DMs, and Facebook Messenger. Captures leads and books appointments.',
    status: 'inactive',
    statusLabel: 'Not deployed',
    color: 'sky',
    powersModules: ['Chatbot'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    kind: 'managed',
    id: 'email-delivery',
    name: 'Email Delivery',
    description: 'Automated email sending for surveys, lead follow-ups, proposals, and notifications. Sent from your business domain.',
    status: 'inactive',
    statusLabel: 'Not configured',
    color: 'emerald',
    powersModules: ['Surveys', 'Contacts & Leads', 'Proposals'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
      </svg>
    ),
  },
  {
    kind: 'managed',
    id: 'booking-calendar',
    name: 'Booking Calendar',
    description: 'Online appointment scheduling embedded in your website, voice agent, and chatbot. Customers book directly.',
    status: 'inactive',
    statusLabel: 'Not configured',
    color: 'amber',
    powersModules: ['Voice Agent', 'Chatbot', 'Website'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    kind: 'managed',
    id: 'business-website',
    name: 'Business Website',
    description: 'AI-generated website with your branding, menu, gallery, testimonials, and booking widget. Auto-deployed with a custom domain.',
    status: 'inactive',
    statusLabel: 'Not deployed',
    color: 'slate',
    powersModules: ['Website'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4z" clipRule="evenodd" />
      </svg>
    ),
  },
];

/* ──────────────────────────────────────────────
   Social Accounts (client connects via OAuth)
   ────────────────────────────────────────────── */

const SOCIAL_ACCOUNTS: SocialAccount[] = [
  {
    kind: 'oauth',
    id: 'instagram',
    name: 'Instagram',
    description: 'Content publishing, story scheduling, DM automation, and engagement analytics.',
    status: 'not_connected',
    color: 'rose',
    powersModules: ['Social Media', 'Chatbot'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    kind: 'oauth',
    id: 'facebook',
    name: 'Facebook',
    description: 'Page posting, Messenger bot integration, audience insights, and ad analytics.',
    status: 'not_connected',
    color: 'sky',
    powersModules: ['Social Media', 'Chatbot'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    kind: 'oauth',
    id: 'google-business',
    name: 'Google Business Profile',
    description: 'Review management, local SEO posts, business info sync, and search analytics.',
    status: 'not_connected',
    color: 'emerald',
    powersModules: ['Social Media'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    kind: 'oauth',
    id: 'tiktok',
    name: 'TikTok',
    description: 'Video publishing, trend analytics, and audience growth tracking.',
    status: 'not_connected',
    color: 'slate',
    powersModules: ['Social Media'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.82a4.84 4.84 0 01-1-.13z" />
      </svg>
    ),
  },
];

/* ──────────────────────────────────────────────
   Components
   ────────────────────────────────────────────── */

function ServiceStatusBadge({ status, label }: { status: ServiceStatus; label: string }) {
  const styles: Record<ServiceStatus, string> = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    inactive: 'bg-slate-50 text-slate-500 border-slate-200',
    provisioning: 'bg-amber-50 text-amber-700 border-amber-200',
    error: 'bg-red-50 text-red-600 border-red-200',
  };
  const dots: Record<ServiceStatus, string> = {
    active: 'bg-emerald-500',
    inactive: 'bg-slate-300',
    provisioning: 'bg-amber-500 animate-pulse',
    error: 'bg-red-500',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`} />
      {label}
    </span>
  );
}

function OAuthStatusBadge({ status }: { status: OAuthStatus }) {
  const config: Record<OAuthStatus, { style: string; dot: string; label: string }> = {
    connected: { style: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Connected' },
    not_connected: { style: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-300', label: 'Not connected' },
    expired: { style: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Token expired' },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${c.style}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function ManagedServiceCard({ service }: { service: ManagedService }) {
  const colorMap: Record<string, string> = {
    rose: 'bg-rose-50 text-rose-600 border-rose-200/60',
    sky: 'bg-sky-50 text-sky-600 border-sky-200/60',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
    violet: 'bg-violet-50 text-violet-600 border-violet-200/60',
    amber: 'bg-amber-50 text-amber-600 border-amber-200/60',
    slate: 'bg-slate-100 text-slate-600 border-slate-200/60',
  };
  const iconBg = colorMap[service.color] ?? colorMap.slate;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col transition-all hover:shadow-sm hover:border-slate-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${iconBg}`}>
          {service.icon}
        </div>
        <ServiceStatusBadge status={service.status} label={service.statusLabel} />
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-1">{service.name}</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-3 flex-1">{service.description}</p>

      <div className="mb-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Powers</p>
        <div className="flex flex-wrap gap-1">
          {service.powersModules.map((mod) => (
            <span key={mod} className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-100">
              {mod}
            </span>
          ))}
        </div>
      </div>

      {service.detail && (
        <div className="bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-2 mb-3">
          <p className="text-xs text-slate-600 font-mono">{service.detail}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-slate-400 mt-auto pt-2 border-t border-slate-100">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-400">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        Managed by Embedo
      </div>
    </div>
  );
}

function SocialAccountCard({ account, onConnect }: { account: SocialAccount; onConnect: (id: string) => void }) {
  const colorMap: Record<string, string> = {
    rose: 'bg-rose-50 text-rose-600 border-rose-200/60',
    sky: 'bg-sky-50 text-sky-600 border-sky-200/60',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
    slate: 'bg-slate-100 text-slate-600 border-slate-200/60',
  };
  const iconBg = colorMap[account.color] ?? colorMap.slate;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col transition-all hover:shadow-sm hover:border-slate-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${iconBg}`}>
          {account.icon}
        </div>
        <OAuthStatusBadge status={account.status} />
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-1">{account.name}</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-3 flex-1">{account.description}</p>

      {account.accountName && (
        <div className="bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-2 mb-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Account</p>
          <p className="text-xs text-slate-700 font-medium">{account.accountName}</p>
        </div>
      )}

      <div className="mb-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Powers</p>
        <div className="flex flex-wrap gap-1">
          {account.powersModules.map((mod) => (
            <span key={mod} className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-100">
              {mod}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => onConnect(account.id)}
        className={`w-full py-2.5 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
          account.status === 'connected'
            ? 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            : account.status === 'expired'
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-violet-600 text-white hover:bg-violet-700'
        }`}
      >
        {account.status === 'connected' ? (
          <>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Manage
          </>
        ) : account.status === 'expired' ? (
          <>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Reconnect
          </>
        ) : (
          <>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Connect with {account.name}
          </>
        )}
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Page
   ────────────────────────────────────────────── */

export default function IntegrationsPage() {
  const searchParams = useSearchParams();
  const { business } = useBusiness();
  const [_connecting, setConnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) {
      setToast({ type: 'success', message: `${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully!` });
    } else if (error) {
      setToast({ type: 'error', message: error === 'access_denied' ? 'Connection was cancelled.' : `Connection failed: ${error}` });
    }
    if (connected || error) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleOAuthConnect = (accountId: string) => {
    setConnecting(accountId);
    const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';
    const businessId = business?.id ?? '';
    window.location.href = `${apiBase}/auth/${accountId}/authorize?businessId=${businessId}`;
  };

  // Derive live statuses from business record
  const oauthTokens = (business?.settings as Record<string, unknown> | null)?.['oauthTokens'] as Record<string, unknown> | undefined;

  const liveServices: ManagedService[] = useMemo(() => {
    return MANAGED_SERVICES.map((s) => {
      if (!business) return s;
      switch (s.id) {
        case 'voice-agent':
          return business.elevenLabsAgentId
            ? { ...s, status: 'active' as const, statusLabel: 'Active' }
            : s;
        case 'phone-number':
          return business.twilioPhoneNumber
            ? { ...s, status: 'active' as const, statusLabel: business.twilioPhoneNumber, detail: business.twilioPhoneNumber }
            : s;
        case 'ai-chatbot':
          return (business.settings as Record<string, unknown> | null)?.['chatbotEnabled']
            ? { ...s, status: 'active' as const, statusLabel: 'Active' }
            : s;
        case 'booking-calendar':
          return (business as unknown as Record<string, unknown>)['calendlyUri']
            ? { ...s, status: 'active' as const, statusLabel: 'Configured' }
            : s;
        case 'business-website':
          return business.status === 'ACTIVE'
            ? { ...s, status: 'active' as const, statusLabel: 'Live' }
            : s;
        default:
          return s;
      }
    });
  }, [business]);

  const liveSocials: SocialAccount[] = useMemo(() => {
    return SOCIAL_ACCOUNTS.map((a) => {
      if (!oauthTokens) return a;
      const token = oauthTokens[a.id] as Record<string, unknown> | undefined;
      if (token?.accessToken) {
        return { ...a, status: 'connected' as const };
      }
      return a;
    });
  }, [oauthTokens]);

  const totalServices = liveServices.length + liveSocials.length;
  const activeCount =
    liveServices.filter((s) => s.status === 'active').length +
    liveSocials.filter((s) => s.status === 'connected').length;

  return (
    <div className="p-8 animate-fade-up">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 text-sm font-medium transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.type === 'success' ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-500"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">Your AI services and connected accounts</p>
      </div>

      {/* Status Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200/60 flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-600">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{activeCount} of {totalServices} active</p>
              <p className="text-xs text-slate-500">Services and connected accounts</p>
            </div>
          </div>
          <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
              style={{ width: `${(activeCount / totalServices) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Managed Services */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-base font-semibold text-slate-900">Embedo Services</h2>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-100">
            Fully managed
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          These services are provisioned and managed by Embedo. No setup required — they activate automatically when your account is configured.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveServices.map((service) => (
            <ManagedServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>

      {/* Social Accounts */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-base font-semibold text-slate-900">Social Accounts</h2>
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-50 text-sky-600 border border-sky-100">
            You connect
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Connect your social media accounts to enable AI content publishing, DM automation, and engagement tracking. You&apos;ll be redirected to sign in with each platform.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {liveSocials.map((account) => (
            <SocialAccountCard
              key={account.id}
              account={account}
              onConnect={handleOAuthConnect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
