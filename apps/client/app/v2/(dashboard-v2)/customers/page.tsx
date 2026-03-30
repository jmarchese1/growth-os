'use client';
import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../../components/auth/business-provider';
import { PageShell, Card, CardHeader, Badge, Button, Spinner, EmptyState } from '../../components';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface Contact { id: string; firstName: string | null; lastName: string | null; email: string | null; phone: string | null; status: string; source: string; createdAt: string; }

export default function V2Customers() {
  const { business, loading: bizLoading } = useBusiness();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!business?.id) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/businesses/${business.id}/contacts?limit=50`);
      if (res.ok) { const data = await res.json(); setContacts(data.contacts ?? data ?? []); }
    } catch {} finally { setLoading(false); }
  }, [business?.id]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  if (bizLoading || loading) return <Spinner />;

  return (
    <PageShell title="Contacts" subtitle={`${contacts.length} total contacts`}
      actions={<Button variant="primary" size="sm">+ Add Contact</Button>}>
      {contacts.length === 0 ? (
        <Card>
          <EmptyState title="No contacts yet" description="Contacts will appear here as they interact with your business." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                  {['Name', 'Email', 'Phone', 'Status', 'Source'].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/[0.04]">
                {contacts.slice(0, 25).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800 dark:text-white">{[c.firstName, c.lastName].filter(Boolean).join(' ') || 'Unknown'}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{c.email ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{c.phone ?? '—'}</td>
                    <td className="px-5 py-3"><Badge color={c.status === 'CUSTOMER' ? 'emerald' : c.status === 'LEAD' ? 'amber' : 'violet'}>{c.status}</Badge></td>
                    <td className="px-5 py-3"><Badge>{c.source}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
