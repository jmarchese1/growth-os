'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Plus, Building2 } from 'lucide-react';
import { SectionHeader, HeroMetric, MetricBlock, Button } from '../../../components/ui/primitives';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['API_BASE_URL'] ?? 'https://embedoapi-production.up.railway.app';

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

const statusDot: Record<string, string> = {
  ACTIVE:       'bg-signal',
  PROVISIONING: 'bg-amber',
  PENDING:      'bg-paper-4',
  SUSPENDED:    'bg-ember',
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

  const active = items.filter((b) => b.status === 'ACTIVE').length;
  const provisioning = items.filter((b) => b.status === 'PROVISIONING').length;

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">

      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">
            Chapter 04 · Clients
          </span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {total} on the roster
          </span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[76px] max-w-3xl">
            Signed businesses.
          </h1>
          <Link href="/businesses/new">
            <Button variant="primary">
              <Plus className="w-3 h-3" />
              <span>Onboard new</span>
            </Button>
          </Link>
        </div>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          Every business onboarded gets AI voice, chatbot, website generation, and lead capture.
        </p>
      </section>

      {/* Summary */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-5">
          <HeroMetric label="Businesses on the roster" value={total} caption={`${active} active, ${provisioning} provisioning`} size="md" />
        </div>
        <div className="col-span-12 lg:col-span-7 panel">
          <div className="grid grid-cols-3">
            <MetricBlock label="Active" value={active} delta="fully provisioned" trend={active > 0 ? 'up' : 'flat'} />
            <MetricBlock label="Provisioning" value={provisioning} delta="setup in progress" />
            <MetricBlock label="Total" value={total} delta="all-time clients" />
          </div>
        </div>
      </section>

      {/* Ledger */}
      <section>
        <SectionHeader numeral="1" title="The roster" subtitle={`${total} businesses under management`} />
        <div className="mt-6 panel overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4">Loading…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="p-20 text-center">
              <Building2 className="w-8 h-8 text-paper-4 mx-auto mb-4" />
              <p className="font-display italic text-paper-3 text-2xl font-light">The roster is empty.</p>
              <Link href="/businesses/new" className="font-mono text-[11px] tracking-micro uppercase text-signal hover:underline mt-4 inline-block">
                Onboard the first business →
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="hairline-b">
                  <Th>Business</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>AI Phone</Th>
                  <Th align="right">Onboarded</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((biz, idx) => (
                  <tr key={biz.id} className="hairline-b last:border-0 hover:bg-ink-2 transition-colors group">
                    <td className="px-5 py-4 min-w-[240px]">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[10px] text-paper-4 pt-1 shrink-0">
                          №{(idx + 1).toString().padStart(3, '0')}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/businesses/${biz.id}`} className="font-display italic text-paper text-lg font-light hover:text-signal transition-colors block leading-tight">
                            {biz.name}
                          </Link>
                          {biz.email && <p className="font-mono text-[10px] text-paper-4 mt-0.5 truncate">{biz.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-[10px] tracking-micro uppercase text-paper-3">{biz.type.toLowerCase()}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 shrink-0 ${statusDot[biz.status] ?? 'bg-paper-4'}`} />
                        <span className="font-mono text-[10px] tracking-micro uppercase text-paper-2">{biz.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-paper nums">
                      {biz.twilioPhoneNumber ?? <span className="text-paper-4">—</span>}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-[11px] text-paper-3 nums">
                      {new Date(biz.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-4 py-3 font-mono text-[9px] tracking-mega uppercase text-paper-4 font-medium ${align === 'right' ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  );
}
