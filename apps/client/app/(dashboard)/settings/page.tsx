'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from '../../../components/auth/session-provider';
import { useBusiness } from '../../../components/auth/business-provider';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export default function SettingsPage() {
  const { user } = useSession();
  const { business, embedoUser, refresh } = useBusiness();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const address = business?.address as Record<string, string> | null;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    website: '',
    timezone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
  });

  // Populate form when business data loads
  useEffect(() => {
    if (business) {
      setForm({
        name: business.name ?? '',
        phone: business.phone ?? '',
        email: business.email ?? '',
        website: business.website ?? '',
        timezone: business.timezone ?? '',
        street: (address?.['street'] as string) ?? '',
        city: (address?.['city'] as string) ?? '',
        state: (address?.['state'] as string) ?? '',
        zip: (address?.['zip'] as string) ?? '',
      });
    }
  }, [business, address]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/me/business?supabaseId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          website: form.website || undefined,
          timezone: form.timezone || undefined,
          address: {
            street: form.street,
            city: form.city,
            state: form.state,
            zip: form.zip,
          },
        }),
      });

      if (res.ok) {
        setToast({ type: 'success', message: 'Business profile updated' });
        setEditing(false);
        await refresh();
      } else {
        const data = await res.json();
        setToast({ type: 'error', message: data.error ?? 'Failed to save' });
      }
    } catch {
      setToast({ type: 'error', message: 'Network error' });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const oauthTokens = (business?.settings as Record<string, unknown> | null)?.['oauthTokens'] as Record<string, unknown> | undefined;

  const serviceStatuses = [
    { name: 'AI Voice Agent', status: business?.elevenLabsAgentId ? 'Active' : 'Not deployed' },
    { name: 'Dedicated Phone Number', status: business?.twilioPhoneNumber ?? 'Not provisioned' },
    { name: 'AI Chatbot', status: (business?.settings as Record<string, unknown> | null)?.['chatbotEnabled'] ? 'Active' : 'Not deployed' },
    { name: 'Email Delivery', status: 'Not configured' },
    { name: 'Booking Calendar', status: 'Not configured' },
    { name: 'Business Website', status: business?.status === 'ACTIVE' ? 'Live' : 'Not deployed' },
  ];

  const socialStatuses = [
    { name: 'Instagram', status: oauthTokens?.['instagram'] ? 'Connected' : 'Not connected' },
    { name: 'Facebook', status: oauthTokens?.['facebook'] ? 'Connected' : 'Not connected' },
    { name: 'Google Business Profile', status: oauthTokens?.['google-business'] ? 'Connected' : 'Not connected' },
    { name: 'TikTok', status: oauthTokens?.['tiktok'] ? 'Connected' : 'Not connected' },
  ];

  return (
    <div className="p-8 animate-fade-up">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 text-sm font-medium ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your business profile and team</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Account</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Email</label>
            <p className="text-sm text-slate-700">{user?.email ?? '--'}</p>
          </div>
          <div>
            <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">User ID</label>
            <p className="text-sm text-slate-500 font-mono text-xs">{embedoUser?.id?.slice(0, 12) ?? user?.id?.slice(0, 12) ?? '--'}...</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Business Profile</h3>
          {business && (
            editing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-violet-600 border border-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {saving && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors"
              >
                Edit
              </button>
            )
          )}
        </div>

        {!business ? (
          <p className="text-sm text-slate-400">No business linked to your account yet. Contact your Embedo administrator.</p>
        ) : editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Business Name', key: 'name', placeholder: 'Your business name' },
              { label: 'Industry', key: null, value: business.type },
              { label: 'Phone', key: 'phone', placeholder: '+1 (555) 000-0000' },
              { label: 'Email', key: 'email', placeholder: 'hello@yourbusiness.com' },
              { label: 'Website', key: 'website', placeholder: 'https://yourbusiness.com' },
              { label: 'Timezone', key: 'timezone', placeholder: 'America/New_York' },
              { label: 'Street', key: 'street', placeholder: '123 Main St' },
              { label: 'City', key: 'city', placeholder: 'New York' },
              { label: 'State', key: 'state', placeholder: 'NY' },
              { label: 'ZIP', key: 'zip', placeholder: '10001' },
            ].map(({ label, key, placeholder, value }) => (
              <div key={label}>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">{label}</label>
                {key ? (
                  <input
                    type="text"
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 transition-all"
                  />
                ) : (
                  <p className="text-sm text-slate-500 py-2">{value ?? '--'}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Business Name', value: business.name },
              { label: 'Industry', value: business.type },
              { label: 'Phone', value: business.phone },
              { label: 'Email', value: business.email },
              { label: 'Website', value: business.website },
              { label: 'Timezone', value: business.timezone },
              { label: 'Address', value: address ? [address['street'], address['city'], address['state'], address['zip']].filter(Boolean).join(', ') : null },
              { label: 'Status', value: business.status },
            ].map(({ label, value }) => (
              <div key={label}>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">{label}</label>
                <p className="text-sm text-slate-700">{value ?? '--'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Integrations</h3>
            <p className="text-xs text-slate-400 mt-0.5">Services and connected social accounts</p>
          </div>
          <Link href="/integrations"
            className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
            Manage All
          </Link>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider px-1 pt-1 pb-2">Embedo Services</p>
          {serviceStatuses.map(({ name, status }) => (
            <Link key={name} href="/integrations"
              className="flex items-center justify-between py-2.5 px-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg transition-colors group">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">{name}</span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-violet-50 text-violet-500 border border-violet-100">Managed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${status === 'Active' || status === 'Live' || (status && !status.startsWith('Not')) ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>{status}</span>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 transition-colors">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        <div className="space-y-1 mt-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider px-1 pt-1 pb-2">Social Accounts</p>
          {socialStatuses.map(({ name, status }) => (
            <Link key={name} href="/integrations"
              className="flex items-center justify-between py-2.5 px-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg transition-colors group">
              <span className="text-sm text-slate-600">{name}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${status === 'Connected' ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>{status}</span>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-300 group-hover:text-violet-500 transition-colors">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Team Members</h3>
          <button className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
            Invite Member
          </button>
        </div>
        <div className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {(user?.email?.[0] ?? 'U').toUpperCase()}
          </div>
          <div>
            <p className="text-sm text-slate-700">{user?.email ?? '--'}</p>
            <p className="text-[10px] text-slate-400">{embedoUser?.role ?? 'Admin'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
