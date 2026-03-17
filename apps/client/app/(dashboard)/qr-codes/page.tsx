'use client';

import { useState, useEffect, useCallback } from 'react';
import KpiCard from '../../../components/ui/kpi-card';
import { useBusiness } from '../../../components/auth/business-provider';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

type QrPurpose = 'SURVEY' | 'DISCOUNT' | 'SPIN_WHEEL' | 'SIGNUP' | 'MENU' | 'REVIEW' | 'CUSTOM';

interface SpinPrize { label: string; probability: number }

interface QrCode {
  id: string;
  label: string;
  token: string;
  purpose: QrPurpose;
  surveyId: string | null;
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
}

interface Survey { id: string; title: string; slug: string }

const PURPOSE_CONFIG: Record<QrPurpose, { label: string; icon: string; desc: string; color: string }> = {
  SURVEY:     { label: 'Survey',         icon: '📋', desc: 'Customers scan → fill out a survey → get a reward',    color: 'bg-violet-100 text-violet-700' },
  DISCOUNT:   { label: 'Discount Code',  icon: '🏷️', desc: 'Customers scan → see an instant discount code',         color: 'bg-emerald-100 text-emerald-700' },
  SPIN_WHEEL: { label: 'Spin to Win',    icon: '🎡', desc: 'Customers scan → spin a prize wheel → claim reward',    color: 'bg-amber-100 text-amber-700' },
  SIGNUP:     { label: 'Quick Sign-up',  icon: '✍️', desc: 'Customers scan → enter name + email/phone → join list', color: 'bg-sky-100 text-sky-700' },
  MENU:       { label: 'Digital Menu',   icon: '🍽️', desc: 'Customers scan → go straight to your menu',            color: 'bg-orange-100 text-orange-700' },
  REVIEW:     { label: 'Leave a Review', icon: '⭐', desc: 'Customers scan → Google review page opens',             color: 'bg-yellow-100 text-yellow-700' },
  CUSTOM:     { label: 'Custom URL',     icon: '🔗', desc: 'Customers scan → redirected to any URL you choose',     color: 'bg-slate-100 text-slate-600' },
};

function qrImageUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&margin=8`;
}

function qrPublicUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.embedo.io';
  return `${base}/qr/${token}`;
}

/* ── Spin Wheel Prize Builder ────────────────────────────────────── */
const DEFAULT_PRIZES: SpinPrize[] = [
  { label: '10% Off', probability: 35 },
  { label: 'Free Dessert', probability: 20 },
  { label: '15% Off', probability: 15 },
  { label: '5% Off', probability: 30 },
];

function SpinPrizeBuilder({ prizes, onChange }: { prizes: SpinPrize[]; onChange: (p: SpinPrize[]) => void }) {
  function update(i: number, field: keyof SpinPrize, value: string | number) {
    const updated = [...prizes];
    updated[i] = { ...updated[i]!, [field]: value };
    onChange(updated);
  }

  function add() { onChange([...prizes, { label: 'Prize', probability: 10 }]); }
  function remove(i: number) { onChange(prizes.filter((_, j) => j !== i)); }

  const total = prizes.reduce((s, p) => s + p.probability, 0);

  return (
    <div className="space-y-2">
      {prizes.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={p.label}
            onChange={(e) => update(i, 'label', e.target.value)}
            placeholder="Prize label"
            className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={p.probability}
              onChange={(e) => update(i, 'probability', parseInt(e.target.value) || 0)}
              min={1}
              max={100}
              className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            <span className="text-[10px] text-slate-400">%</span>
          </div>
          {prizes.length > 2 && (
            <button onClick={() => remove(i)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button onClick={add} className="text-xs text-violet-600 hover:text-violet-700 font-medium">+ Add prize</button>
        <span className={`text-[10px] ${total === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>Total: {total}% {total !== 100 ? '(should equal 100)' : '✓'}</span>
      </div>
    </div>
  );
}

/* ── Create QR Modal ────────────────────────────────────────────── */
function CreateQrModal({ onClose, onCreate, surveys }: {
  onClose: () => void;
  onCreate: (data: Record<string, unknown>) => Promise<QrCode | null>;
  surveys: Survey[];
}) {
  const [label, setLabel] = useState('');
  const [purpose, setPurpose] = useState<QrPurpose>('SIGNUP');
  const [surveyId, setSurveyId] = useState('');
  const [surveyReward, setSurveyReward] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  const [spinPrizes, setSpinPrizes] = useState<SpinPrize[]>(DEFAULT_PRIZES);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [createdQr, setCreatedQr] = useState<QrCode | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleGenerate() {
    if (!label.trim()) return;
    setSaving(true);
    const payload: Record<string, unknown> = { label: label.trim(), purpose };
    if (purpose === 'SURVEY' && surveyId) payload['surveyId'] = surveyId;
    if (surveyReward.trim()) payload['surveyReward'] = surveyReward.trim();
    if (['DISCOUNT', 'SPIN_WHEEL'].includes(purpose)) {
      if (discountValue.trim()) payload['discountValue'] = discountValue.trim();
      if (discountCode.trim()) payload['discountCode'] = discountCode.trim();
    }
    if (purpose === 'SPIN_WHEEL') payload['spinPrizes'] = spinPrizes;
    if (['MENU', 'REVIEW', 'CUSTOM'].includes(purpose)) payload['destinationUrl'] = destinationUrl.trim();
    if (expiresAt) payload['expiresAt'] = expiresAt;

    const qr = await onCreate(payload);
    setSaving(false);
    if (qr) { setCreatedQr(qr); setStep('preview'); }
  }

  async function handleDownload() {
    if (!createdQr) return;
    const imgUrl = qrImageUrl(qrPublicUrl(createdQr.token), 600);
    const res = await fetch(imgUrl);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${createdQr.label.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const canGenerate = label.trim() &&
    (purpose !== 'SURVEY' || surveyId) &&
    (!['MENU', 'REVIEW', 'CUSTOM'].includes(purpose) || destinationUrl.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-sm font-semibold text-slate-800">{step === 'form' ? 'Create QR Code' : 'Preview & Download'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        {step === 'form' ? (
          <div className="px-6 py-5 space-y-5">
            {/* Purpose */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">QR Code Purpose</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PURPOSE_CONFIG) as [QrPurpose, typeof PURPOSE_CONFIG[QrPurpose]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setPurpose(key)}
                    className={`text-left p-3 rounded-lg border transition-colors ${purpose === key ? 'border-violet-300 bg-violet-50' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <p className="text-xs font-semibold text-slate-800">{cfg.icon} {cfg.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{cfg.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Label */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Internal Label</label>
              <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Table Tent — Summer Promo" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
            </div>

            {/* Purpose-specific fields */}
            {purpose === 'SURVEY' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Link to Survey</label>
                  <select value={surveyId} onChange={(e) => setSurveyId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                    <option value="">Select a survey...</option>
                    {surveys.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                  {surveys.length === 0 && <p className="text-[10px] text-amber-600 mt-1">No surveys yet — create one in the Surveys section first.</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Reward After Completing (optional)</label>
                  <input type="text" value={surveyReward} onChange={(e) => setSurveyReward(e.target.value)} placeholder="e.g. 10% off your next visit" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                </div>
              </div>
            )}

            {purpose === 'DISCOUNT' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Discount Value</label>
                  <input type="text" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder='e.g. "10% off" or "$5 off"' className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Discount Code (optional)</label>
                  <input type="text" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="e.g. SCAN10" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                </div>
              </div>
            )}

            {purpose === 'SPIN_WHEEL' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2">Prize Pool</label>
                  <SpinPrizeBuilder prizes={spinPrizes} onChange={setSpinPrizes} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Discount Code to Show Winners (optional)</label>
                  <input type="text" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="e.g. WINNER15" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                </div>
              </div>
            )}

            {['MENU', 'REVIEW', 'CUSTOM'].includes(purpose) && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  {purpose === 'MENU' ? 'Menu URL' : purpose === 'REVIEW' ? 'Google Review URL' : 'Destination URL'}
                </label>
                <input type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
              </div>
            )}

            {purpose === 'SIGNUP' && (
              <div className="bg-sky-50 border border-sky-200 rounded-lg px-4 py-3">
                <p className="text-xs text-sky-800 font-medium">How Sign-up works</p>
                <p className="text-[11px] text-sky-700 mt-1">Customers scan, enter their name + email or phone number, and are automatically added to your Contacts with source "QR Code".</p>
              </div>
            )}

            {/* Expiration */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Expiration Date (optional)</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
              <p className="text-[10px] text-slate-400 mt-1">Leave blank for no expiration</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
              <button onClick={handleGenerate} disabled={saving || !canGenerate} className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-2">
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? 'Generating...' : 'Generate QR Code'}
              </button>
            </div>
          </div>
        ) : createdQr ? (
          <div className="px-6 py-5">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="bg-white border-2 border-slate-100 rounded-xl p-4 shadow-sm">
                <img src={qrImageUrl(qrPublicUrl(createdQr.token), 200)} alt={createdQr.label} width={200} height={200} className="rounded" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">{createdQr.label}</p>
                <span className={`inline-flex mt-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${PURPOSE_CONFIG[createdQr.purpose]?.color}`}>
                  {PURPOSE_CONFIG[createdQr.purpose]?.icon} {PURPOSE_CONFIG[createdQr.purpose]?.label}
                </span>
                {createdQr.expiresAt && (
                  <p className="text-[11px] text-slate-400 mt-1.5">Expires {new Date(createdQr.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                )}
                <p className="text-[10px] text-slate-400 font-mono mt-1 truncate max-w-xs">{qrPublicUrl(createdQr.token)}</p>
              </div>
            </div>
            <div className="flex justify-center gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Done</button>
              <button onClick={handleDownload} className="px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                Download PNG
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ── QR Code Card ───────────────────────────────────────────────── */
function QrCodeCard({ qr, onDelete }: { qr: QrCode; onDelete: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const cfg = PURPOSE_CONFIG[qr.purpose];
  const url = qrPublicUrl(qr.token);
  const isExpired = qr.expiresAt && new Date(qr.expiresAt) < new Date();

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(qrImageUrl(url, 600));
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

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`bg-white border rounded-xl p-4 flex gap-4 items-start ${isExpired ? 'border-red-200 opacity-60' : 'border-slate-200'}`}>
      <div className="bg-slate-50 rounded-lg p-2 flex-shrink-0">
        <img src={qrImageUrl(url, 80)} alt={qr.label} width={80} height={80} className="rounded" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 truncate">{qr.label}</p>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${cfg?.color}`}>{cfg?.icon} {cfg?.label}</span>
          {isExpired && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600">Expired</span>}
        </div>
        {qr.survey && <p className="text-[11px] text-slate-500 mt-0.5">Survey: {qr.survey.title}</p>}
        {qr.discountValue && <p className="text-[11px] text-slate-500 mt-0.5">Discount: {qr.discountValue}{qr.discountCode ? ` — Code: ${qr.discountCode}` : ''}</p>}
        {qr.expiresAt && !isExpired && <p className="text-[11px] text-slate-400 mt-0.5">Expires {new Date(qr.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] font-medium text-slate-600">{qr.scanCount} scan{qr.scanCount !== 1 ? 's' : ''}</span>
          <span className="text-[10px] text-slate-300">·</span>
          <span className="text-[10px] text-slate-400">{new Date(qr.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <button onClick={handleCopy} className="text-[10px] text-violet-500 hover:text-violet-700 transition-colors">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button onClick={handleDownload} disabled={downloading} className="px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-50">
          {downloading ? '...' : 'Download'}
        </button>
        <button onClick={onDelete} className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">Delete</button>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function QrCodesPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [showCreate, setShowCreate] = useState(false);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const [qrRes, srvRes] = await Promise.all([
        fetch(`${API_URL}/qr-codes?businessId=${business.id}`),
        fetch(`${API_URL}/surveys?businessId=${business.id}`),
      ]);
      const [qrData, srvData] = await Promise.all([qrRes.json(), srvRes.json()]) as [
        { success: boolean; qrCodes: QrCode[] },
        { success: boolean; surveys: Survey[] },
      ];
      if (qrData.success) setQrCodes(qrData.qrCodes);
      if (srvData.success) setSurveys(srvData.surveys);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleCreate(payload: Record<string, unknown>): Promise<QrCode | null> {
    if (!business?.id) return null;
    const res = await fetch(`${API_URL}/qr-codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id, ...payload }),
    });
    const data = await res.json() as { success: boolean; qrCode: QrCode };
    if (data.success) {
      setQrCodes([{ ...data.qrCode, scanCount: 0 }, ...qrCodes]);
      return data.qrCode;
    }
    return null;
  }

  async function handleDelete(id: string) {
    await fetch(`${API_URL}/qr-codes/${id}`, { method: 'DELETE' });
    setQrCodes(qrCodes.filter((q) => q.id !== id));
  }

  if (bizLoading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;
  if (!business) return null;

  const activeCount = qrCodes.filter((q) => q.active && (!q.expiresAt || new Date(q.expiresAt) > new Date())).length;
  const totalScans = qrCodes.reduce((s, q) => s + q.scanCount, 0);
  const thisWeek = qrCodes.filter((q) => new Date(q.createdAt) > new Date(Date.now() - 7 * 86400000)).reduce((s, q) => s + q.scanCount, 0);

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QR Codes</h1>
          <p className="text-sm text-slate-500 mt-1">Scannable codes for tables, menus, and the front desk — customers scan to join promos and enter your database</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
          Create QR Code
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Active QR Codes" value={activeCount} color="violet" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Total Scans" value={totalScans} color="emerald" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Scans This Week" value={thisWeek} color="sky" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Total Created" value={qrCodes.length} color="amber" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" /></svg>} />
      </div>

      {/* Purpose explainer */}
      <div className="bg-violet-50 border border-violet-100 rounded-xl p-5 mb-8">
        <h3 className="text-xs font-semibold text-violet-800 mb-3">QR Code Use Cases</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['SURVEY', 'SPIN_WHEEL', 'DISCOUNT', 'SIGNUP'] as QrPurpose[]).map((p) => {
            const cfg = PURPOSE_CONFIG[p];
            return (
              <div key={p} className="flex gap-2.5 items-start">
                <span className="text-lg flex-shrink-0">{cfg?.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-violet-900">{cfg?.label}</p>
                  <p className="text-[10px] text-violet-700 mt-0.5 leading-relaxed">{cfg?.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QR Code list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Your QR Codes</h2>
          {qrCodes.length > 0 && <span className="text-xs text-slate-400">{qrCodes.length} total</span>}
        </div>
        {loading ? (
          <div className="px-5 py-12 flex justify-center"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
        ) : qrCodes.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            No QR codes yet. Create one and place it in your business to start building your customer list.
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {qrCodes.map((qr) => (
              <QrCodeCard key={qr.id} qr={qr} onDelete={() => handleDelete(qr.id)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateQrModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          surveys={surveys}
        />
      )}
    </div>
  );
}
