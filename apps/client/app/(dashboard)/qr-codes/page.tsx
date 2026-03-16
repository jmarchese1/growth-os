'use client';

import { useState } from 'react';
import KpiCard from '../../../components/ui/kpi-card';

interface QrCode {
  id: string;
  label: string;
  url: string;
  type: 'signup' | 'promo' | 'menu' | 'custom';
  createdAt: string;
}

const QR_TYPES = [
  { value: 'signup', label: 'Sign-up Form', desc: 'Collect customer name, email, and phone' },
  { value: 'promo', label: 'Promotion', desc: 'Spin to win, discount codes, etc.' },
  { value: 'menu', label: 'Menu', desc: 'Link to your online menu' },
  { value: 'custom', label: 'Custom URL', desc: 'Link to any page' },
] as const;

function qrImageUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&margin=8`;
}

/* ── Create QR Modal ────────────────────────────────────────────── */
function CreateQrModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (qr: QrCode) => void;
}) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<QrCode['type']>('signup');
  const [step, setStep] = useState<'form' | 'preview'>('form');

  function handleNext() {
    if (!label.trim() || !url.trim()) return;
    setStep('preview');
  }

  function handleCreate() {
    const qr: QrCode = {
      id: `qr_${Date.now()}`,
      label: label.trim(),
      url: url.trim(),
      type,
      createdAt: new Date().toISOString(),
    };
    onCreate(qr);
  }

  async function handleDownload() {
    const imgUrl = qrImageUrl(url.trim(), 600);
    const res = await fetch(imgUrl);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${label.trim().replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            {step === 'form' ? 'Create QR Code' : 'Preview & Download'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        {step === 'form' ? (
          <div className="px-6 py-5 space-y-4">
            {/* Type selection */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">QR Code Type</label>
              <div className="grid grid-cols-2 gap-2">
                {QR_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                      type === t.value
                        ? 'border-violet-300 bg-violet-50 text-violet-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <p className="font-medium text-xs">{t.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Label */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Table tent card, Front desk sign"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Destination URL</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-site.com/signup"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!label.trim() || !url.trim()}
                className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors"
              >
                Generate QR Code
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5">
            {/* QR Preview */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="bg-white border-2 border-slate-100 rounded-xl p-4 shadow-sm">
                <img
                  src={qrImageUrl(url.trim(), 200)}
                  alt={`QR code for ${label}`}
                  width={200}
                  height={200}
                  className="rounded"
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{url}</p>
                <span className="inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">
                  {QR_TYPES.find((t) => t.value === type)?.label}
                </span>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <button
                onClick={() => setStep('form')}
                className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleDownload}
                className="px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download PNG
              </button>
              <button
                onClick={handleCreate}
                className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 transition-colors"
              >
                Save QR Code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── QR Code Card ───────────────────────────────────────────────── */
function QrCodeCard({ qr, onDelete }: { qr: QrCode; onDelete: () => void }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(qrImageUrl(qr.url, 600));
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${qr.label.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex gap-4 items-start">
      <div className="bg-slate-50 rounded-lg p-2 flex-shrink-0">
        <img src={qrImageUrl(qr.url, 80)} alt={qr.label} width={80} height={80} className="rounded" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{qr.label}</p>
        <p className="text-xs text-slate-400 truncate mt-0.5">{qr.url}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">
            {QR_TYPES.find((t) => t.value === qr.type)?.label}
          </span>
          <span className="text-[10px] text-slate-300">
            {new Date(qr.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-50"
        >
          {downloading ? '...' : 'Download'}
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function QrCodesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [qrCodes, setQrCodes] = useState<QrCode[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('embedo_qr_codes') ?? '[]');
    } catch {
      return [];
    }
  });

  function saveQrCodes(codes: QrCode[]) {
    setQrCodes(codes);
    localStorage.setItem('embedo_qr_codes', JSON.stringify(codes));
  }

  function handleCreate(qr: QrCode) {
    saveQrCodes([qr, ...qrCodes]);
    setShowCreate(false);
  }

  function handleDelete(id: string) {
    saveQrCodes(qrCodes.filter((q) => q.id !== id));
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QR Codes</h1>
          <p className="text-sm text-slate-500 mt-1">Generate scannable cards for tables, menus, and the front desk — customers scan to join promos and enter your database</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
        >
          Create QR Code
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Active QR Codes" value={qrCodes.length} color="violet"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Total Scans" value="0" color="emerald"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>} />
        <KpiCard label="New Customers" value="0" color="sky"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg>} />
        <KpiCard label="This Week" value="0" color="amber"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
      </div>

      {/* How it works explainer */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-violet-800 mb-2">How it works</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {[
            { step: '1', title: 'Create a QR code', desc: 'Choose a promo (e.g. "Spin to win 10% off") or just a sign-up form' },
            { step: '2', title: 'Print & place it', desc: 'Download a print-ready card to put on tables, menus, or the host desk' },
            { step: '3', title: 'Customers scan it', desc: 'They enter their name, email, or phone — instantly added to your customer list' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</div>
              <div>
                <p className="text-sm font-semibold text-violet-900">{title}</p>
                <p className="text-xs text-violet-700 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* QR Code List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Your QR Codes</h2>
        </div>
        {qrCodes.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            No QR codes yet. Create one and place it in your restaurant to start building your customer list.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {qrCodes.map((qr) => (
              <QrCodeCard key={qr.id} qr={qr} onDelete={() => handleDelete(qr.id)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateQrModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}
