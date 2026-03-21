'use client';

import { useState, useEffect, useRef, use } from 'react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

type QrPurpose = 'SURVEY' | 'DISCOUNT' | 'SPIN_WHEEL' | 'SIGNUP' | 'MENU' | 'REVIEW' | 'CUSTOM';

interface SpinPrize { label: string; probability: number }

interface PageMeta {
  // Legacy single color (backward compat)
  pageColor?: string;
  // Granular colors
  accentColor?: string;
  bgColor?: string;
  headingColor?: string;
  textColor?: string;
  buttonTextColor?: string;
  // Other
  pageBackground?: 'gradient' | 'solid' | 'dark';
  pageHeading?: string;
  pageSubheading?: string;
  pageLogo?: string;
  pageButtonText?: string;
  fontFamily?: string;
}

interface QrData {
  id: string;
  label: string;
  purpose: QrPurpose;
  businessName: string;
  expiresAt: string | null;
  survey: { id: string; title: string; description: string | null; questions: unknown[] } | null;
  surveyReward: string | null;
  discountValue: string | null;
  discountCode: string | null;
  spinPrizes: SpinPrize[] | null;
  destinationUrl: string | null;
  metadata: PageMeta | null;
  cooldownPeriod: string | null;
  cooldownUntil: string | null;
}

interface Question {
  id: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'yes_no';
  label: string;
  options?: string[];
  required: boolean;
}

/* ── Device fingerprint + cooldown helpers ───────────────────── */
function getDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'ssr';
  const parts = [navigator.userAgent, screen.width + 'x' + screen.height, Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language];
  let hash = 0;
  const str = parts.join('|');
  for (let i = 0; i < str.length; i++) { hash = ((hash << 5) - hash) + str.charCodeAt(i); hash |= 0; }
  return 'fp_' + Math.abs(hash).toString(36);
}

function getStorageKey(token: string) { return `embedo_qr_${token}`; }

function getLocalCooldown(token: string): string | null {
  try {
    const raw = localStorage.getItem(getStorageKey(token));
    if (!raw) return null;
    const data = JSON.parse(raw) as { claimedAt: string; cooldownPeriod?: string };
    if (!data.cooldownPeriod) return null;
    const cooldownMs: Record<string, number> = { ONCE: Infinity, DAILY: 86400000, WEEKLY: 604800000, MONTHLY: 2592000000 };
    const window = cooldownMs[data.cooldownPeriod];
    if (!window) return null;
    if (window === Infinity) return 'forever';
    const expiresAt = new Date(new Date(data.claimedAt).getTime() + window);
    return expiresAt > new Date() ? expiresAt.toISOString() : null;
  } catch { return null; }
}

function setLocalCooldown(token: string, cooldownPeriod: string) {
  try {
    const data = JSON.stringify({ claimedAt: new Date().toISOString(), cooldownPeriod });
    localStorage.setItem(getStorageKey(token), data);
    const maxAge = cooldownPeriod === 'ONCE' ? 31536000 : cooldownPeriod === 'MONTHLY' ? 2592000 : cooldownPeriod === 'WEEKLY' ? 604800 : 86400;
    document.cookie = `${getStorageKey(token)}=${encodeURIComponent(data)}; max-age=${maxAge}; path=/; SameSite=Lax`;
  } catch {}
}

function formatCountdown(until: string): string {
  if (until === 'forever') return 'already claimed';
  const ms = new Date(until).getTime() - Date.now();
  if (ms <= 0) return 'now';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) { const days = Math.floor(hours / 24); return `${days} day${days > 1 ? 's' : ''}`; }
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/** Resolve colors from metadata with backward compat */
function resolveColors(meta: PageMeta) {
  const accent = meta.accentColor || meta.pageColor || '#7C3AED';
  const bg = meta.bgColor || (meta.pageBackground === 'dark' ? '#1a1a2e' : meta.pageBackground === 'solid' ? accent : '#f8fafc');
  const heading = meta.headingColor || accent;
  const text = meta.textColor || (meta.pageBackground === 'dark' || meta.pageBackground === 'solid' ? 'rgba(255,255,255,0.7)' : '#64748b');
  const btnText = meta.buttonTextColor || '#ffffff';
  return { accent, bg, heading, text, btnText };
}

const FONT_MAP: Record<string, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", sans-serif',
  poppins: '"Poppins", sans-serif',
  playfair: '"Playfair Display", serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
};

/* ── Spin Wheel ──────────────────────────────────────────────────── */
function pickWeightedPrize(prizes: SpinPrize[]): number {
  const total = prizes.reduce((s, p) => s + p.probability, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < prizes.length; i++) {
    rand -= prizes[i]!.probability;
    if (rand <= 0) return i;
  }
  return 0;
}

const WHEEL_PALETTES = [
  ['#7C3AED', '#6D28D9'], ['#4F46E5', '#4338CA'], ['#0EA5E9', '#0284C7'],
  ['#10B981', '#059669'], ['#F59E0B', '#D97706'], ['#EF4444', '#DC2626'],
  ['#8B5CF6', '#7C3AED'], ['#06B6D4', '#0891B2'], ['#EC4899', '#DB2777'],
  ['#14B8A6', '#0D9488'],
];

function SpinWheel({ prizes, onResult, accentColor = '#7C3AED', buttonText, btnTextColor = '#ffffff', interactive = true }: {
  prizes: SpinPrize[];
  onResult?: (prize: SpinPrize) => void;
  accentColor?: string;
  buttonText?: string;
  btnTextColor?: string;
  interactive?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [spun, setSpun] = useState(false);
  const rotationRef = useRef(0);
  const animRef = useRef<number>(0);
  const DPR = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const SIZE = 320;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = SIZE * DPR;
    canvas.height = SIZE * DPR;
    canvas.style.width = SIZE + 'px';
    canvas.style.height = SIZE + 'px';
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(DPR, DPR);
    drawWheel(rotationRef.current);
  }, [prizes, accentColor]);

  function drawWheel(rotation: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const r = cx - 16;
    const arc = (2 * Math.PI) / prizes.length;

    ctx.save();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    // Outer ring glow
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, 2 * Math.PI);
    ctx.strokeStyle = accentColor + '30';
    ctx.lineWidth = 16;
    ctx.stroke();

    // Outer metallic ring
    const ringGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    ringGrad.addColorStop(0, '#e2e8f0');
    ringGrad.addColorStop(0.3, '#ffffff');
    ringGrad.addColorStop(0.5, '#cbd5e1');
    ringGrad.addColorStop(0.7, '#ffffff');
    ringGrad.addColorStop(1, '#e2e8f0');
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, 2 * Math.PI);
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Tick marks on outer ring
    for (let i = 0; i < prizes.length; i++) {
      const angle = rotation + i * arc;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(r - 2, 0);
      ctx.lineTo(r + 6, 0);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    // Segments
    for (let i = 0; i < prizes.length; i++) {
      const start = rotation + i * arc;
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

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.92, start + 0.02, end - 0.02);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const fontSize = prizes.length > 6 ? 11 : prizes.length > 4 ? 13 : 15;
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillText(prizes[i]!.label, r - 16, 1);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(prizes[i]!.label, r - 17, 0);
      ctx.restore();
    }

    // Inner shadow
    const innerShadow = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r * 0.4);
    innerShadow.addColorStop(0, 'rgba(0,0,0,0.15)');
    innerShadow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.4, 0, 2 * Math.PI);
    ctx.fillStyle = innerShadow;
    ctx.fill();

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    const hubGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 20);
    hubGrad.addColorStop(0, accentColor);
    hubGrad.addColorStop(1, accentColor + 'cc');
    ctx.beginPath();
    ctx.arc(cx, cy, 20, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx - 4, cy - 5, 8, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fill();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 6);
    ctx.lineTo(cx - 14, cy - r + 18);
    ctx.lineTo(cx + 14, cy - r + 18);
    ctx.closePath();
    const ptrGrad = ctx.createLinearGradient(cx, cy - r - 6, cx, cy - r + 18);
    ptrGrad.addColorStop(0, '#ffffff');
    ptrGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = ptrGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy - r + 10, 3, 0, 2 * Math.PI);
    ctx.fillStyle = accentColor;
    ctx.fill();

    ctx.restore();
  }

  // Audio
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastTickRef = useRef(-1);

  function playTick(speed: number) {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 600 + speed * 400;
      osc.type = 'sine';
      gain.gain.value = Math.min(0.08 + (1 - speed) * 0.12, 0.2);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }

  function playWinSound() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      [0, 150, 300, 450].forEach((delay, i) => {
        setTimeout(() => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = [523, 659, 784, 1047][i]!;
          osc.type = 'sine';
          gain.gain.value = 0.12;
          osc.start();
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
          osc.stop(ctx.currentTime + 0.3);
        }, delay);
      });
    } catch {}
  }

  function spin() {
    if (spinning || spun || !interactive) return;
    setSpinning(true);
    lastTickRef.current = -1;

    const winnerIdx = pickWeightedPrize(prizes);
    const arc = (2 * Math.PI) / prizes.length;
    const extraSpins = 8 * 2 * Math.PI;
    const targetAngle = -Math.PI / 2 - winnerIdx * arc - arc / 2;
    const totalTravel = extraSpins + ((targetAngle - rotationRef.current) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

    const startTime = performance.now();
    const duration = 5000;
    const startRotation = rotationRef.current;

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Cubic ease-out — smooth deceleration, no stalling tail
      const eased = 1 - Math.pow(1 - t, 3);

      rotationRef.current = startRotation + eased * totalTravel;
      drawWheel(rotationRef.current);

      const currentSegment = Math.floor((((-rotationRef.current - Math.PI / 2) % (2 * Math.PI)) + 4 * Math.PI) % (2 * Math.PI) / arc);
      if (currentSegment !== lastTickRef.current) {
        lastTickRef.current = currentSegment;
        playTick(1 - t);
      }

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setSpun(true);
        playWinSound();
        onResult?.(prizes[winnerIdx]!);
      }
    }

    animRef.current = requestAnimationFrame(animate);
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative" style={{ filter: spinning ? 'none' : 'drop-shadow(0 20px 40px rgba(0,0,0,0.15))' }}>
        <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ width: SIZE, height: SIZE }} />
        <div className="absolute inset-0 -z-10 rounded-full blur-3xl opacity-20" style={{ background: accentColor }} />
      </div>
      {interactive && (
        <button
          onClick={spin}
          disabled={spinning || spun}
          className="w-full max-w-[280px] py-4 text-sm font-bold rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl active:scale-[0.97] hover:shadow-2xl hover:brightness-110"
          style={{ backgroundColor: accentColor, color: btnTextColor, boxShadow: `0 8px 30px ${accentColor}40` }}
        >
          {spinning ? 'Spinning...' : spun ? 'Done!' : (buttonText || 'Spin the Wheel!')}
        </button>
      )}
    </div>
  );
}

/* ── Survey Form ─────────────────────────────────────────────────── */
function SurveyForm({ survey, onSubmit, accentColor = '#7C3AED', btnTextColor = '#ffffff', buttonText }: {
  survey: QrData['survey'];
  onSubmit: (answers: Record<string, unknown>, name: string, email: string, phone: string) => Promise<void>;
  accentColor?: string;
  btnTextColor?: string;
  buttonText?: string;
}) {
  const questions = (survey?.questions ?? []) as Question[];
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function setAnswer(id: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(answers, name, email, phone);
    setSubmitting(false);
  }

  const inputClass = 'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 bg-white';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {questions.map((q) => (
        <div key={q.id}>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {q.label} {q.required && <span className="text-red-400">*</span>}
          </label>

          {q.type === 'rating' && (
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setAnswer(q.id, star)}
                  className={`text-2xl transition-transform active:scale-110 ${Number(answers[q.id]) >= star ? 'text-amber-400' : 'text-slate-200'}`}
                >
                  ★
                </button>
              ))}
            </div>
          )}

          {q.type === 'text' && (
            <textarea
              value={(answers[q.id] as string) ?? ''}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              rows={3}
              required={q.required}
              className={`${inputClass} resize-none`}
              placeholder="Your answer..."
            />
          )}

          {q.type === 'multiple_choice' && (
            <div className="space-y-2">
              {(q.options ?? []).map((opt) => (
                <label key={opt} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-colors">
                  <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} className="text-violet-600" required={q.required} />
                  <span className="text-sm text-slate-700">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === 'yes_no' && (
            <div className="flex gap-3">
              {['Yes', 'No'].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAnswer(q.id, opt)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${answers[q.id] === opt ? '' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  style={answers[q.id] === opt ? { backgroundColor: accentColor, borderColor: accentColor, color: btnTextColor } : {}}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="border-t border-slate-100 pt-5 space-y-3">
        <p className="text-xs font-medium text-slate-500">Your info (optional — to receive your reward)</p>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={inputClass} />
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className={inputClass} />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
        style={{ backgroundColor: accentColor, color: btnTextColor }}
      >
        {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {submitting ? 'Submitting...' : (buttonText || 'Submit Feedback')}
      </button>
    </form>
  );
}

/* ── Sign-up Form ────────────────────────────────────────────────── */
function SignupForm({ businessName, reward, onSubmit, accentColor = '#7C3AED', btnTextColor = '#ffffff', buttonText }: {
  businessName: string;
  reward?: string;
  onSubmit: (name: string, email: string, phone: string) => Promise<void>;
  accentColor?: string;
  btnTextColor?: string;
  buttonText?: string;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputClass = 'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 bg-white';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email && !phone) return;
    setSubmitting(true);
    await onSubmit(name, email, phone);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {reward && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-emerald-600 font-medium">Your reward</p>
          <p className="text-lg font-bold text-emerald-700 mt-0.5">{reward}</p>
        </div>
      )}
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={inputClass} />
      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className={inputClass} />
      <button
        type="submit"
        disabled={submitting || (!email && !phone)}
        className="w-full py-3.5 text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors shadow-lg flex items-center justify-center gap-2"
        style={{ backgroundColor: accentColor, color: btnTextColor }}
      >
        {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {submitting ? 'Joining...' : (buttonText || `Join ${businessName}`)}
      </button>
    </form>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function QrLandingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [qr, setQr] = useState<QrData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<'landing' | 'survey' | 'signup' | 'result'>('landing');
  const [wonPrize, setWonPrize] = useState<SpinPrize | null>(null);
  const [done, setDone] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState('');
  const redirected = useRef(false);
  const fp = useRef('');

  useEffect(() => {
    fp.current = getDeviceFingerprint();

    // Check localStorage first for instant feedback
    const localCooldown = getLocalCooldown(token);
    if (localCooldown) setCooldownUntil(localCooldown);

    fetch(`${API_URL}/qr-codes/public/${token}?fp=${fp.current}`)
      .then((r) => r.json())
      .then((data: { success: boolean; qr?: QrData; error?: string }) => {
        if (!data.success || !data.qr) {
          setError(data.error ?? 'QR code not found');
        } else {
          setQr(data.qr);
          // Server cooldown takes priority over local
          if (data.qr.cooldownUntil) {
            setCooldownUntil(data.qr.cooldownUntil);
          } else if (data.qr.cooldownPeriod && ['SPIN_WHEEL', 'DISCOUNT'].includes(data.qr.purpose)) {
            // First visit — mark localStorage so refresh triggers cooldown locally
            setLocalCooldown(token, data.qr.cooldownPeriod);
          }
          if (['MENU', 'REVIEW', 'CUSTOM'].includes(data.qr.purpose) && data.qr.destinationUrl && !redirected.current) {
            redirected.current = true;
            window.location.href = data.qr.destinationUrl;
          }
        }
      })
      .catch(() => setError('Failed to load QR code'))
      .finally(() => setLoading(false));
  }, [token]);

  // Live countdown timer
  useEffect(() => {
    if (!cooldownUntil || cooldownUntil === 'forever') {
      if (cooldownUntil === 'forever') setCountdownText('already claimed');
      return;
    }
    function tick() { setCountdownText(formatCountdown(cooldownUntil!)); }
    tick();
    const interval = setInterval(tick, 30000);
    return () => clearInterval(interval);
  }, [cooldownUntil]);

  async function signupViaQr(name: string, email: string, phone: string, outcome: string) {
    await fetch(`${API_URL}/qr-codes/public/${token}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, outcome, deviceFingerprint: fp.current }),
    });
  }

  async function handleSurveySubmit(answers: Record<string, unknown>, name: string, email: string, phone: string) {
    if (qr?.survey) {
      await fetch(`${API_URL}/surveys/${qr.survey.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, name, email, phone }),
      });
      if (email || phone) await signupViaQr(name, email, phone, 'completed_survey');
    }
    setDone(true);
    setPhase('result');
  }

  async function handleSignup(name: string, email: string, phone: string) {
    await signupViaQr(name, email, phone, 'signup');
    setDone(true);
    setPhase('result');
  }

  async function handleSpinResult(prize: SpinPrize) {
    setWonPrize(prize);
    setPhase('signup');
    // Mark cooldown locally immediately after spin
    if (qr?.cooldownPeriod) setLocalCooldown(token, qr.cooldownPeriod);
  }

  async function handleSpinSignup(name: string, email: string, phone: string) {
    await signupViaQr(name, email, phone, 'won_prize');
    setDone(true);
    setPhase('result');
  }

  async function handleDiscountClaim(name: string, email: string, phone: string) {
    await signupViaQr(name, email, phone, 'claimed_discount');
    if (qr?.cooldownPeriod) setLocalCooldown(token, qr.cooldownPeriod);
    setDone(true);
    setPhase('result');
  }

  // Resolve all colors from metadata
  const meta = (qr?.metadata ?? {}) as PageMeta;
  const colors = resolveColors(meta);
  const fontStack = FONT_MAP[meta.fontFamily || 'system'] || FONT_MAP.system;

  // Load Google font into <head>
  useEffect(() => {
    if (!meta.fontFamily || !['inter', 'poppins', 'playfair'].includes(meta.fontFamily)) return;
    const family = meta.fontFamily === 'inter' ? 'Inter' : meta.fontFamily === 'poppins' ? 'Poppins' : 'Playfair+Display';
    const href = `https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap`;
    if (document.querySelector(`link[href="${href}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }, [meta.fontFamily]);

  // Branded wrapper — vertically centered with subtle animated bg
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    const isDarkBg = colors.bg === '#1a1a2e' || colors.bg === '#0f172a' || colors.bg < '#444444';
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
        style={{ backgroundColor: colors.bg, fontFamily: fontStack }}
      >
        {/* Subtle animated gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute rounded-full blur-3xl animate-pulse"
            style={{
              width: 400, height: 400, top: '-10%', right: '-10%', opacity: 0.08,
              background: `radial-gradient(circle, ${colors.accent}, transparent)`,
              animationDuration: '6s',
            }}
          />
          <div
            className="absolute rounded-full blur-3xl animate-pulse"
            style={{
              width: 350, height: 350, bottom: '-8%', left: '-8%', opacity: 0.06,
              background: `radial-gradient(circle, ${colors.accent}, transparent)`,
              animationDuration: '8s', animationDelay: '2s',
            }}
          />
          <div
            className="absolute rounded-full blur-3xl animate-pulse"
            style={{
              width: 200, height: 200, top: '40%', left: '60%', opacity: 0.04,
              background: `radial-gradient(circle, ${isDarkBg ? '#ffffff' : colors.accent}, transparent)`,
              animationDuration: '10s', animationDelay: '4s',
            }}
          />
        </div>

        <div className="w-full max-w-sm relative z-10">
          {qr && meta.pageLogo && (
            <div className="text-center mb-6">
              <img src={meta.pageLogo} alt="" className="w-14 h-14 rounded-2xl mx-auto mb-3 object-cover shadow-lg" />
              <p className="text-xs font-medium" style={{ color: colors.text }}>{qr.businessName}</p>
            </div>
          )}
          {children}
          <p className="text-center text-[10px] mt-8 opacity-40" style={{ color: isDarkBg ? '#ffffff' : '#64748b' }}>Powered by Embedo</p>
        </div>
      </div>
    );
  };

  if (loading) return (
    <Wrapper>
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: colors.accent + '40', borderTopColor: colors.accent }} />
      </div>
    </Wrapper>
  );

  if (error) return (
    <Wrapper>
      <div className="text-center py-12">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-red-500"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
        </div>
        <p className="font-semibold" style={{ color: colors.heading }}>{error}</p>
      </div>
    </Wrapper>
  );

  if (!qr) return null;

  // Result / thank-you screen
  if (phase === 'result') return (
    <Wrapper>
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-emerald-500"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        </div>
        <h2 className="text-xl font-bold mb-2" style={{ color: colors.heading }}>
          {qr.purpose === 'SURVEY' ? 'Thanks for your feedback!' : qr.purpose === 'SPIN_WHEEL' ? "You're in!" : 'You\'re all set!'}
        </h2>
        {wonPrize && (
          <div className="mt-4 rounded-2xl px-6 py-5 text-center" style={{ background: `linear-gradient(135deg, ${colors.accent}15, ${colors.accent}25)`, border: `1px solid ${colors.accent}30` }}>
            <p className="text-xs font-medium mb-1" style={{ color: colors.accent }}>You won</p>
            <p className="text-2xl font-bold" style={{ color: colors.accent }}>{wonPrize.label}</p>
            {qr.discountCode && <p className="mt-3 text-sm" style={{ color: colors.accent }}>Use code: <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-lg border" style={{ borderColor: colors.accent + '40' }}>{qr.discountCode}</span></p>}
          </div>
        )}
        {!wonPrize && (qr.surveyReward || qr.discountValue) && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-5 text-center">
            <p className="text-xs text-emerald-600 font-medium mb-1">Your reward</p>
            <p className="text-xl font-bold text-emerald-700">{qr.surveyReward ?? qr.discountValue}</p>
            {qr.discountCode && <p className="mt-2 text-sm text-emerald-600">Code: <span className="font-mono font-bold">{qr.discountCode}</span></p>}
          </div>
        )}
        <p className="text-sm mt-5" style={{ color: colors.text }}>Show this screen to your server or cashier.</p>
      </div>
    </Wrapper>
  );

  // DISCOUNT
  if (qr.purpose === 'DISCOUNT') {
    // Cooldown active — already claimed
    if (cooldownUntil && phase === 'landing') return (
      <Wrapper>
        <div className="text-center space-y-5 py-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: colors.accent + '15' }}>
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7" style={{ color: colors.accent }}><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" /></svg>
          </div>
          <h2 className="text-xl font-bold" style={{ color: colors.heading }}>Already Claimed</h2>
          <p className="text-sm" style={{ color: colors.text }}>
            {cooldownUntil === 'forever' ? "You've already claimed this discount." : `Come back in ${countdownText} to claim again.`}
          </p>
        </div>
      </Wrapper>
    );

    return (
      <Wrapper>
        <div className="text-center space-y-5">
          <h2 className="text-2xl font-bold" style={{ color: colors.heading }}>{meta.pageHeading || 'Your Discount'}</h2>
          {meta.pageSubheading && <p className="text-sm -mt-2" style={{ color: colors.text }}>{meta.pageSubheading}</p>}
          <div className="rounded-2xl px-8 py-8 shadow-xl" style={{ background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)`, boxShadow: `0 10px 25px ${colors.accent}40`, color: colors.btnText }}>
            <p className="text-5xl font-black">{qr.discountValue}</p>
            {qr.discountCode && (
              <div className="mt-4 bg-white/20 rounded-xl px-4 py-2">
                <p className="text-xs opacity-70 mb-0.5">Discount Code</p>
                <p className="text-2xl font-mono font-bold">{qr.discountCode}</p>
              </div>
            )}
          </div>
          <p className="text-sm" style={{ color: colors.text }}>Show this screen to your server or cashier</p>
          <div className="pt-4">
            <p className="text-xs mb-3" style={{ color: colors.text }}>Want us to send deals directly to you?</p>
            <SignupForm businessName={qr.businessName} accentColor={colors.accent} btnTextColor={colors.btnText} buttonText={meta.pageButtonText} onSubmit={handleDiscountClaim} />
          </div>
        </div>
      </Wrapper>
    );
  }

  // SPIN_WHEEL
  if (qr.purpose === 'SPIN_WHEEL') {
    const prizes = qr.spinPrizes ?? [{ label: '10% Off', probability: 50 }, { label: '5% Off', probability: 50 }];

    // Cooldown active — show wheel frozen with comeback message
    if (cooldownUntil && phase === 'landing') return (
      <Wrapper>
        <div className="space-y-6 text-center">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: colors.heading }}>{meta.pageHeading || 'Spin to Win!'}</h2>
            <p className="text-sm mt-1" style={{ color: colors.text }}>
              {cooldownUntil === 'forever' ? "You've already spun this wheel." : `Come back in ${countdownText} for another spin!`}
            </p>
          </div>
          <SpinWheel prizes={prizes} accentColor={colors.accent} btnTextColor={colors.btnText} interactive={false} />
        </div>
      </Wrapper>
    );

    if (phase === 'signup' && wonPrize) return (
      <Wrapper>
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-xl font-bold" style={{ color: colors.heading }}>You won {wonPrize.label}!</h2>
            <p className="text-sm mt-1" style={{ color: colors.text }}>Enter your info to claim your prize</p>
          </div>
          <SignupForm businessName={qr.businessName} reward={wonPrize.label} accentColor={colors.accent} btnTextColor={colors.btnText} buttonText={meta.pageButtonText} onSubmit={handleSpinSignup} />
        </div>
      </Wrapper>
    );

    return (
      <Wrapper>
        <div className="space-y-6 text-center">
          <div>
            <h2 className="text-2xl font-bold" style={{ color: colors.heading }}>{meta.pageHeading || 'Spin to Win!'}</h2>
            <p className="text-sm mt-1" style={{ color: colors.text }}>{meta.pageSubheading || 'Try your luck — what will you get?'}</p>
          </div>
          <SpinWheel prizes={prizes} accentColor={colors.accent} btnTextColor={colors.btnText} buttonText={meta.pageButtonText} onResult={handleSpinResult} />
        </div>
      </Wrapper>
    );
  }

  // SURVEY
  if (qr.purpose === 'SURVEY') {
    if (!qr.survey) return (
      <Wrapper>
        <div className="text-center py-10" style={{ color: colors.text }}>Survey not found</div>
      </Wrapper>
    );

    return (
      <Wrapper>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.heading }}>{qr.survey.title}</h2>
            {qr.survey.description && <p className="text-sm mt-1" style={{ color: colors.text }}>{qr.survey.description}</p>}
            {qr.surveyReward && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <span className="text-lg">🎁</span>
                <p className="text-xs text-amber-800">Complete this survey to get <strong>{qr.surveyReward}</strong></p>
              </div>
            )}
          </div>
          <SurveyForm survey={qr.survey} accentColor={colors.accent} btnTextColor={colors.btnText} buttonText={meta.pageButtonText} onSubmit={handleSurveySubmit} />
        </div>
      </Wrapper>
    );
  }

  // SIGNUP
  return (
    <Wrapper>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold" style={{ color: colors.heading }}>{meta.pageHeading || `Join ${qr.businessName}`}</h2>
          <p className="text-sm mt-1" style={{ color: colors.text }}>{meta.pageSubheading || 'Sign up to receive exclusive deals and updates'}</p>
        </div>
        <SignupForm businessName={qr.businessName} accentColor={colors.accent} btnTextColor={colors.btnText} buttonText={meta.pageButtonText} onSubmit={handleSignup} />
      </div>
    </Wrapper>
  );
}
