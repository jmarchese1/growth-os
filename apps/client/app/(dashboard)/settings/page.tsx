'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from '../../../components/auth/session-provider';
import { useBusiness } from '../../../components/auth/business-provider';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

type TabId = 'general' | 'hours' | 'notifications' | 'email' | 'modules' | 'team' | 'danger';

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto',
  'America/Vancouver', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney',
];

function defaultHours(): Record<string, DayHours> {
  const h: Record<string, DayHours> = {};
  for (const d of DAYS) {
    h[d] = { open: '09:00', close: '17:00', closed: d === 'Sunday' };
  }
  return h;
}

export default function SettingsPage() {
  const { user } = useSession();
  const { business, embedoUser, refresh } = useBusiness();

  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const settings = business?.settings as Record<string, unknown> | null;
  const address = business?.address as Record<string, string> | null;

  // --- General form ---
  const [form, setForm] = useState({
    name: '', phone: '', email: '', website: '', timezone: '',
    street: '', city: '', state: '', zip: '', type: '',
    description: '',
  });

  // --- Hours ---
  const [hours, setHours] = useState<Record<string, DayHours>>(defaultHours());

  // --- Notifications ---
  const [notifs, setNotifs] = useState({
    emailNewLead: true,
    emailNewBooking: true,
    emailWeeklyReport: true,
    smsNewLead: false,
    smsNewBooking: false,
  });

  // --- Email defaults ---
  const [emailDefaults, setEmailDefaults] = useState({
    senderName: '',
    replyTo: '',
    defaultStyleId: 'clean',
    defaultColor: '#4f46e5',
    defaultFont: 'system',
  });

  // --- Module toggles ---
  const [modules, setModules] = useState({
    voiceAgent: true,
    chatbot: true,
    website: true,
    qrCodes: true,
    socialMedia: false,
    campaigns: true,
    surveys: true,
    proposals: true,
  });

  // Populate all forms when business loads
  useEffect(() => {
    if (!business) return;
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
      type: business.type ?? '',
      description: (settings?.['description'] as string) ?? '',
    });

    const savedHours = settings?.['hours'] as Record<string, DayHours> | undefined;
    if (savedHours) setHours(savedHours);

    const savedNotifs = settings?.['notifications'] as Record<string, boolean> | undefined;
    if (savedNotifs) {
      setNotifs((prev) => ({ ...prev, ...savedNotifs }));
    }

    const savedEmail = settings?.['emailDefaults'] as Record<string, string> | undefined;
    if (savedEmail) {
      setEmailDefaults((prev) => ({ ...prev, ...savedEmail }));
    }

    const savedModules = settings?.['enabledTools'] as Record<string, boolean> | undefined;
    if (savedModules) {
      setModules((prev) => ({ ...prev, ...savedModules }));
    }
  }, [business, address, settings]);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const saveSettings = useCallback(async (patch: Record<string, unknown>) => {
    if (!business?.id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/businesses/${business.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        showToast('success', 'Settings saved');
        await refresh();
      } else {
        const data = await res.json();
        showToast('error', data.error ?? 'Failed to save');
      }
    } catch {
      showToast('error', 'Network error');
    } finally {
      setSaving(false);
    }
  }, [business?.id, refresh, showToast]);

  const handleSaveGeneral = async () => {
    await saveSettings({
      name: form.name || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      website: form.website || undefined,
      timezone: form.timezone || undefined,
      type: form.type || undefined,
      address: { street: form.street, city: form.city, state: form.state, zip: form.zip },
      settings: { ...settings, description: form.description },
    });
  };

  const handleSaveHours = async () => {
    await saveSettings({ settings: { ...settings, hours } });
  };

  const handleSaveNotifs = async () => {
    await saveSettings({ settings: { ...settings, notifications: notifs } });
  };

  const handleSaveEmail = async () => {
    await saveSettings({ settings: { ...settings, emailDefaults } });
  };

  const handleSaveModules = async () => {
    await saveSettings({ settings: { ...settings, enabledTools: modules } });
  };

  const oauthTokens = settings?.['oauthTokens'] as Record<string, unknown> | undefined;

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
    { id: 'hours', label: 'Business Hours', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'notifications', label: 'Notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { id: 'email', label: 'Email Defaults', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'modules', label: 'Modules', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: 'team', label: 'Team', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { id: 'danger', label: 'Danger Zone', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  ];

  const inputCls = 'w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-700 dark:text-white placeholder:dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 dark:focus:border-violet-500/40 transition-all';
  const selectCls = 'w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 dark:focus:border-violet-500/40 transition-all appearance-none';
  const labelCls = 'block text-[10px] text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1';
  const cardCls = 'bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-2xl p-6 mb-6';
  const saveBtnCls = 'px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-2';

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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your business profile, preferences, and team</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-100/80 dark:bg-white/[0.06] rounded-2xl p-1.5 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                : tab.id === 'danger'
                  ? 'text-red-400 hover:text-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/20'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/[0.04]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== GENERAL TAB ===== */}
      {activeTab === 'general' && (
        <div className="animate-fade-up">
          {/* Account */}
          <div className={cardCls}>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-white mb-4">Account</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Email</label>
                <p className="text-sm text-slate-700 dark:text-white">{user?.email ?? '--'}</p>
              </div>
              <div>
                <label className={labelCls}>User ID</label>
                <p className="text-sm text-slate-500 font-mono text-xs">{embedoUser?.id?.slice(0, 12) ?? user?.id?.slice(0, 12) ?? '--'}...</p>
              </div>
              <div>
                <label className={labelCls}>Role</label>
                <p className="text-sm text-slate-700 dark:text-white">{embedoUser?.role ?? 'Admin'}</p>
              </div>
              <div>
                <label className={labelCls}>Business Status</label>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                  business?.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>{business?.status ?? 'ONBOARDING'}</span>
              </div>
            </div>
          </div>

          {/* Business Profile */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-white">Business Profile</h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Core details about your business</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Business Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your business name" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Industry</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={selectCls}>
                  <option value="">Select industry</option>
                  <option value="RESTAURANT">Restaurant</option>
                  <option value="RETAIL">Retail</option>
                  <option value="SALON">Salon / Spa</option>
                  <option value="HEALTHCARE">Healthcare</option>
                  <option value="PROFESSIONAL">Professional Services</option>
                  <option value="FITNESS">Fitness / Gym</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input type="text" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="text" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="hello@yourbusiness.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Website</label>
                <input type="text" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://yourbusiness.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Timezone</label>
                <select value={form.timezone} onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))} className={selectCls}>
                  <option value="">Select timezone</option>
                  {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Business Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of your business..."
                  rows={3}
                  className={inputCls + ' resize-none'}
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-3">Address</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <input type="text" value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} placeholder="Street address" className={inputCls} />
                </div>
                <div>
                  <input type="text" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="City" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} placeholder="State" className={inputCls} />
                  <input type="text" value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} placeholder="ZIP" className={inputCls} />
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button onClick={handleSaveGeneral} disabled={saving} className={saveBtnCls}>
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>

          {/* Integrations summary */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-white">Integrations</h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Connected services and social accounts</p>
              </div>
              <Link href="/integrations" className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
                Manage All
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { name: 'AI Voice Agent', connected: !!business?.elevenLabsAgentId },
                { name: 'Phone Number', connected: !!business?.twilioPhoneNumber },
                { name: 'AI Chatbot', connected: !!settings?.['chatbotEnabled'] },
                { name: 'Instagram', connected: !!oauthTokens?.['instagram'] },
                { name: 'Facebook', connected: !!oauthTokens?.['facebook'] },
                { name: 'Google Business', connected: !!oauthTokens?.['google-business'] },
              ].map(({ name, connected }) => (
                <div key={name} className="flex items-center justify-between py-2.5 px-3 bg-slate-50/50 rounded-xl border border-slate-100">
                  <span className="text-sm text-slate-600">{name}</span>
                  <span className={`text-xs font-medium ${connected ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {connected ? 'Active' : 'Not connected'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== BUSINESS HOURS TAB ===== */}
      {activeTab === 'hours' && (
        <div className="animate-fade-up">
          <div className={cardCls}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white">Business Hours</h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Set your regular operating hours. These are shown on your website and used by the AI voice agent.</p>
            </div>

            <div className="space-y-3">
              {DAYS.map((day) => {
                const d = hours[day] ?? { open: '09:00', close: '17:00', closed: false };
                return (
                  <div key={day} className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all ${d.closed ? 'bg-slate-50 dark:bg-white/[0.03] border-slate-100 dark:border-white/[0.06]' : 'bg-white dark:bg-white/[0.04] border-slate-200 dark:border-white/[0.06]'}`}>
                    <div className="w-28">
                      <span className={`text-sm font-medium ${d.closed ? 'text-slate-400' : 'text-slate-700'}`}>{day}</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!d.closed}
                        onChange={() => setHours((h) => ({ ...h, [day]: { ...d, closed: !d.closed } }))}
                        className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-xs text-slate-500">{d.closed ? 'Closed' : 'Open'}</span>
                    </label>
                    {!d.closed && (
                      <div className="flex items-center gap-2 ml-auto">
                        <input
                          type="time"
                          value={d.open}
                          onChange={(e) => setHours((h) => ({ ...h, [day]: { ...d, open: e.target.value } }))}
                          className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        />
                        <span className="text-slate-400 text-xs">to</span>
                        <input
                          type="time"
                          value={d.close}
                          onChange={(e) => setHours((h) => ({ ...h, [day]: { ...d, close: e.target.value } }))}
                          className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const h: Record<string, DayHours> = {};
                    for (const d of DAYS) h[d] = { open: '09:00', close: '17:00', closed: d === 'Sunday' };
                    setHours(h);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Reset to Default
                </button>
                <button
                  onClick={() => {
                    const first = hours['Monday'];
                    if (!first) return;
                    const h: Record<string, DayHours> = {};
                    for (const d of DAYS) h[d] = { ...first };
                    setHours(h);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Copy Monday to All
                </button>
              </div>
              <button onClick={handleSaveHours} disabled={saving} className={saveBtnCls}>
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save Hours
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NOTIFICATIONS TAB ===== */}
      {activeTab === 'notifications' && (
        <div className="animate-fade-up">
          <div className={cardCls}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white">Notification Preferences</h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Choose how and when you want to be notified about activity.</p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider px-1 pt-2 pb-1">Email Notifications</p>
              {([
                { key: 'emailNewLead' as const, label: 'New lead captured', desc: 'When a new lead comes in from any channel' },
                { key: 'emailNewBooking' as const, label: 'New booking', desc: 'When a customer books an appointment' },
                { key: 'emailWeeklyReport' as const, label: 'Weekly summary', desc: 'Receive a weekly performance digest every Monday' },
              ]).map(({ key, label, desc }) => (
                <label key={key} className="flex items-center justify-between py-3 px-4 rounded-xl border border-slate-100 dark:border-white/[0.06] hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm text-slate-700 dark:text-white font-medium">{label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notifs[key]}
                      onChange={() => setNotifs((n) => ({ ...n, [key]: !n[key] }))}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-200 dark:bg-white/[0.12] rounded-full peer-checked:bg-violet-600 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
                  </div>
                </label>
              ))}

              <p className="text-[10px] text-slate-400 uppercase tracking-wider px-1 pt-4 pb-1">SMS Notifications</p>
              {([
                { key: 'smsNewLead' as const, label: 'New lead (SMS)', desc: 'Get a text when a new lead comes in' },
                { key: 'smsNewBooking' as const, label: 'New booking (SMS)', desc: 'Get a text when someone books' },
              ]).map(({ key, label, desc }) => (
                <label key={key} className="flex items-center justify-between py-3 px-4 rounded-xl border border-slate-100 dark:border-white/[0.06] hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm text-slate-700 dark:text-white font-medium">{label}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={notifs[key]}
                      onChange={() => setNotifs((n) => ({ ...n, [key]: !n[key] }))}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-6 bg-slate-200 dark:bg-white/[0.12] rounded-full peer-checked:bg-violet-600 transition-colors" />
                    <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button onClick={handleSaveNotifs} disabled={saving} className={saveBtnCls}>
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== EMAIL DEFAULTS TAB ===== */}
      {activeTab === 'email' && (
        <div className="animate-fade-up">
          <div className={cardCls}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white">Email Defaults</h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Default sender info and styling for outbound emails.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Sender Name</label>
                <input
                  type="text"
                  value={emailDefaults.senderName}
                  onChange={(e) => setEmailDefaults((d) => ({ ...d, senderName: e.target.value }))}
                  placeholder={business?.name ?? 'Your Business'}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Reply-To Address</label>
                <input
                  type="email"
                  value={emailDefaults.replyTo}
                  onChange={(e) => setEmailDefaults((d) => ({ ...d, replyTo: e.target.value }))}
                  placeholder={business?.email ?? 'hello@yourbusiness.com'}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Default Template Style</label>
                <select
                  value={emailDefaults.defaultStyleId}
                  onChange={(e) => setEmailDefaults((d) => ({ ...d, defaultStyleId: e.target.value }))}
                  className={selectCls}
                >
                  <option value="clean">Clean</option>
                  <option value="card">Card</option>
                  <option value="hero">Hero Banner</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Default Font</label>
                <select
                  value={emailDefaults.defaultFont}
                  onChange={(e) => setEmailDefaults((d) => ({ ...d, defaultFont: e.target.value }))}
                  className={selectCls}
                >
                  <option value="system">System Default</option>
                  <option value="arial">Arial</option>
                  <option value="georgia">Georgia</option>
                  <option value="verdana">Verdana</option>
                  <option value="trebuchet">Trebuchet</option>
                  <option value="courier">Courier</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Default Brand Color</label>
                <div className="flex items-center gap-3 mt-1">
                  {['#7c3aed', '#4f46e5', '#2563eb', '#0d9488', '#059669', '#e11d48', '#ea580c', '#475569', '#18181b'].map((hex) => (
                    <button
                      key={hex}
                      onClick={() => setEmailDefaults((d) => ({ ...d, defaultColor: hex }))}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${emailDefaults.defaultColor === hex ? 'border-slate-900 scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                  <input
                    type="color"
                    value={emailDefaults.defaultColor}
                    onChange={(e) => setEmailDefaults((d) => ({ ...d, defaultColor: e.target.value }))}
                    className="w-7 h-7 rounded-full cursor-pointer border-0 p-0"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button onClick={handleSaveEmail} disabled={saving} className={saveBtnCls}>
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save Email Defaults
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODULES TAB ===== */}
      {activeTab === 'modules' && (
        <div className="animate-fade-up">
          <div className={cardCls}>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-white">Enabled Modules</h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Toggle which Embedo modules are active for your business. Disabled modules are hidden from the sidebar.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { key: 'voiceAgent' as const, name: 'AI Voice Agent', desc: 'Answer calls, book reservations, capture leads', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
                { key: 'chatbot' as const, name: 'AI Chatbot', desc: 'Website widget, DMs, lead capture', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
                { key: 'website' as const, name: 'Website Builder', desc: 'AI-generated business website', icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
                { key: 'qrCodes' as const, name: 'QR Codes', desc: 'Spin wheels, surveys, discount codes', icon: 'M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z' },
                { key: 'socialMedia' as const, name: 'Social Media', desc: 'Auto-post, schedule, engagement', icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' },
                { key: 'campaigns' as const, name: 'Email Campaigns', desc: 'Cold outreach and follow-up sequences', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
                { key: 'surveys' as const, name: 'Surveys', desc: 'Customer feedback and response automation', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
                { key: 'proposals' as const, name: 'Proposals', desc: 'AI-generated business proposals', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
              ]).map(({ key, name, desc, icon }) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                    modules[key]
                      ? 'border-violet-200 dark:border-violet-500/20 bg-violet-50/30 dark:bg-violet-500/10'
                      : 'border-slate-100 dark:border-white/[0.06] bg-slate-50/30 dark:bg-white/[0.02] opacity-60'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${modules[key] ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={modules[key]}
                    onChange={() => setModules((m) => ({ ...m, [key]: !m[key] }))}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                  />
                </label>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button onClick={handleSaveModules} disabled={saving} className={saveBtnCls}>
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Save Module Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TEAM TAB ===== */}
      {activeTab === 'team' && (
        <div className="animate-fade-up">
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-700 dark:text-white">Team Members</h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Manage who has access to this business dashboard.</p>
              </div>
              <button className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
                Invite Member
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50/50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {(user?.email?.[0] ?? 'U').toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 dark:text-white font-medium">{user?.email ?? '--'}</p>
                    <p className="text-xs text-slate-400">Owner</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-600 border border-violet-200">
                  {embedoUser?.role ?? 'Admin'}
                </span>
              </div>
            </div>

            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
              <p className="text-sm text-slate-500">Team member management coming soon.</p>
              <p className="text-xs text-slate-400 mt-1">You&apos;ll be able to invite team members with different roles and permissions.</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== DANGER ZONE TAB ===== */}
      {activeTab === 'danger' && (
        <div className="animate-fade-up">
          <div className="bg-white dark:bg-white/[0.04] border-2 border-red-200 dark:border-red-500/20 rounded-2xl p-6">
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Danger Zone
              </h3>
              <p className="text-xs text-slate-400 mt-1">Irreversible actions that affect your entire account.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-red-100 bg-red-50/30">
                <div>
                  <p className="text-sm text-slate-700 dark:text-white font-medium">Reset Onboarding</p>
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Show the setup wizard again on your next visit</p>
                </div>
                <button
                  onClick={async () => {
                    if (!business?.id) return;
                    const confirmed = window.confirm('Reset onboarding? The setup wizard will appear again on your next visit.');
                    if (!confirmed) return;
                    await saveSettings({ settings: { ...settings, onboardingComplete: false } });
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-red-100 bg-red-50/30">
                <div>
                  <p className="text-sm text-slate-700 dark:text-white font-medium">Clear All Contacts</p>
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Remove all contacts from your business. Cannot be undone.</p>
                </div>
                <button
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors opacity-50 cursor-not-allowed"
                  disabled
                >
                  Coming Soon
                </button>
              </div>

              <div className="flex items-center justify-between py-3 px-4 rounded-xl border border-red-100 bg-red-50/30">
                <div>
                  <p className="text-sm text-slate-700 dark:text-white font-medium">Delete Business</p>
                  <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5">Permanently delete this business and all associated data.</p>
                </div>
                <button
                  className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors opacity-50 cursor-not-allowed"
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
