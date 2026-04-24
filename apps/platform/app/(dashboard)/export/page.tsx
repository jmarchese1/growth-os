'use client';

import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { SectionHeader, Panel, Button } from '../../../components/ui/primitives';

const PROSPECTOR_URL = process.env['NEXT_PUBLIC_PROSPECTOR_URL'] ?? process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

interface Campaign { id: string; name: string; targetCity: string; _count: { prospects: number } }

const ALL_COLUMNS = [
  { key: 'name', label: 'companyName', displayLabel: 'Business Name', default: true },
  { key: 'email', label: 'email', displayLabel: 'Email', default: true },
  { key: 'contactFirstName', label: 'firstName', displayLabel: 'First Name', default: true },
  { key: 'contactLastName', label: 'lastName', displayLabel: 'Last Name', default: true },
  { key: 'contactTitle', label: 'jobTitle', displayLabel: 'Title', default: true },
  { key: 'phone', label: 'phone', displayLabel: 'Phone', default: true },
  { key: 'website', label: 'companyUrl', displayLabel: 'Website', default: true },
  { key: 'city', label: 'city', displayLabel: 'City', default: true },
  { key: 'state', label: 'state', displayLabel: 'State', default: true },
  { key: 'status', label: 'status', displayLabel: 'Status', default: true },
  { key: 'campaignName', label: 'campaign', displayLabel: 'Campaign', default: true },
  { key: 'emailSource', label: 'emailSource', displayLabel: 'Email Source', default: false },
  { key: 'contactLinkedIn', label: 'linkedinUrl', displayLabel: 'LinkedIn', default: false },
  { key: 'linkedinUrl', label: 'companyLinkedinUrl', displayLabel: 'Company LinkedIn', default: false },
  { key: 'facebookUrl', label: 'facebookUrl', displayLabel: 'Facebook', default: false },
  { key: 'twitterUrl', label: 'twitterUrl', displayLabel: 'Twitter/X', default: false },
  { key: 'revenue', label: 'revenue', displayLabel: 'Revenue', default: false },
  { key: 'foundedYear', label: 'foundedYear', displayLabel: 'Founded', default: false },
  { key: 'googleRating', label: 'googleRating', displayLabel: 'Google Rating', default: false },
  { key: 'googleReviewCount', label: 'reviewCount', displayLabel: 'Review Count', default: false },
  { key: 'websiteScore', label: 'siteScore', displayLabel: 'Site Score', default: false },
  { key: 'websiteHasChatbot', label: 'hasChatbot', displayLabel: 'Has Chatbot', default: false },
  { key: 'createdAt', label: 'addedDate', displayLabel: 'Added Date', default: false },
];

export default function ExportPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set(ALL_COLUMNS.filter((c) => c.default).map((c) => c.key)));
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [format, setFormat] = useState<'csv' | 'tsv'>('csv');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${PROSPECTOR_URL}/campaigns`);
        if (res.ok) {
          const data = await res.json();
          const arr = Array.isArray(data) ? data : [];
          setCampaigns(arr);
          setSelectedCampaigns(new Set(arr.map((c: Campaign) => c.id)));
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const totalProspects = campaigns
    .filter((c) => selectedCampaigns.has(c.id))
    .reduce((sum, c) => sum + (c._count?.prospects ?? 0), 0);

  const toggleCampaign = (id: string) => {
    setSelectedCampaigns((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCol = (key: string) => {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  async function handleExport() {
    if (selectedCampaigns.size === 0 || selectedCols.size === 0) return;
    setExporting(true);
    try {
      const allProspects: Record<string, unknown>[] = [];
      for (const cid of selectedCampaigns) {
        const campaign = campaigns.find((c) => c.id === cid);
        let page = 1;
        while (true) {
          const res = await fetch(`${PROSPECTOR_URL}/campaigns/${cid}/prospects?pageSize=100&page=${page}`);
          if (!res.ok) break;
          const data = await res.json();
          const items = data.items ?? data.prospects ?? [];
          if (items.length === 0) break;
          for (const p of items) {
            const row: Record<string, unknown> = {};
            const addr = p.address as Record<string, string> | null;
            const colMap: Record<string, unknown> = {
              name: p.name, email: p.email, contactFirstName: p.contactFirstName,
              contactLastName: p.contactLastName, contactTitle: p.contactTitle,
              phone: p.phone, website: p.website, city: addr?.city ?? '',
              state: addr?.state ?? '', status: p.status, campaignName: campaign?.name ?? '',
              emailSource: p.emailSource, contactLinkedIn: p.contactLinkedIn,
              linkedinUrl: p.linkedinUrl, facebookUrl: p.facebookUrl, twitterUrl: p.twitterUrl,
              revenue: p.revenue, foundedYear: p.foundedYear, googleRating: p.googleRating,
              googleReviewCount: p.googleReviewCount, websiteScore: p.websiteScore,
              websiteHasChatbot: p.websiteHasChatbot ? 'Yes' : 'No',
              createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
            };
            for (const key of selectedCols) row[key] = colMap[key] ?? '';
            allProspects.push(row);
          }
          if (items.length < 100) break;
          page++;
        }
      }
      const separator = format === 'csv' ? ',' : '\t';
      const colKeys = ALL_COLUMNS.filter((c) => selectedCols.has(c.key));
      const header = colKeys.map((c) => c.label).join(separator);
      const rows = allProspects.map((row) =>
        colKeys.map((c) => {
          const val = String(row[c.key] ?? '');
          if (format === 'csv' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(separator)
      );
      const content = [header, ...rows].join('\n');
      const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/tab-separated-values' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `embedo-prospects-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExporting(false);
  }

  if (loading) {
    return (
      <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto">
        <div className="panel p-16 text-center">
          <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">
      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">Chapter 07 · Export</span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {totalProspects.toLocaleString()} rows queued
          </span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[76px] max-w-3xl">
            Move the data.
          </h1>
          <div className="flex items-center gap-3">
            <select value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'tsv')} className="input appearance-none">
              <option value="csv">CSV</option>
              <option value="tsv">TSV (Excel)</option>
            </select>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={exporting || selectedCampaigns.size === 0 || selectedCols.size === 0}
            >
              <Download className="w-3 h-3" />
              <span>{exporting ? 'Exporting…' : `Export ${totalProspects.toLocaleString()}`}</span>
            </Button>
          </div>
        </div>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          Lemlist-compatible column names, ready for Google Sheets, Excel, or any other outreach tool.
        </p>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Panel title="Campaigns" numeral="01">
          <div className="px-5 py-3 hairline-b flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelectedCampaigns(new Set(campaigns.map(c => c.id)))}>Select all</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedCampaigns(new Set())}>None</Button>
          </div>
          <div className="p-4 max-h-[420px] overflow-y-auto">
            {campaigns.map((c) => {
              const selected = selectedCampaigns.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCampaign(c.id)}
                  className={`w-full text-left px-4 py-2.5 mb-1 hairline transition-colors ${
                    selected ? 'bg-signal-soft border-signal text-signal' : 'border-transparent text-paper-3 hover:text-paper hover:border-rule'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-ui text-sm">{c.name}</span>
                    <span className="font-mono text-[11px] nums">{c._count?.prospects ?? 0}</span>
                  </div>
                  <span className="font-mono text-[9px] tracking-micro uppercase text-paper-4">{c.targetCity}</span>
                </button>
              );
            })}
          </div>
          <div className="px-5 py-3 hairline-t">
            <p className="font-mono text-[10px] tracking-micro uppercase text-paper-3">
              <span className="text-paper">{selectedCampaigns.size}</span> selected ·{' '}
              <span className="text-signal nums">{totalProspects.toLocaleString()}</span> prospects
            </p>
          </div>
        </Panel>

        <Panel title="Columns" numeral="02">
          <div className="px-5 py-3 hairline-b flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelectedCols(new Set(ALL_COLUMNS.map(c => c.key)))}>All</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedCols(new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.key)))}>Default</Button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-1.5">
            {ALL_COLUMNS.map((col) => {
              const selected = selectedCols.has(col.key);
              return (
                <button
                  key={col.key}
                  onClick={() => toggleCol(col.key)}
                  className={`text-left px-3 py-2 hairline transition-colors ${
                    selected ? 'bg-signal-soft border-signal text-signal' : 'border-transparent text-paper-3 hover:text-paper hover:border-rule'
                  }`}
                >
                  <span className="font-mono text-[10px] tracking-micro uppercase">{col.displayLabel}</span>
                </button>
              );
            })}
          </div>
          <div className="px-5 py-3 hairline-t">
            <p className="font-mono text-[10px] tracking-micro uppercase text-paper-3">
              <span className="text-paper">{selectedCols.size}</span> of {ALL_COLUMNS.length} columns
            </p>
          </div>
        </Panel>
      </section>
    </div>
  );
}
