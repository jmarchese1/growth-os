'use client';

import Link from 'next/link';
import { useSession } from '../../../components/auth/session-provider';

export default function SettingsPage() {
  const { user } = useSession();

  return (
    <div className="p-8 animate-fade-up">
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
            <p className="text-sm text-slate-500 font-mono text-xs">{user?.id?.slice(0, 12) ?? '--'}...</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Business Profile</h3>
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
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">{label}</label>
              <p className="text-sm text-slate-500">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Integrations</h3>
          <Link href="/integrations"
            className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
            Manage All
          </Link>
        </div>
        <div className="space-y-3">
          {[
            { name: 'Voice Agent (ElevenLabs)', status: 'Not configured', icon: '🎙' },
            { name: 'Phone Number (Twilio)', status: 'Not configured', icon: '📞' },
            { name: 'Instagram', status: 'Not connected', icon: '📷' },
            { name: 'Facebook', status: 'Not connected', icon: '👤' },
            { name: 'Booking Calendar (Cal.com)', status: 'Not configured', icon: '📅' },
            { name: 'Email Delivery (SendGrid)', status: 'Not configured', icon: '📧' },
            { name: 'AI Engine (Anthropic)', status: 'Not configured', icon: '🤖' },
            { name: 'Website (Vercel)', status: 'Not deployed', icon: '🌐' },
          ].map(({ name, status }) => (
            <Link key={name} href="/integrations"
              className="flex items-center justify-between py-2.5 px-1 border-b border-slate-100 last:border-0 hover:bg-slate-50 -mx-1 rounded-lg transition-colors group">
              <span className="text-sm text-slate-600">{name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{status}</span>
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
            <p className="text-[10px] text-slate-400">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
