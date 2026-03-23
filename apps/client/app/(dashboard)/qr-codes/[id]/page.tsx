'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

type QrPurpose = 'SURVEY' | 'DISCOUNT' | 'SPIN_WHEEL' | 'SIGNUP' | 'MENU' | 'REVIEW' | 'CUSTOM';

interface SpinPrize { label: string; probability: number }

interface Scan {
  id: string;
  createdAt: string;
  outcome: string | null;
  ipAddress: string | null;
  contact: { id: string; firstName: string | null; lastName: string | null; email: string | null; phone: string | null } | null;
}

interface QrCodeDetail {
  id: string;
  label: string;
  token: string;
  purpose: QrPurpose;
  survey: { id: string; title: string; slug: string } | null;
  discountValue: string | null;
  discountCode: string | null;
  spinPrizes: SpinPrize[] | null;
  surveyReward: string | null;
  destinationUrl: string | null;
  expiresAt: string | null;
  active: boolean;
  scanCount: number;
  createdAt: string;
  scans: Scan[];
}

const PURPOSE_CONFIG: Record<QrPurpose, { label: string; icon: string; color: string }> = {
  SURVEY:     { label: 'Survey',         icon: '📋', color: 'bg-violet-100 text-violet-700' },
  DISCOUNT:   { label: 'Discount Code',  icon: '🏷️', color: 'bg-emerald-100 text-emerald-700' },
  SPIN_WHEEL: { label: 'Spin to Win',    icon: '🎡', color: 'bg-amber-100 text-amber-700' },
  SIGNUP:     { label: 'Quick Sign-up',  icon: '✍️', color: 'bg-sky-100 text-sky-700' },
  MENU:       { label: 'Digital Menu',   icon: '🍽️', color: 'bg-orange-100 text-orange-700' },
  REVIEW:     { label: 'Leave a Review', icon: '⭐', color: 'bg-yellow-100 text-yellow-700' },
  CUSTOM:     { label: 'Custom URL',     icon: '🔗', color: 'bg-slate-100 text-slate-600' },
};

function qrImageUrl(data: string, size = 180): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&margin=8`;
}

function qrPublicUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.embedo.io';
  return `${base}/qr/${token}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function contactName(c: Scan['contact']) {
  if (!c) return null;
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
  return name || c.email || c.phone || 'Anonymous';
}

export default function QrCodeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [qr, setQr] = useState<QrCodeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/qr-codes/${id}`)
      .then((r) => r.json())
      .then((data: { success: boolean; qrCode?: QrCodeDetail; error?: string }) => {
        if (!data.success || !data.qrCode) setError(data.error ?? 'Not found');
        else setQr(data.qrCode);
      })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleActive() {
    if (!qr) return;
    setToggling(true);
    const res = await fetch(`${API_URL}/qr-codes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !qr.active }),
    });
    const data = await res.json() as { success: boolean; qrCode?: QrCodeDetail };
    if (data.success && data.qrCode) setQr((prev) => prev ? { ...prev, active: data.qrCode!.active } : prev);
    setToggling(false);
  }

  function copyLink() {
    if (!qr) return;
    navigator.clipboard.writeText(qrPublicUrl(qr.token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadQr() {
    if (!qr) return;
    const link = document.createElement('a');
    link.href = qrImageUrl(qrPublicUrl(qr.token), 400);
    link.download = `${qr.label.replace(/\s+/g, '-')}-qr.png`;
    link.click();
  }

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  if (error || !qr) return (
    <div className="p-8 text-slate-500 dark:text-slate-400">{error || 'Not found'}</div>
  );

  const cfg = PURPOSE_CONFIG[qr.purpose];
  const publicUrl = qrPublicUrl(qr.token);
  const isExpired = qr.expiresAt ? new Date(qr.expiresAt) < new Date() : false;
  const scansWithContact = qr.scans.filter((s) => s.contact);
  const uniqueContacts = new Map(scansWithContact.map((s) => [s.contact!.id, s.contact!]));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.push('/qr-codes')} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
        Back to QR Codes
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/[0.08] p-6 flex gap-6">
        {/* QR image */}
        <div className="shrink-0">
          <img
            src={qrImageUrl(publicUrl, 160)}
            alt="QR Code"
            className={`rounded-xl border border-slate-200 dark:border-white/[0.08] ${!qr.active || isExpired ? 'opacity-40 grayscale' : ''}`}
            width={160}
            height={160}
          />
          <div className="flex gap-2 mt-3">
            <button onClick={copyLink} className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button onClick={downloadQr} className="flex-1 text-xs py-1.5 rounded-lg border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
              Download
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{qr.label}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
                {!qr.active && (
                  <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-600">Inactive</span>
                )}
                {isExpired && (
                  <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">Expired</span>
                )}
                {qr.active && !isExpired && (
                  <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-600">Active</span>
                )}
              </div>
            </div>
            <button
              onClick={toggleActive}
              disabled={toggling}
              className={`text-sm font-medium px-4 py-2 rounded-xl border transition-colors disabled:opacity-50 ${
                qr.active
                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              {toggling ? 'Saving...' : qr.active ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="text-slate-500">Created <span className="text-slate-800 font-medium">{formatDate(qr.createdAt)}</span></div>
            {qr.expiresAt && (
              <div className="text-slate-500">Expires <span className={`font-medium ${isExpired ? 'text-red-500' : 'text-slate-800'}`}>{formatDate(qr.expiresAt)}</span></div>
            )}
            {qr.survey && (
              <div className="text-slate-500">Survey <span className="text-violet-600 font-medium">{qr.survey.title}</span></div>
            )}
            {qr.discountValue && (
              <div className="text-slate-500">Discount <span className="text-slate-800 font-medium">{qr.discountValue}{qr.discountCode ? ` · ${qr.discountCode}` : ''}</span></div>
            )}
            {qr.destinationUrl && (
              <div className="text-slate-500 col-span-2 truncate">URL <span className="text-slate-800 font-medium">{qr.destinationUrl}</span></div>
            )}
            {qr.surveyReward && (
              <div className="text-slate-500">Reward <span className="text-slate-800 font-medium">{qr.surveyReward}</span></div>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 text-center">
          <div className="text-3xl font-bold text-slate-900">{qr.scanCount}</div>
          <div className="text-sm text-slate-500 mt-1">Total Scans</div>
        </div>
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 text-center">
          <div className="text-3xl font-bold text-slate-900">{uniqueContacts.size}</div>
          <div className="text-sm text-slate-500 mt-1">Contacts Captured</div>
        </div>
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5 text-center">
          <div className="text-3xl font-bold text-slate-900">
            {qr.scanCount > 0 ? Math.round((uniqueContacts.size / qr.scanCount) * 100) : 0}%
          </div>
          <div className="text-sm text-slate-500 mt-1">Conversion Rate</div>
        </div>
      </div>

      {/* Spin prizes */}
      {qr.spinPrizes && qr.spinPrizes.length > 0 && (
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Spin Wheel Prizes</h2>
          <div className="flex flex-wrap gap-2">
            {qr.spinPrizes.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-sm">
                <span className="font-medium text-amber-800">{p.label}</span>
                <span className="text-amber-500 text-xs">{p.probability}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contacts captured */}
      {uniqueContacts.size > 0 && (
        <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Contacts Captured ({uniqueContacts.size})</h2>
          <div className="space-y-2">
            {[...uniqueContacts.values()].map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold text-sm shrink-0">
                  {(c.firstName?.[0] ?? c.email?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800">{contactName(c)}</div>
                  <div className="text-xs text-slate-400">{[c.email, c.phone].filter(Boolean).join(' · ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scan log */}
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm rounded-2xl border border-slate-200 dark:border-white/[0.08] p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Scan History {qr.scans.length > 0 ? `(last ${qr.scans.length})` : ''}</h2>
        {qr.scans.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No scans yet. Share your QR code to start collecting data.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {qr.scans.map((scan) => (
              <div key={scan.id} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${scan.contact ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                  <span className="text-slate-700 font-medium">
                    {scan.contact ? contactName(scan.contact) : 'Anonymous'}
                  </span>
                  {scan.outcome && (
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{scan.outcome}</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-slate-400 text-xs">
                  {scan.ipAddress && <span>{scan.ipAddress}</span>}
                  <span>{formatDateTime(scan.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
