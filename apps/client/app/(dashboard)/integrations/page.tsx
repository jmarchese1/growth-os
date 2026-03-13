'use client';

import { useState } from 'react';
import Link from 'next/link';

type IntegrationStatus = 'connected' | 'not_connected' | 'error';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'social' | 'voice' | 'booking' | 'email' | 'website' | 'analytics';
  status: IntegrationStatus;
  icon: React.ReactNode;
  color: string;
  requiredBy: string[];
  fields: { key: string; label: string; placeholder: string; type?: string }[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Connect your Instagram Business account for content publishing, DM automation, and engagement tracking.',
    category: 'social',
    status: 'not_connected',
    color: 'rose',
    requiredBy: ['Social Media', 'Chatbot'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'Instagram Graph API access token', type: 'password' },
      { key: 'businessAccountId', label: 'Business Account ID', placeholder: 'Your Instagram Business Account ID' },
    ],
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Connect your Facebook Page for content publishing, Messenger automation, and audience insights.',
    category: 'social',
    status: 'not_connected',
    color: 'sky',
    requiredBy: ['Social Media', 'Chatbot'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    fields: [
      { key: 'pageAccessToken', label: 'Page Access Token', placeholder: 'Facebook Page access token', type: 'password' },
      { key: 'pageId', label: 'Page ID', placeholder: 'Your Facebook Page ID' },
    ],
  },
  {
    id: 'google-business',
    name: 'Google My Business',
    description: 'Connect your Google Business Profile for reviews management, posts, and local SEO insights.',
    category: 'social',
    status: 'not_connected',
    color: 'emerald',
    requiredBy: ['Social Media'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
    fields: [
      { key: 'clientId', label: 'OAuth Client ID', placeholder: 'Google OAuth Client ID' },
      { key: 'clientSecret', label: 'OAuth Client Secret', placeholder: 'Google OAuth Client Secret', type: 'password' },
    ],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    description: 'Connect your TikTok Business account for video publishing and analytics.',
    category: 'social',
    status: 'not_connected',
    color: 'slate',
    requiredBy: ['Social Media'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.82a4.84 4.84 0 01-1-.13z" />
      </svg>
    ),
    fields: [
      { key: 'accessToken', label: 'Access Token', placeholder: 'TikTok API access token', type: 'password' },
    ],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'Powers your AI voice agent. Required for inbound call handling, reservations, and voice-based lead capture.',
    category: 'voice',
    status: 'not_connected',
    color: 'violet',
    requiredBy: ['Voice Agent'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M7 4a1 1 0 012 0v16a1 1 0 01-2 0V4zm8 0a1 1 0 012 0v16a1 1 0 01-2 0V4z" />
      </svg>
    ),
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Your ElevenLabs API key', type: 'password' },
      { key: 'voiceId', label: 'Voice ID', placeholder: 'Preferred voice model ID (optional)' },
    ],
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Phone number provisioning for voice calls and SMS. Powers inbound routing and outbound notifications.',
    category: 'voice',
    status: 'not_connected',
    color: 'rose',
    requiredBy: ['Voice Agent', 'Surveys', 'Contacts & Leads'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 20.4c-4.636 0-8.4-3.764-8.4-8.4S7.364 3.6 12 3.6s8.4 3.764 8.4 8.4-3.764 8.4-8.4 8.4zm3.6-11.4a1.8 1.8 0 11-3.6 0 1.8 1.8 0 013.6 0zm0 6a1.8 1.8 0 11-3.6 0 1.8 1.8 0 013.6 0zm-6-6a1.8 1.8 0 11-3.6 0 1.8 1.8 0 013.6 0zm0 6a1.8 1.8 0 11-3.6 0 1.8 1.8 0 013.6 0z" />
      </svg>
    ),
    fields: [
      { key: 'accountSid', label: 'Account SID', placeholder: 'Twilio Account SID' },
      { key: 'authToken', label: 'Auth Token', placeholder: 'Twilio Auth Token', type: 'password' },
      { key: 'phoneNumber', label: 'Phone Number', placeholder: '+1XXXXXXXXXX' },
    ],
  },
  {
    id: 'calcom',
    name: 'Cal.com',
    description: 'Booking calendar integration. Enables appointment scheduling from voice agent, chatbot, and website.',
    category: 'booking',
    status: 'not_connected',
    color: 'amber',
    requiredBy: ['Voice Agent', 'Chatbot', 'Website'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
      </svg>
    ),
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Cal.com API key', type: 'password' },
      { key: 'eventTypeId', label: 'Event Type ID', placeholder: 'Default event type for bookings' },
    ],
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Transactional and marketing email delivery. Powers survey emails, lead sequences, and proposal delivery.',
    category: 'email',
    status: 'not_connected',
    color: 'sky',
    requiredBy: ['Surveys', 'Contacts & Leads', 'Proposals'],
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
      </svg>
    ),
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'SendGrid API key', type: 'password' },
      { key: 'senderEmail', label: 'Sender Email', placeholder: 'noreply@yourbusiness.com' },
      { key: 'senderName', label: 'Sender Name', placeholder: 'Your Business Name' },
    ],
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Auto-deploy your AI-generated business website. Each site gets its own Vercel project with a custom domain.',
    category: 'website',
    status: 'not_connected',
    color: 'slate',
    requiredBy: ['Website'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 1L24 22H0L12 1z" />
      </svg>
    ),
    fields: [
      { key: 'apiToken', label: 'API Token', placeholder: 'Vercel API token', type: 'password' },
      { key: 'teamId', label: 'Team ID', placeholder: 'Vercel team ID (optional)' },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'AI engine for chatbot conversations, social media content generation, and proposal writing.',
    category: 'analytics',
    status: 'not_connected',
    color: 'amber',
    requiredBy: ['Chatbot', 'Social Media', 'Proposals'],
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M13.827 3.52l5.51 16.96H24L18.166 3.52h-4.339zm-9.166 0L10.171 20.48H5.665L0 3.52h4.661zm4.661 0h4.506L8.812 20.48H4.661l4.661-16.96z" />
      </svg>
    ),
    fields: [
      { key: 'apiKey', label: 'API Key', placeholder: 'Anthropic API key (sk-ant-...)', type: 'password' },
    ],
  },
];

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'social', label: 'Social' },
  { key: 'voice', label: 'Voice & Phone' },
  { key: 'booking', label: 'Booking' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'analytics', label: 'AI & Analytics' },
];

function StatusBadge({ status }: { status: IntegrationStatus }) {
  const styles = {
    connected: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    not_connected: 'bg-slate-50 text-slate-500 border-slate-200',
    error: 'bg-red-50 text-red-600 border-red-200',
  };
  const labels = {
    connected: 'Connected',
    not_connected: 'Not connected',
    error: 'Error',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${styles[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'connected' ? 'bg-emerald-500' : status === 'error' ? 'bg-red-500' : 'bg-slate-300'
      }`} />
      {labels[status]}
    </span>
  );
}

function IntegrationCard({ integration, onConfigure }: { integration: Integration; onConfigure: (id: string) => void }) {
  const colorMap: Record<string, string> = {
    rose: 'bg-rose-50 text-rose-600 border-rose-200/60',
    sky: 'bg-sky-50 text-sky-600 border-sky-200/60',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
    violet: 'bg-violet-50 text-violet-600 border-violet-200/60',
    amber: 'bg-amber-50 text-amber-600 border-amber-200/60',
    slate: 'bg-slate-100 text-slate-600 border-slate-200/60',
  };
  const iconBg = colorMap[integration.color] ?? colorMap.slate;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col transition-all hover:shadow-sm hover:border-slate-300">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${iconBg}`}>
          {integration.icon}
        </div>
        <StatusBadge status={integration.status} />
      </div>

      <h3 className="text-sm font-semibold text-slate-900 mb-1">{integration.name}</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-3 flex-1">{integration.description}</p>

      <div className="mb-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">Required by</p>
        <div className="flex flex-wrap gap-1">
          {integration.requiredBy.map((mod) => (
            <span key={mod} className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-600 border border-violet-100">
              {mod}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={() => onConfigure(integration.id)}
        className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
          integration.status === 'connected'
            ? 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
            : 'bg-violet-600 text-white hover:bg-violet-700'
        }`}
      >
        {integration.status === 'connected' ? 'Manage' : 'Connect'}
      </button>
    </div>
  );
}

function ConfigModal({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // TODO: POST to /api/integrations/:id with values
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg animate-fade-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Connect {integration.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter your credentials to enable this integration</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {integration.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">{field.label}</label>
              <input
                type={field.type ?? 'text'}
                placeholder={field.placeholder}
                value={values[field.key] ?? ''}
                onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                className="w-full px-3 py-2.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-colors"
              />
            </div>
          ))}

          <div className="bg-amber-50 border border-amber-200/60 rounded-lg px-4 py-3">
            <div className="flex gap-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-amber-800 leading-relaxed">
                Credentials are encrypted and stored securely. They are only used to connect to {integration.name} on your behalf.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 text-xs font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
            {saving ? 'Connecting...' : 'Save & Connect'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [filter, setFilter] = useState('all');
  const [configuring, setConfiguring] = useState<string | null>(null);

  const filtered = filter === 'all'
    ? INTEGRATIONS
    : INTEGRATIONS.filter((i) => i.category === filter);

  const connectedCount = INTEGRATIONS.filter((i) => i.status === 'connected').length;
  const configuringIntegration = INTEGRATIONS.find((i) => i.id === configuring);

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">Connect your accounts to power Embedo AI modules</p>
      </div>

      {/* Status Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-200/60 flex items-center justify-center">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-600">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{connectedCount} of {INTEGRATIONS.length} connected</p>
                <p className="text-xs text-slate-500">Connect all integrations to unlock every AI module</p>
              </div>
            </div>
          </div>
          <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
              style={{ width: `${(connectedCount / INTEGRATIONS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              filter === cat.key
                ? 'bg-violet-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConfigure={setConfiguring}
          />
        ))}
      </div>

      {/* Config Modal */}
      {configuringIntegration && (
        <ConfigModal
          integration={configuringIntegration}
          onClose={() => setConfiguring(null)}
        />
      )}
    </div>
  );
}
