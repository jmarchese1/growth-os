'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

const FONT_OPTIONS = [
  { value: 'system', label: 'System Default' },
  { value: 'inter', label: 'Inter' },
  { value: 'poppins', label: 'Poppins' },
  { value: 'playfair', label: 'Playfair Display' },
  { value: 'mono', label: 'Monospace' },
];

const FONT_MAP: Record<string, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", sans-serif',
  poppins: '"Poppins", sans-serif',
  playfair: '"Playfair Display", serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
};

const COLOR_PRESETS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#000000', '#0EA5E9'];

function useGoogleFont(fontFamily: string) {
  useEffect(() => {
    if (!fontFamily || !['inter', 'poppins', 'playfair'].includes(fontFamily)) return;
    const family = fontFamily === 'inter' ? 'Inter' : fontFamily === 'poppins' ? 'Poppins' : 'Playfair+Display';
    const href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [fontFamily]);
}

function qrImageUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&format=png&margin=8`;
}

function qrPublicUrl(token: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://app.embedo.io';
  return `${base}/qr/${token}`;
}

/* ── Color Picker Row ──────────────────────────────────────────── */
function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</label>
      <div className="flex items-center gap-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-6 h-6 rounded border-0 cursor-pointer flex-shrink-0" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-20 px-1.5 py-1 border border-slate-200 dark:border-white/[0.08] rounded text-[10px] text-slate-700 dark:text-slate-200 dark:bg-white/[0.06] font-mono" />
        {COLOR_PRESETS.slice(0, 6).map((c) => (
          <button key={c} onClick={() => onChange(c)} className="w-3.5 h-3.5 rounded-full border transition-all hover:scale-125 flex-shrink-0" style={{ background: c, borderColor: value === c ? '#333' : 'transparent' }} />
        ))}
      </div>
    </div>
  );
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
            className="flex-1 px-2.5 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
          />
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={p.probability}
              onChange={(e) => update(i, 'probability', parseInt(e.target.value) || 0)}
              min={1}
              max={100}
              className="w-16 px-2 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-800 dark:text-white dark:bg-white/[0.06] text-center focus:outline-none focus:ring-2 focus:ring-violet-500/30"
            />
            <span className="text-[10px] text-slate-400 dark:text-slate-500">%</span>
          </div>
          {prizes.length > 2 && (
            <button onClick={() => remove(i)} className="p-1 text-slate-400 dark:text-slate-500 hover:text-red-500 transition-colors">
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

/* ── Mini Spin Wheel for Preview ───────────────────────────────── */
const WHEEL_PALETTES = [
  ['#7C3AED', '#6D28D9'], ['#4F46E5', '#4338CA'], ['#0EA5E9', '#0284C7'],
  ['#10B981', '#059669'], ['#F59E0B', '#D97706'], ['#EF4444', '#DC2626'],
  ['#8B5CF6', '#7C3AED'], ['#06B6D4', '#0891B2'], ['#EC4899', '#DB2777'],
  ['#14B8A6', '#0D9488'],
];

function MiniSpinWheel({ prizes, accentColor, size = 160 }: { prizes: SpinPrize[]; accentColor: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const DPR = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = size * DPR;
    canvas.height = size * DPR;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(DPR, DPR);

    const cx = size / 2;
    const cy = size / 2;
    const r = cx - 8;
    const arc = (2 * Math.PI) / prizes.length;

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Segments
    for (let i = 0; i < prizes.length; i++) {
      const start = i * arc - Math.PI / 2;
      const end = start + arc;
      const [c1, c2] = WHEEL_PALETTES[i % WHEEL_PALETTES.length]!;

      const midAngle = start + arc / 2;
      const gx1 = cx + Math.cos(midAngle) * r * 0.3;
      const gy1 = cy + Math.sin(midAngle) * r * 0.3;
      const gx2 = cx + Math.cos(midAngle) * r * 0.9;
      const gy2 = cy + Math.sin(midAngle) * r * 0.9;
      const grad = ctx.createLinearGradient(gx1, gy1, gx2, gy2);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const fontSize = prizes.length > 6 ? 7 : prizes.length > 4 ? 8 : 9;
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.fillStyle = '#fff';
      ctx.fillText(prizes[i]!.label, r - 8, 0);
      ctx.restore();
    }

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 9, 0, 2 * Math.PI);
    ctx.fillStyle = accentColor;
    ctx.fill();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 2);
    ctx.lineTo(cx - 6, cy - r + 10);
    ctx.lineTo(cx + 6, cy - r + 10);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  }, [prizes, accentColor, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

/* ── Live Preview ──────────────────────────────────────────────── */
function LivePreview({ purpose, accentColor, bgColor, fontFamily, heading, subheading, buttonText, prizes, discountValue, discountCode }: {
  purpose: QrPurpose;
  accentColor: string;
  bgColor: string;
  fontFamily: string;
  heading: string;
  subheading: string;
  buttonText: string;
  prizes: SpinPrize[];
  discountValue: string;
  discountCode: string;
}) {
  useGoogleFont(fontFamily);
  const fontStack = FONT_MAP[fontFamily] || FONT_MAP.system;
  const isDark = bgColor === '#1a1a2e' || bgColor === '#0f172a' || bgColor < '#444444';
  const textColor = isDark ? 'rgba(255,255,255,0.6)' : '#64748b';
  const defaultHeading = purpose === 'SURVEY' ? "We'd love your feedback!" : purpose === 'SPIN_WHEEL' ? 'Spin to Win!' : purpose === 'DISCOUNT' ? 'Your Exclusive Offer' : 'Join Us!';
  const defaultSub = purpose === 'SPIN_WHEEL' ? 'Try your luck — what will you get?' : purpose === 'SIGNUP' ? 'Sign up for exclusive deals' : '';
  const defaultBtn = purpose === 'SURVEY' ? 'Submit Feedback' : purpose === 'SPIN_WHEEL' ? 'Spin the Wheel!' : purpose === 'SIGNUP' ? 'Sign Me Up' : 'Claim Now';

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08] shadow-sm">
      <div className="px-3 py-1.5 bg-slate-100 dark:bg-white/[0.06] border-b border-slate-200 dark:border-white/[0.08] flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-400" />
        <div className="w-2 h-2 rounded-full bg-amber-400" />
        <div className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-[9px] text-slate-400 ml-2">Preview</span>
      </div>
      <div className="p-4 flex flex-col items-center" style={{ backgroundColor: bgColor, fontFamily: fontStack, minHeight: purpose === 'SPIN_WHEEL' ? 300 : 200 }}>
        <p className="text-sm font-bold text-center mb-0.5" style={{ color: accentColor }}>{heading || defaultHeading}</p>
        <p className="text-[10px] text-center mb-3" style={{ color: textColor }}>{subheading || defaultSub}</p>

        {purpose === 'SPIN_WHEEL' && (
          <div className="mb-3">
            <MiniSpinWheel prizes={prizes} accentColor={accentColor} size={140} />
          </div>
        )}

        {purpose === 'DISCOUNT' && (
          <div className="rounded-xl px-4 py-3 mb-3 text-center w-full max-w-[180px]" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`, color: '#ffffff' }}>
            <p className="text-lg font-black">{discountValue || '10% Off'}</p>
            {discountCode && (
              <div className="mt-1.5 bg-white/20 rounded-lg px-2 py-1">
                <p className="text-[8px] opacity-70">Code</p>
                <p className="text-xs font-mono font-bold">{discountCode}</p>
              </div>
            )}
          </div>
        )}

        {(purpose === 'SIGNUP' || purpose === 'SURVEY') && (
          <div className="w-full max-w-[180px] space-y-1.5 mb-3">
            <div className="w-full h-6 bg-white/80 rounded border border-slate-200" />
            <div className="w-full h-6 bg-white/80 rounded border border-slate-200" />
            <div className="w-full h-6 bg-white/80 rounded border border-slate-200" />
          </div>
        )}

        <div className="px-6 py-1.5 rounded-full text-[10px] font-semibold text-white shadow-sm" style={{ backgroundColor: accentColor }}>
          {buttonText || defaultBtn}
        </div>

        <p className="text-[7px] mt-3" style={{ color: textColor }}>Powered by Embedo</p>
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
  const [cooldownPeriod, setCooldownPeriod] = useState('DAILY');
  const [expiresAt, setExpiresAt] = useState('');
  // Appearance
  const [accentColor, setAccentColor] = useState('#7C3AED');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('system');
  const [pageHeading, setPageHeading] = useState('');
  const [pageSubheading, setPageSubheading] = useState('');
  const [pageLogo, setPageLogo] = useState('');
  const [pageButtonText, setPageButtonText] = useState('');
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
    if (['SPIN_WHEEL', 'DISCOUNT'].includes(purpose) && cooldownPeriod) payload['cooldownPeriod'] = cooldownPeriod;
    if (['MENU', 'REVIEW', 'CUSTOM'].includes(purpose)) payload['destinationUrl'] = destinationUrl.trim();
    if (expiresAt) payload['expiresAt'] = expiresAt;
    const isDark = bgColor === '#1a1a2e' || bgColor === '#0f172a' || bgColor < '#444444';
    payload['metadata'] = {
      accentColor, bgColor, fontFamily,
      headingColor: accentColor,
      textColor: isDark ? 'rgba(255,255,255,0.6)' : '#64748b',
      buttonTextColor: '#ffffff',
      ...(pageHeading ? { pageHeading } : {}),
      ...(pageSubheading ? { pageSubheading } : {}),
      ...(pageLogo ? { pageLogo } : {}),
      ...(pageButtonText ? { pageButtonText } : {}),
    };

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
      <div className="bg-white dark:bg-[#1a1730] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{step === 'form' ? 'Create QR Code' : 'Preview & Download'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        {step === 'form' ? (
          <div className="flex-1 overflow-y-auto">
            <div className="flex divide-x divide-slate-200 dark:divide-white/[0.08]">
              {/* Left: Settings */}
              <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Purpose */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">QR Code Purpose</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(PURPOSE_CONFIG) as [QrPurpose, typeof PURPOSE_CONFIG[QrPurpose]][]).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => setPurpose(key)}
                        className={`text-left p-3 rounded-lg border transition-colors ${purpose === key ? 'border-violet-300 bg-violet-50 dark:bg-violet-500/10 dark:border-violet-500/30' : 'border-slate-200 dark:border-white/[0.08] hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}
                      >
                        <p className="text-xs font-semibold text-slate-800 dark:text-white">{cfg.icon} {cfg.label}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-relaxed">{cfg.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Internal Label</label>
                  <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Table Tent — Summer Promo" className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                </div>

                {/* Purpose-specific fields */}
                {purpose === 'SURVEY' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Link to Survey</label>
                      <select value={surveyId} onChange={(e) => setSurveyId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30">
                        <option value="">Select a survey...</option>
                        {surveys.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                      </select>
                      {surveys.length === 0 && <p className="text-[10px] text-amber-600 mt-1">No surveys yet — create one in the Surveys section first.</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Reward After Completing (optional)</label>
                      <input type="text" value={surveyReward} onChange={(e) => setSurveyReward(e.target.value)} placeholder="e.g. 10% off your next visit" className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                    </div>
                  </div>
                )}

                {purpose === 'DISCOUNT' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Discount Value</label>
                      <input type="text" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder='e.g. "10% off" or "$5 off"' className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Discount Code (optional)</label>
                      <input type="text" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="e.g. SCAN10" className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
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
                      <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Discount Code to Show Winners (optional)</label>
                      <input type="text" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="e.g. WINNER15" className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                    </div>
                  </div>
                )}

                {['MENU', 'REVIEW', 'CUSTOM'].includes(purpose) && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      {purpose === 'MENU' ? 'Menu URL' : purpose === 'REVIEW' ? 'Google Review URL' : 'Destination URL'}
                    </label>
                    <input type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://" className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                  </div>
                )}

                {purpose === 'SIGNUP' && (
                  <div className="bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-lg px-4 py-3">
                    <p className="text-xs text-sky-800 dark:text-sky-300 font-medium">How Sign-up works</p>
                    <p className="text-[11px] text-sky-700 dark:text-sky-400 mt-1">Customers scan, enter their name + email or phone number, and are automatically added to your Contacts with source "QR Code".</p>
                  </div>
                )}

                {/* Cooldown / usage limit */}
                {['SPIN_WHEEL', 'DISCOUNT'].includes(purpose) && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Usage Limit</label>
                    <select value={cooldownPeriod} onChange={(e) => setCooldownPeriod(e.target.value)} className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06]">
                      <option value="DAILY">Once per day</option>
                      <option value="WEEKLY">Once per week</option>
                      <option value="MONTHLY">Once per month</option>
                      <option value="ONCE">One-time only</option>
                      <option value="">Unlimited (no limit)</option>
                    </select>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">How often the same person can {purpose === 'SPIN_WHEEL' ? 'spin' : 'claim'}</p>
                  </div>
                )}

                {/* Page Appearance */}
                <div className="space-y-3 border border-slate-200 dark:border-white/[0.08] rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Page Appearance</p>

                  <div className="grid grid-cols-2 gap-3">
                    <ColorPicker label="Accent Color" value={accentColor} onChange={setAccentColor} />
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Background Color</label>
                      <div className="flex items-center gap-1.5">
                        <input type="color" value={bgColor.startsWith('#') ? bgColor : '#f8fafc'} onChange={(e) => setBgColor(e.target.value)} className="w-6 h-6 rounded border-0 cursor-pointer flex-shrink-0" />
                        <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-20 px-1.5 py-1 border border-slate-200 dark:border-white/[0.08] rounded text-[10px] text-slate-700 dark:text-slate-200 dark:bg-white/[0.06] font-mono" />
                        {['#ffffff', '#0f172a', '#eff6ff', '#ecfdf5'].map((c) => (
                          <button key={c} onClick={() => setBgColor(c)} className="w-3.5 h-3.5 rounded-full border transition-all hover:scale-125 flex-shrink-0" style={{ background: c, borderColor: bgColor === c ? '#333' : c === '#ffffff' || c === '#eff6ff' || c === '#ecfdf5' ? '#e2e8f0' : 'transparent' }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Font</label>
                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-800 dark:text-white dark:bg-white/[0.06]">
                      {FONT_OPTIONS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Heading (optional)</label>
                    <input type="text" value={pageHeading} onChange={(e) => setPageHeading(e.target.value)} placeholder={purpose === 'SURVEY' ? "We'd love your feedback!" : purpose === 'SPIN_WHEEL' ? 'Spin to Win!' : purpose === 'DISCOUNT' ? 'Your Exclusive Offer' : 'Join Us!'} className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06]" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Subheading (optional)</label>
                    <input type="text" value={pageSubheading} onChange={(e) => setPageSubheading(e.target.value)} placeholder="Short description below the heading" className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Logo URL (optional)</label>
                      <input type="url" value={pageLogo} onChange={(e) => setPageLogo(e.target.value)} placeholder="https://..." className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-800 dark:text-white dark:bg-white/[0.06]" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">Button Text (optional)</label>
                      <input type="text" value={pageButtonText} onChange={(e) => setPageButtonText(e.target.value)} placeholder={purpose === 'SURVEY' ? 'Submit Feedback' : purpose === 'SPIN_WHEEL' ? 'Spin to Win!' : purpose === 'SIGNUP' ? 'Sign Me Up' : 'Claim Now'} className="w-full px-3 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06]" />
                    </div>
                  </div>
                </div>

                {/* Expiration */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Expiration Date (optional)</label>
                  <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Leave blank for no expiration</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Cancel</button>
                  <button onClick={handleGenerate} disabled={saving || !canGenerate} className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-2">
                    {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    {saving ? 'Generating...' : 'Generate QR Code'}
                  </button>
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="w-[280px] flex-shrink-0 px-5 py-5 bg-slate-50/50 dark:bg-white/[0.02] flex flex-col">
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Live Preview</p>
                <LivePreview
                  purpose={purpose}
                  accentColor={accentColor}
                  bgColor={bgColor}
                  fontFamily={fontFamily}
                  heading={pageHeading}
                  subheading={pageSubheading}
                  buttonText={pageButtonText}
                  prizes={spinPrizes}
                  discountValue={discountValue}
                  discountCode={discountCode}
                />
              </div>
            </div>
          </div>
        ) : createdQr ? (
          <div className="px-6 py-5 overflow-y-auto">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="bg-white dark:bg-white/[0.04] border-2 border-slate-100 dark:border-white/[0.06] rounded-xl p-4 shadow-sm">
                <img src={qrImageUrl(qrPublicUrl(createdQr.token), 200)} alt={createdQr.label} width={200} height={200} className="rounded" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{createdQr.label}</p>
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
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/[0.08] rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">Done</button>
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
  const router = useRouter();
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
    <div
      className={`bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border rounded-xl p-4 flex gap-4 items-start cursor-pointer hover:border-violet-300 hover:shadow-sm transition-all ${isExpired ? 'border-red-200 opacity-60' : 'border-slate-200 dark:border-white/[0.08]'}`}
      onClick={() => router.push(`/qr-codes/${qr.id}`)}
    >
      <div className="bg-slate-50 dark:bg-white/[0.06] rounded-lg p-2 flex-shrink-0">
        <img src={qrImageUrl(url, 80)} alt={qr.label} width={80} height={80} className="rounded" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{qr.label}</p>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${cfg?.color}`}>{cfg?.icon} {cfg?.label}</span>
          {isExpired && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">Expired</span>}
        </div>
        {qr.survey && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Survey: {qr.survey.title}</p>}
        {qr.discountValue && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Discount: {qr.discountValue}{qr.discountCode ? ` — Code: ${qr.discountCode}` : ''}</p>}
        {qr.expiresAt && !isExpired && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Expires {new Date(qr.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{qr.scanCount} scan{qr.scanCount !== 1 ? 's' : ''}</span>
          <span className="text-[10px] text-slate-300 dark:text-slate-600">·</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">{new Date(qr.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <button onClick={handleCopy} className="text-[10px] text-violet-500 hover:text-violet-700 transition-colors">
            {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleDownload} disabled={downloading} className="px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors disabled:opacity-50">
          {downloading ? '...' : 'Download'}
        </button>
        <button onClick={onDelete} className="px-3 py-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">Delete</button>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function QrCodesTab() {
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Scannable codes for tables, menus, and promos</p>
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
      <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 rounded-xl p-5 mb-8">
        <h3 className="text-xs font-semibold text-violet-800 dark:text-violet-300 mb-3">QR Code Use Cases</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['SURVEY', 'SPIN_WHEEL', 'DISCOUNT', 'SIGNUP'] as QrPurpose[]).map((p) => {
            const cfg = PURPOSE_CONFIG[p];
            return (
              <div key={p} className="flex gap-2.5 items-start">
                <span className="text-lg flex-shrink-0">{cfg?.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-violet-900 dark:text-violet-200">{cfg?.label}</p>
                  <p className="text-[10px] text-violet-700 dark:text-violet-400 mt-0.5 leading-relaxed">{cfg?.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QR Code list */}
      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your QR Codes</h2>
          {qrCodes.length > 0 && <span className="text-xs text-slate-400 dark:text-slate-500">{qrCodes.length} total</span>}
        </div>
        {loading ? (
          <div className="px-5 py-12 flex justify-center"><div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
        ) : qrCodes.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
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
