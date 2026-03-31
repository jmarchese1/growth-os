'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Session {
  id: string;
  username: string;
  status: string;
  dailyLimit: number;
  sentToday: number;
  totalSent: number;
  lastUsedAt: string | null;
  lastError: string | null;
}

export function SessionSetup({ prospectorUrl, sessions }: { prospectorUrl: string; sessions: Session[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [username, setUsername] = useState('');
  const [cookiesJson, setCookiesJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function addSession() {
    if (!username || !cookiesJson) return;
    setLoading(true);
    setError('');
    try {
      const cookies = JSON.parse(cookiesJson);
      const res = await fetch(`${prospectorUrl}/instagram/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, cookies }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? 'Failed to add session');
        return;
      }
      setAdding(false);
      setUsername('');
      setCookiesJson('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    } finally {
      setLoading(false);
    }
  }

  async function testSession(id: string) {
    setTesting(id);
    try {
      const res = await fetch(`${prospectorUrl}/instagram/sessions/${id}/test`, { method: 'POST' });
      const data = await res.json() as { status?: string; error?: string };
      if (data.error) setError(data.error);
      router.refresh();
    } catch {
      setError('Test failed — is prospector running?');
    } finally {
      setTesting(null);
    }
  }

  const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
    ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
    CHALLENGE_REQUIRED: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400' },
    SUSPENDED: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
    EXPIRED: { bg: 'bg-slate-500/10', text: 'text-slate-400', dot: 'bg-slate-500' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Instagram Accounts</h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-500 transition-colors"
          >
            + Connect Account
          </button>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Session cards */}
      {sessions.map((s) => {
        const sc = statusColors[s.status] ?? statusColors['EXPIRED']!;
        const quotaPct = s.dailyLimit > 0 ? Math.round((s.sentToday / s.dailyLimit) * 100) : 0;
        return (
          <div key={s.id} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white text-xs font-bold">
                  {s.username[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">@{s.username}</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.bg} ${sc.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                    {s.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button
                onClick={() => testSession(s.id)}
                disabled={testing === s.id}
                className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 text-xs rounded-lg hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
              >
                {testing === s.id ? 'Testing...' : 'Test Connection'}
              </button>
            </div>

            {/* Quota bar */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                <span>Today&apos;s DMs</span>
                <span>{s.sentToday} / {s.dailyLimit}</span>
              </div>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${quotaPct > 80 ? 'bg-amber-500' : 'bg-violet-500'}`}
                  style={{ width: `${Math.min(quotaPct, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-[10px] text-slate-600">
              <span>Total sent: {s.totalSent}</span>
              {s.lastUsedAt && <span>Last used: {new Date(s.lastUsedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })}</span>}
              {s.lastError && <span className="text-red-400/60 truncate max-w-[200px]">{s.lastError}</span>}
            </div>
          </div>
        );
      })}

      {sessions.length === 0 && !adding && (
        <div className="text-center py-8 text-slate-600 text-sm">
          No Instagram accounts connected. Add one to start sending DMs.
        </div>
      )}

      {/* Add session form */}
      {adding && (
        <div className="bg-white/[0.03] border border-violet-500/20 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-violet-400 uppercase tracking-wide">Connect Instagram Account</h3>
          <p className="text-[11px] text-slate-500">
            Export your Instagram cookies from your browser (DevTools &rarr; Application &rarr; Cookies &rarr; instagram.com) and paste the JSON array below.
          </p>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="your_ig_handle"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Cookies JSON</label>
            <textarea
              value={cookiesJson}
              onChange={(e) => setCookiesJson(e.target.value)}
              placeholder='[{"name":"sessionid","value":"...","domain":".instagram.com",...}]'
              rows={6}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono resize-y"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addSession}
              disabled={loading || !username || !cookiesJson}
              className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Account'}
            </button>
            <button
              onClick={() => { setAdding(false); setError(''); }}
              className="px-4 py-2 bg-white/5 text-slate-400 text-xs rounded-lg hover:bg-white/10 transition-colors border border-white/10"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
