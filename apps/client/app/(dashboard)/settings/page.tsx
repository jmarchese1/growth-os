'use client';

import { useSession } from '../../../components/auth/session-provider';

export default function SettingsPage() {
  const { user } = useSession();

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your business profile and integrations</p>
      </div>

      {/* Account Info */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Account</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1">Email</label>
              <p className="text-sm text-slate-300">{user?.email ?? '--'}</p>
            </div>
            <div>
              <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1">User ID</label>
              <p className="text-sm text-slate-500 font-mono text-xs">{user?.id?.slice(0, 12) ?? '--'}...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Business Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Business Name', value: '--' },
            { label: 'Industry', value: '--' },
            { label: 'Phone', value: '--' },
            { label: 'Email', value: '--' },
            { label: 'Address', value: '--' },
            { label: 'Timezone', value: '--' },
          ].map(({ label, value }) => (
            <div key={label}>
              <label className="block text-[10px] text-slate-600 uppercase tracking-wider mb-1">{label}</label>
              <p className="text-sm text-slate-500">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Integrations</h3>
        <div className="space-y-3">
          {[
            { name: 'Voice Agent (ElevenLabs)', status: 'Not configured' },
            { name: 'Phone Number (Twilio)', status: 'Not configured' },
            { name: 'Instagram', status: 'Not connected' },
            { name: 'Facebook', status: 'Not connected' },
            { name: 'Booking Calendar (Cal.com)', status: 'Not configured' },
            { name: 'Website (Vercel)', status: 'Not deployed' },
          ].map(({ name, status }) => (
            <div key={name} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-sm text-slate-400">{name}</span>
              <span className="text-xs text-slate-600">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300">Team Members</h3>
          <button className="px-3 py-1.5 text-xs font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg hover:bg-violet-500/20 transition-colors">
            Invite Member
          </button>
        </div>
        <div className="flex items-center gap-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {(user?.email?.[0] ?? 'U').toUpperCase()}
          </div>
          <div>
            <p className="text-sm text-slate-300">{user?.email ?? '--'}</p>
            <p className="text-[10px] text-slate-600">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
