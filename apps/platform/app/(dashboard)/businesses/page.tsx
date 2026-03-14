'use client';

import { useEffect, useState } from 'react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface Business {
  id: string;
  name: string;
  type: string;
  status: string;
  phone?: string;
  email?: string;
  twilioPhoneNumber?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  ACTIVE:       'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  PROVISIONING: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  PENDING:      'bg-slate-500/10 text-slate-400 border-slate-500/20',
  SUSPENDED:    'bg-red-500/15 text-red-400 border-red-500/25',
};

export default function BusinessesPage() {
  const [items, setItems] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBusinesses() {
      try {
        const res = await fetch(`${API_URL}/businesses?pageSize=50`);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      } catch (err) {
        console.error('Failed to fetch businesses:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBusinesses();
  }, []);

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Businesses</h1>
          <p className="text-slate-400 mt-1 text-sm">{total} total businesses</p>
        </div>
        <a
          href="/businesses/new"
          className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors"
        >
          + Onboard New
        </a>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-x-auto">
        {loading ? (
          <div className="p-16 text-center">
            <p className="text-slate-500 text-sm">Loading businesses...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center">
            <p className="text-slate-500 text-sm">No businesses onboarded yet.</p>
            <a href="/businesses/new" className="mt-3 inline-block text-sm text-violet-400 hover:text-violet-300 transition-colors">
              Onboard your first business →
            </a>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Business</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Type</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">AI Phone</th>
                <th className="text-left px-6 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {items.map((biz) => (
                <tr key={biz.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-6 py-4">
                    <a href={`/businesses/${biz.id}`} className="font-semibold text-white hover:text-violet-300 transition-colors">
                      {biz.name}
                    </a>
                    {biz.email && <p className="text-xs text-slate-500 mt-0.5">{biz.email}</p>}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 capitalize">{biz.type.toLowerCase()}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColors[biz.status] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                      {biz.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-400">
                    {biz.twilioPhoneNumber ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(biz.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
