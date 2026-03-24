'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';
import { KpiCard } from '../../../components/ui/kpi-card';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  REDEEMED: 'bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-400',
  EXPIRED: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
};

interface GiftCard {
  id: string;
  code: string;
  initialAmount: number;
  currentBalance: number;
  status: string;
  purchaserName?: string;
  recipientName?: string;
  recipientEmail?: string;
  personalMessage?: string;
  source: string;
  createdAt: string;
}

interface Stats { totalSold: number; activeCards: number; totalValue: number; outstandingBalance: number; }

export default function GiftCardsPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [cards, setCards] = useState<GiftCard[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [toolEnabled, setToolEnabled] = useState<boolean | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ amount: '50', purchaserName: '', recipientName: '', recipientEmail: '', personalMessage: '' });
  const [redeemId, setRedeemId] = useState<string | null>(null);
  const [redeemAmount, setRedeemAmount] = useState('');

  const fetchCards = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/gift-cards?businessId=${business.id}`);
      const json = await res.json();
      if (json.success) setCards(json.cards);
    } finally { setLoading(false); }
  }, [business?.id]);

  const fetchStats = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/gift-cards/stats/${business.id}`);
      const json = await res.json();
      if (json.success) setStats(json.stats);
    } catch { /* ignore */ }
  }, [business?.id]);

  const checkTool = useCallback(async () => {
    if (!business?.id) return;
    try {
      const res = await fetch(`${API_URL}/business-tools?businessId=${business.id}`);
      const json = await res.json();
      if (json.success) {
        const tool = json.tools.find((t: { type: string }) => t.type === 'GIFT_CARD_LOYALTY');
        setToolEnabled(tool?.enabled ?? false);
      }
    } catch { setToolEnabled(false); }
  }, [business?.id]);

  useEffect(() => { fetchCards(); }, [fetchCards]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { checkTool(); }, [checkTool]);

  const createCard = async () => {
    if (!business?.id || !form.amount) return;
    try {
      const res = await fetch(`${API_URL}/gift-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          amount: parseFloat(form.amount),
          purchaserName: form.purchaserName || undefined,
          recipientName: form.recipientName || undefined,
          recipientEmail: form.recipientEmail || undefined,
          personalMessage: form.personalMessage || undefined,
          source: 'MANUAL',
        }),
      });
      const json = await res.json();
      if (json.success) { setForm({ amount: '50', purchaserName: '', recipientName: '', recipientEmail: '', personalMessage: '' }); setShowCreate(false); fetchCards(); fetchStats(); }
    } catch { /* ignore */ }
  };

  const redeem = async (id: string) => {
    if (!redeemAmount) return;
    try {
      const res = await fetch(`${API_URL}/gift-cards/${id}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(redeemAmount) }),
      });
      const json = await res.json();
      if (json.success) { setRedeemId(null); setRedeemAmount(''); fetchCards(); fetchStats(); }
    } catch { /* ignore */ }
  };

  if (bizLoading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;
  if (!business) return null;

  if (toolEnabled === false) return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8"><h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gift Cards</h1></div>
      <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-12 text-center">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Gift Cards Not Enabled</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Enable Gift Cards & Loyalty from the Capabilities tab in your Chat Widget or Phone Agent settings.</p>
        <a href="/chatbot" className="inline-flex px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">Go to Chat Widget</a>
      </div>
    </div>
  );

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Gift Cards</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sell, track, and redeem gift cards</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">+ Create Gift Card</button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Total Sold" value={stats.totalSold} color="violet" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm2 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" /><path d="M9 11H3v5a2 2 0 002 2h4v-7zm2 7h4a2 2 0 002-2v-5h-6v7z" /></svg>} />
          <KpiCard label="Active Cards" value={stats.activeCards} color="emerald" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9z" clipRule="evenodd" /></svg>} />
          <KpiCard label="Total Value" value={`$${stats.totalValue.toFixed(0)}`} color="sky" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>} />
          <KpiCard label="Outstanding" value={`$${stats.outstandingBalance.toFixed(0)}`} color="amber" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>} />
        </div>
      )}

      {showCreate && (
        <div className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Create Gift Card</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <input type="number" min="1" placeholder="Amount ($)" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <input placeholder="Purchaser name" value={form.purchaserName} onChange={e => setForm(p => ({ ...p, purchaserName: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <input placeholder="Recipient name" value={form.recipientName} onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <input placeholder="Recipient email" value={form.recipientEmail} onChange={e => setForm(p => ({ ...p, recipientEmail: e.target.value }))} className="px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
            <input placeholder="Personal message" value={form.personalMessage} onChange={e => setForm(p => ({ ...p, personalMessage: e.target.value }))} className="col-span-2 px-3 py-2 text-sm border border-slate-200 dark:border-white/[0.08] rounded-lg bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
          </div>
          <button onClick={createCard} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">Create Card</button>
        </div>
      )}

      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Gift Cards</h2>
        </div>

        {loading ? (
          <div className="px-5 py-12 flex justify-center"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
        ) : cards.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">No gift cards yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Code</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Balance</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Purchaser</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recipient</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Created</th>
                <th className="px-5 py-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
              {cards.map(card => (
                <tr key={card.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3 text-sm font-mono font-medium text-slate-900 dark:text-white">{card.code}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">${card.initialAmount.toFixed(2)}</td>
                  <td className="px-5 py-3 text-sm font-medium text-slate-900 dark:text-white">${card.currentBalance.toFixed(2)}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{card.purchaserName ?? '—'}</td>
                  <td className="px-5 py-3 text-sm text-slate-600 dark:text-slate-300">{card.recipientName ?? '—'}</td>
                  <td className="px-5 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_BADGES[card.status] ?? ''}`}>{card.status.toLowerCase()}</span></td>
                  <td className="px-5 py-3 text-[11px] text-slate-400">{new Date(card.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    {card.status === 'ACTIVE' && (
                      redeemId === card.id ? (
                        <div className="flex gap-1.5">
                          <input type="number" min="0.01" step="0.01" max={card.currentBalance} placeholder="$" value={redeemAmount} onChange={e => setRedeemAmount(e.target.value)} className="w-20 px-2 py-1 text-sm border border-slate-200 dark:border-white/[0.08] rounded-md bg-white dark:bg-white/[0.04] text-slate-900 dark:text-white" />
                          <button onClick={() => redeem(card.id)} className="px-2.5 py-1 text-[11px] font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors">Apply</button>
                          <button onClick={() => { setRedeemId(null); setRedeemAmount(''); }} className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setRedeemId(card.id)} className="px-2.5 py-1 text-[11px] font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700 transition-colors">Redeem</button>
                      )
                    )}
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
