'use client';

import { useState, useEffect, useRef, use } from 'react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

type QrPurpose = 'SURVEY' | 'DISCOUNT' | 'SPIN_WHEEL' | 'SIGNUP' | 'MENU' | 'REVIEW' | 'CUSTOM';

interface SpinPrize { label: string; probability: number }

interface PageMeta {
  pageColor?: string;
  pageBackground?: 'gradient' | 'solid' | 'dark';
  pageHeading?: string;
  pageSubheading?: string;
  pageLogo?: string;
  pageButtonText?: string;
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
}

interface Question {
  id: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'yes_no';
  label: string;
  options?: string[];
  required: boolean;
}

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

const WHEEL_COLORS = ['#7C3AED', '#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

function SpinWheel({ prizes, onResult }: { prizes: SpinPrize[]; onResult: (prize: SpinPrize) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [spun, setSpun] = useState(false);
  const rotationRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    drawWheel(rotationRef.current);
  }, []);

  function drawWheel(rotation: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(cx, cy) - 8;
    const arc = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < prizes.length; i++) {
      const start = rotation + i * arc;
      const end = start + arc;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length]!;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${prizes.length > 6 ? 10 : 12}px sans-serif`;
      ctx.fillText(prizes[i]!.label, r - 10, 4);
      ctx.restore();
    }

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#7C3AED';
    ctx.fill();

    // Pointer (top)
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 2);
    ctx.lineTo(cx - 10, cy - r + 14);
    ctx.lineTo(cx + 10, cy - r + 14);
    ctx.closePath();
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function spin() {
    if (spinning || spun) return;
    setSpinning(true);

    const winnerIdx = pickWeightedPrize(prizes);
    const arc = (2 * Math.PI) / prizes.length;
    // Pointer is at top (−π/2). The winner segment center should end at top.
    // Segment i spans from rotation + i*arc to rotation + (i+1)*arc.
    // We want: rotation + i*arc + arc/2 = -π/2 + 2πn
    // targetRotation = -π/2 - winnerIdx*arc - arc/2 (plus extra full spins)
    const extraSpins = 5 * 2 * Math.PI;
    const targetAngle = -Math.PI / 2 - winnerIdx * arc - arc / 2;
    const fullTarget = rotationRef.current + extraSpins + ((targetAngle - rotationRef.current) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

    const startTime = performance.now();
    const duration = 4000;
    const startRotation = rotationRef.current;

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      rotationRef.current = startRotation + eased * (fullTarget - startRotation + extraSpins);
      drawWheel(rotationRef.current);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setSpun(true);
        onResult(prizes[winnerIdx]!);
      }
    }

    animRef.current = requestAnimationFrame(animate);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <canvas ref={canvasRef} width={280} height={280} className="drop-shadow-xl" />
      </div>
      <button
        onClick={spin}
        disabled={spinning || spun}
        className="px-8 py-3 text-white text-sm font-bold rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95" style={{ backgroundColor: brandColor }}
      >
        {spinning ? 'Spinning...' : spun ? 'Spun!' : 'Spin to Win!'}
      </button>
    </div>
  );
}

/* ── Survey Form ─────────────────────────────────────────────────── */
function SurveyForm({ survey, onSubmit }: { survey: QrData['survey']; onSubmit: (answers: Record<string, unknown>, name: string, email: string, phone: string) => Promise<void> }) {
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
                  <input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswer(q.id, opt)}
                    className="text-violet-600"
                    required={q.required}
                  />
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
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${answers[q.id] === opt ? 'border-violet-300 bg-violet-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Contact info */}
      <div className="border-t border-slate-100 pt-5 space-y-3">
        <p className="text-xs font-medium text-slate-500">Your info (optional — to receive your reward)</p>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={inputClass} />
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className={inputClass} />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg" style={{ backgroundColor: brandColor }}
      >
        {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {submitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
}

/* ── Sign-up Form ────────────────────────────────────────────────── */
function SignupForm({ businessName, reward, onSubmit }: { businessName: string; reward?: string; onSubmit: (name: string, email: string, phone: string) => Promise<void> }) {
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
        className="w-full py-3.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 disabled:opacity-50 transition-colors shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2"
      >
        {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {submitting ? 'Joining...' : `Join ${businessName}`}
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
  const redirected = useRef(false);

  useEffect(() => {
    fetch(`${API_URL}/qr-codes/public/${token}`)
      .then((r) => r.json())
      .then((data: { success: boolean; qr?: QrData; error?: string }) => {
        if (!data.success || !data.qr) {
          setError(data.error ?? 'QR code not found');
        } else {
          setQr(data.qr);
          // Immediate redirects
          if (['MENU', 'REVIEW', 'CUSTOM'].includes(data.qr.purpose) && data.qr.destinationUrl && !redirected.current) {
            redirected.current = true;
            window.location.href = data.qr.destinationUrl;
          }
        }
      })
      .catch(() => setError('Failed to load QR code'))
      .finally(() => setLoading(false));
  }, [token]);

  async function signupViaQr(name: string, email: string, phone: string, outcome: string) {
    await fetch(`${API_URL}/qr-codes/public/${token}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, outcome }),
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
  }

  async function handleSpinSignup(name: string, email: string, phone: string) {
    await signupViaQr(name, email, phone, 'won_prize');
    setDone(true);
    setPhase('result');
  }

  // Page style from metadata
  const meta = (qr?.metadata ?? {}) as PageMeta;
  const brandColor = meta.pageColor ?? '#7C3AED';
  const bgStyle = meta.pageBackground ?? 'gradient';
  const bgClass = bgStyle === 'dark' ? 'bg-[#1a1a2e] text-white' : bgStyle === 'solid' ? 'text-white' : 'bg-gradient-to-b from-slate-50 to-white';
  const bgInline = bgStyle === 'solid' ? { backgroundColor: brandColor } : bgStyle === 'dark' ? {} : {};
  const textColor = bgStyle === 'gradient' ? 'text-slate-400' : 'text-white/60';

  // Branded wrapper
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className={`min-h-screen flex flex-col items-center px-4 py-10 ${bgClass}`} style={bgInline}>
      <div className="w-full max-w-sm">
        {qr && (
          <div className="text-center mb-8">
            {meta.pageLogo ? (
              <img src={meta.pageLogo} alt="" className="w-14 h-14 rounded-2xl mx-auto mb-3 object-cover shadow-lg" />
            ) : (
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg" style={{ backgroundColor: brandColor, boxShadow: `0 10px 25px ${brandColor}33` }}>
                <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
                  <polygon points="16,4 28,10 16,16 4,10" fill="#fff" fillOpacity="0.9" />
                  <polygon points="4,10 16,16 16,28 4,22" fill="#fff" fillOpacity="0.5" />
                  <polygon points="28,10 16,16 16,28 28,22" fill="#fff" fillOpacity="0.7" />
                </svg>
              </div>
            )}
            <p className={`text-xs font-medium ${textColor}`}>{qr.businessName}</p>
          </div>
        )}
        {children}
        <p className={`text-center text-[10px] mt-10 ${textColor}`}>Powered by Embedo</p>
      </div>
    </div>
  );

  if (loading) return (
    <Wrapper>
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    </Wrapper>
  );

  if (error) return (
    <Wrapper>
      <div className="text-center py-12">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-red-500"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
        </div>
        <p className="text-slate-700 font-semibold">{error}</p>
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
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {qr.purpose === 'SURVEY' ? 'Thanks for your feedback!' : qr.purpose === 'SPIN_WHEEL' ? "You're in!" : 'You\'re all set!'}
        </h2>
        {wonPrize && (
          <div className="mt-4 bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-2xl px-6 py-5 text-center">
            <p className="text-xs text-violet-600 font-medium mb-1">You won</p>
            <p className="text-2xl font-bold text-violet-700">{wonPrize.label}</p>
            {qr.discountCode && <p className="mt-3 text-sm text-violet-600">Use code: <span className="font-mono font-bold bg-white px-2 py-0.5 rounded-lg border border-violet-200">{qr.discountCode}</span></p>}
          </div>
        )}
        {!wonPrize && (qr.surveyReward || qr.discountValue) && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-5 text-center">
            <p className="text-xs text-emerald-600 font-medium mb-1">Your reward</p>
            <p className="text-xl font-bold text-emerald-700">{qr.surveyReward ?? qr.discountValue}</p>
            {qr.discountCode && <p className="mt-2 text-sm text-emerald-600">Code: <span className="font-mono font-bold">{qr.discountCode}</span></p>}
          </div>
        )}
        <p className="text-sm text-slate-400 mt-5">Show this screen to your server or cashier.</p>
      </div>
    </Wrapper>
  );

  // DISCOUNT — show code immediately
  if (qr.purpose === 'DISCOUNT') return (
    <Wrapper>
      <div className="text-center space-y-5">
        <h2 className="text-2xl font-bold text-slate-900">Your Discount</h2>
        <div className="bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl px-8 py-8 text-white shadow-xl shadow-violet-600/25">
          <p className="text-5xl font-black">{qr.discountValue}</p>
          {qr.discountCode && (
            <div className="mt-4 bg-white/20 rounded-xl px-4 py-2">
              <p className="text-xs text-violet-200 mb-0.5">Discount Code</p>
              <p className="text-2xl font-mono font-bold">{qr.discountCode}</p>
            </div>
          )}
        </div>
        <p className="text-sm text-slate-500">Show this screen to your server or cashier</p>
        {/* Optionally capture info */}
        <div className="pt-4">
          <p className="text-xs text-slate-400 mb-3">Want us to send deals directly to you?</p>
          <SignupForm businessName={qr.businessName} onSubmit={async (n, e, p) => { await signupViaQr(n, e, p, 'claimed_discount'); setDone(true); setPhase('result'); }} />
        </div>
      </div>
    </Wrapper>
  );

  // SPIN_WHEEL
  if (qr.purpose === 'SPIN_WHEEL') {
    const prizes = qr.spinPrizes ?? [{ label: '10% Off', probability: 50 }, { label: '5% Off', probability: 50 }];

    if (phase === 'signup' && wonPrize) return (
      <Wrapper>
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h2 className="text-xl font-bold text-slate-900">You won {wonPrize.label}!</h2>
            <p className="text-sm text-slate-500 mt-1">Enter your info to claim your prize</p>
          </div>
          <SignupForm businessName={qr.businessName} reward={wonPrize.label} onSubmit={handleSpinSignup} />
        </div>
      </Wrapper>
    );

    return (
      <Wrapper>
        <div className="space-y-6 text-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Spin to Win!</h2>
            <p className="text-sm text-slate-500 mt-1">Try your luck — what will you get?</p>
          </div>
          <SpinWheel prizes={prizes} onResult={handleSpinResult} />
        </div>
      </Wrapper>
    );
  }

  // SURVEY
  if (qr.purpose === 'SURVEY') {
    if (!qr.survey) return (
      <Wrapper>
        <div className="text-center py-10 text-slate-400">Survey not found</div>
      </Wrapper>
    );

    return (
      <Wrapper>
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{qr.survey.title}</h2>
            {qr.survey.description && <p className="text-sm text-slate-500 mt-1">{qr.survey.description}</p>}
            {qr.surveyReward && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <span className="text-lg">🎁</span>
                <p className="text-xs text-amber-800">Complete this survey to get <strong>{qr.surveyReward}</strong></p>
              </div>
            )}
          </div>
          <SurveyForm survey={qr.survey} onSubmit={handleSurveySubmit} />
        </div>
      </Wrapper>
    );
  }

  // SIGNUP
  return (
    <Wrapper>
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">Join {qr.businessName}</h2>
          <p className="text-sm text-slate-500 mt-1">Sign up to receive exclusive deals and updates</p>
        </div>
        <SignupForm businessName={qr.businessName} onSubmit={handleSignup} />
      </div>
    </Wrapper>
  );
}
