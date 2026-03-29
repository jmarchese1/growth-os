'use client';

import { useState, useEffect, useCallback } from 'react';

const PROSPECTOR_URL = process.env['NEXT_PUBLIC_PROSPECTOR_URL'] ?? process.env['PROSPECTOR_URL'] ?? 'http://localhost:3009';

interface Campaign { id: string; name: string; targetCity: string; _count: { prospects: number } }

const ALL_COLUMNS = [
  { key: 'name', label: 'Business Name', default: true },
  { key: 'email', label: 'Email', default: true },
  { key: 'contactFirstName', label: 'First Name', default: true },
  { key: 'contactLastName', label: 'Last Name', default: true },
  { key: 'contactTitle', label: 'Title', default: true },
  { key: 'phone', label: 'Phone', default: true },
  { key: 'website', label: 'Website', default: true },
  { key: 'city', label: 'City', default: true },
  { key: 'state', label: 'State', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'campaignName', label: 'Campaign', default: true },
  { key: 'emailSource', label: 'Email Source', default: false },
  { key: 'contactLinkedIn', label: 'LinkedIn', default: false },
  { key: 'linkedinUrl', label: 'Company LinkedIn', default: false },
  { key: 'facebookUrl', label: 'Facebook', default: false },
  { key: 'twitterUrl', label: 'Twitter/X', default: false },
  { key: 'revenue', label: 'Revenue', default: false },
  { key: 'foundedYear', label: 'Founded', default: false },
  { key: 'googleRating', label: 'Google Rating', default: false },
  { key: 'googleReviewCount', label: 'Review Count', default: false },
  { key: 'websiteScore', label: 'Site Score', default: false },
  { key: 'websiteHasChatbot', label: 'Has Chatbot', default: false },
  { key: 'createdAt', label: 'Added Date', default: false },
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
          // Select all by default
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

  const selectAllCampaigns = () => setSelectedCampaigns(new Set(campaigns.map((c) => c.id)));
  const selectNoneCampaigns = () => setSelectedCampaigns(new Set());

  const toggleCol = (key: string) => {
    setSelectedCols((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectAllCols = () => setSelectedCols(new Set(ALL_COLUMNS.map((c) => c.key)));
  const selectDefaultCols = () => setSelectedCols(new Set(ALL_COLUMNS.filter((c) => c.default).map((c) => c.key)));

  async function handleExport() {
    if (selectedCampaigns.size === 0 || selectedCols.size === 0) return;
    setExporting(true);

    try {
      // Fetch prospects for all selected campaigns
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
              name: p.name,
              email: p.email,
              contactFirstName: p.contactFirstName,
              contactLastName: p.contactLastName,
              contactTitle: p.contactTitle,
              phone: p.phone,
              website: p.website,
              city: addr?.city ?? '',
              state: addr?.state ?? '',
              status: p.status,
              campaignName: campaign?.name ?? '',
              emailSource: p.emailSource,
              contactLinkedIn: p.contactLinkedIn,
              linkedinUrl: p.linkedinUrl,
              facebookUrl: p.facebookUrl,
              twitterUrl: p.twitterUrl,
              revenue: p.revenue,
              foundedYear: p.foundedYear,
              googleRating: p.googleRating,
              googleReviewCount: p.googleReviewCount,
              websiteScore: p.websiteScore,
              websiteHasChatbot: p.websiteHasChatbot ? 'Yes' : 'No',
              createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
            };
            for (const key of selectedCols) {
              row[key] = colMap[key] ?? '';
            }
            allProspects.push(row);
          }

          if (items.length < 100) break;
          page++;
        }
      }

      // Build CSV/TSV
      const separator = format === 'csv' ? ',' : '\t';
      const colKeys = ALL_COLUMNS.filter((c) => selectedCols.has(c.key));
      const header = colKeys.map((c) => c.label).join(separator);
      const rows = allProspects.map((row) =>
        colKeys.map((c) => {
          const val = String(row[c.key] ?? '');
          // Escape for CSV
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
      <div className="p-8 flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Export Prospects</h1>
          <p className="text-sm text-slate-400 mt-1">Select campaigns and columns to export as CSV or TSV for Lemlist, Google Sheets, or Excel.</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={format} onChange={(e) => setFormat(e.target.value as 'csv' | 'tsv')}
            className="px-3 py-2 bg-[#12101f] border border-white/10 rounded-lg text-sm text-white appearance-none">
            <option value="csv">CSV</option>
            <option value="tsv">TSV (Excel)</option>
          </select>
          <button
            onClick={handleExport}
            disabled={exporting || selectedCampaigns.size === 0 || selectedCols.size === 0}
            className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : `Export ${totalProspects.toLocaleString()} Prospects`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Selector */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 glow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Campaigns</h2>
            <div className="flex gap-2">
              <button onClick={selectAllCampaigns} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
                Select All
              </button>
              <button onClick={selectNoneCampaigns} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
                None
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {campaigns.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleCampaign(c.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-colors border ${
                  selectedCampaigns.has(c.id)
                    ? 'bg-violet-600/20 border-violet-500/30 text-white'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-slate-500">{c._count?.prospects ?? 0}</span>
                </div>
                <span className="text-[10px] text-slate-600">{c.targetCity}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500">
              {selectedCampaigns.size} campaign{selectedCampaigns.size !== 1 ? 's' : ''} selected · <span className="text-white font-semibold">{totalProspects.toLocaleString()}</span> prospects
            </p>
          </div>
        </div>

        {/* Column Selector */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 glow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Columns</h2>
            <div className="flex gap-2">
              <button onClick={selectAllCols} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
                All
              </button>
              <button onClick={selectDefaultCols} className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
                Default
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {ALL_COLUMNS.map((col) => (
              <button
                key={col.key}
                onClick={() => toggleCol(col.key)}
                className={`text-left px-3 py-2 rounded-lg text-xs transition-colors border ${
                  selectedCols.has(col.key)
                    ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-500 hover:border-white/10'
                }`}
              >
                {col.label}
              </button>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-white/[0.06]">
            <p className="text-xs text-slate-500">
              {selectedCols.size} column{selectedCols.size !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
