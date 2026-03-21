'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import KpiCard from '../../../components/ui/kpi-card';
import { useBusiness } from '../../../components/auth/business-provider';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

/* ── Types ────────────────────────────────────────────────────── */
interface SurveyQuestion { id: string; type: 'rating' | 'text' | 'multiple_choice' | 'yes_no'; label: string; options?: string[]; required: boolean; }
interface Survey { id: string; title: string; slug: string; description: string; questions: SurveyQuestion[]; active: boolean; createdAt: string; responseCount: number; }
interface QrCode { id: string; label: string; token: string; purpose: string; active: boolean; scanCount: number; createdAt: string; expiresAt: string | null; surveyId: string | null; survey: { id: string; title: string; slug: string } | null; discountValue: string | null; discountCode: string | null; spinPrizes: Array<{ label: string; probability: number }> | null; surveyReward: string | null; destinationUrl: string | null; }

const PURPOSES = [
  { value: 'SURVEY', label: 'Survey', icon: '\uD83D\uDCCB', desc: 'Scan \u2192 fill survey \u2192 reward' },
  { value: 'DISCOUNT', label: 'Discount', icon: '\uD83C\uDFF7\uFE0F', desc: 'Scan \u2192 instant discount code' },
  { value: 'SPIN_WHEEL', label: 'Spin to Win', icon: '\uD83C\uDFA1', desc: 'Scan \u2192 spin wheel \u2192 prize' },
  { value: 'SIGNUP', label: 'Quick Sign-up', icon: '\u270D\uFE0F', desc: 'Scan \u2192 enter info \u2192 join list' },
  { value: 'MENU', label: 'Digital Menu', icon: '\uD83C\uDF7D\uFE0F', desc: 'Scan \u2192 view menu' },
  { value: 'REVIEW', label: 'Leave a Review', icon: '\u2B50', desc: 'Scan \u2192 Google review' },
  { value: 'CUSTOM', label: 'Custom URL', icon: '\uD83D\uDD17', desc: 'Scan \u2192 any URL' },
];

const Q_TYPES = [
  { value: 'rating', label: 'Star Rating', icon: '\u2605' },
  { value: 'text', label: 'Free Text', icon: '\u270E' },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '\u25CB' },
  { value: 'yes_no', label: 'Yes / No', icon: '\u2713' },
];

function qrImageUrl(data: string, size = 200) { return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`; }
function qrPublicUrl(token: string) { return `${typeof window !== 'undefined' ? window.location.origin : 'https://app.embedo.io'}/qr/${token}`; }

const FONT_MAP: Record<string, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  inter: '"Inter", sans-serif',
  poppins: '"Poppins", sans-serif',
  playfair: '"Playfair Display", serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
};

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

/* ── Mini Spin Wheel Preview ──────────────────────────────────── */
const PREVIEW_PALETTES = [
  ['#7C3AED', '#6D28D9'], ['#4F46E5', '#4338CA'], ['#0EA5E9', '#0284C7'],
  ['#10B981', '#059669'], ['#F59E0B', '#D97706'], ['#EF4444', '#DC2626'],
  ['#8B5CF6', '#7C3AED'], ['#06B6D4', '#0891B2'],
];

function MiniSpinPreview({ prizes, accentColor }: { prizes: { label: string; probability: number }[]; accentColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 120;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2, r = cx - 6;
    const arc = (2 * Math.PI) / prizes.length;

    ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, 2 * Math.PI); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2; ctx.stroke();

    for (let i = 0; i < prizes.length; i++) {
      const start = i * arc - Math.PI / 2, end = start + arc;
      const [c1, c2] = PREVIEW_PALETTES[i % PREVIEW_PALETTES.length]!;
      const mid = start + arc / 2;
      const grad = ctx.createLinearGradient(cx + Math.cos(mid) * r * 0.3, cy + Math.sin(mid) * r * 0.3, cx + Math.cos(mid) * r * 0.9, cy + Math.sin(mid) * r * 0.9);
      grad.addColorStop(0, c1); grad.addColorStop(1, c2);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, end); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(mid);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.font = `bold ${prizes.length > 5 ? 6 : 7}px sans-serif`; ctx.fillStyle = '#fff';
      ctx.fillText(prizes[i]!.label, r - 6, 0); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 2 * Math.PI); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 2 * Math.PI); ctx.fillStyle = accentColor; ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx, cy - r - 1); ctx.lineTo(cx - 5, cy - r + 8); ctx.lineTo(cx + 5, cy - r + 8); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 0.5; ctx.fill(); ctx.stroke();
  }, [prizes, accentColor]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

/* ── Create QR Modal ──────────────────────────────────────────── */
function CreateQrModal({ businessId, surveys, onCreated, onClose }: {
  businessId: string; surveys: Survey[]; onCreated: (qr: QrCode) => void; onClose: () => void;
}) {
  const [step, setStep] = useState<'form' | 'preview'>('form');
  const [purpose, setPurpose] = useState('');
  const [label, setLabel] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  // Survey fields
  const [surveyMode, setSurveyMode] = useState<'existing' | 'new'>('new');
  const [surveyId, setSurveyId] = useState('');
  const [surveyTitle, setSurveyTitle] = useState('');
  const [surveyDesc, setSurveyDesc] = useState('');
  const [questions, setQuestions] = useState<SurveyQuestion[]>([{ id: `q_${Date.now()}`, type: 'rating', label: 'How was your experience?', required: true }]);
  const [surveyReward, setSurveyReward] = useState('');
  // Discount fields
  const [discountValue, setDiscountValue] = useState('');
  const [discountCode, setDiscountCode] = useState('');
  // Page style fields
  const [accentColor, setAccentColor] = useState('#7C3AED');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('system');
  const [pageHeading, setPageHeading] = useState('');
  const [pageSubheading, setPageSubheading] = useState('');
  const [pageLogo, setPageLogo] = useState('');
  const [pageButtonText, setPageButtonText] = useState('');
  // Spin wheel
  const [spinPrizes, setSpinPrizes] = useState([
    { label: '10% Off', probability: 35 }, { label: 'Free Dessert', probability: 20 },
    { label: '15% Off', probability: 15 }, { label: '5% Off', probability: 30 },
  ]);
  // URL-based
  const [destinationUrl, setDestinationUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<QrCode | null>(null);
  const [error, setError] = useState('');
  useGoogleFont(fontFamily);
  const fontStack = FONT_MAP[fontFamily] || FONT_MAP.system;

  function addQuestion() {
    setQuestions([...questions, { id: `q_${Date.now()}`, type: 'text', label: '', required: false }]);
  }
  function updateQuestion(id: string, updates: Partial<SurveyQuestion>) {
    setQuestions(questions.map((q) => q.id === id ? { ...q, ...updates } : q));
  }
  function removeQuestion(id: string) { setQuestions(questions.filter((q) => q.id !== id)); }

  function updatePrize(i: number, field: string, val: string | number) {
    setSpinPrizes(spinPrizes.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  }

  async function handleCreate() {
    setCreating(true);
    setError('');
    try {
      let finalSurveyId = surveyId;

      // If SURVEY purpose with new survey, create survey first
      if (purpose === 'SURVEY' && surveyMode === 'new') {
        const validQs = questions.filter((q) => q.label.trim());
        if (!surveyTitle.trim()) { setError('Survey title required'); setCreating(false); return; }
        if (validQs.length === 0) { setError('Add at least one question'); setCreating(false); return; }

        const sRes = await fetch(`${API_URL}/surveys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ businessId, title: surveyTitle, description: surveyDesc, questions: validQs }),
        });
        const sData = await sRes.json() as { success: boolean; survey: Survey };
        if (!sData.success) { setError('Failed to create survey'); setCreating(false); return; }
        finalSurveyId = sData.survey.id;
      }

      if (purpose === 'SURVEY' && !finalSurveyId) { setError('Select or create a survey'); setCreating(false); return; }

      const body: Record<string, unknown> = { businessId, label: label || purpose, purpose };
      if (finalSurveyId) body['surveyId'] = finalSurveyId;
      if (surveyReward) body['surveyReward'] = surveyReward;
      if (discountValue) body['discountValue'] = discountValue;
      if (discountCode) body['discountCode'] = discountCode;
      if (purpose === 'SPIN_WHEEL') body['spinPrizes'] = spinPrizes;
      if (destinationUrl) body['destinationUrl'] = destinationUrl;
      if (expiresAt) body['expiresAt'] = new Date(expiresAt).toISOString();
      // Page style stored in metadata JSON — heading/text/button colors auto-derived from bg
      const isDark = bgColor === '#1a1a2e' || bgColor === '#0f172a' || bgColor < '#444444';
      body['metadata'] = {
        accentColor, bgColor, fontFamily,
        headingColor: accentColor,
        textColor: isDark ? 'rgba(255,255,255,0.6)' : '#64748b',
        buttonTextColor: '#ffffff',
        ...(pageHeading ? { pageHeading } : {}),
        ...(pageSubheading ? { pageSubheading } : {}),
        ...(pageLogo ? { pageLogo } : {}),
        ...(pageButtonText ? { pageButtonText } : {}),
      };

      const res = await fetch(`${API_URL}/qr-codes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { success: boolean; qrCode: QrCode };
      if (data.success) { setCreated(data.qrCode); setStep('preview'); onCreated(data.qrCode); }
      else setError('Failed to create QR code');
    } catch { setError('Network error'); } finally { setCreating(false); }
  }

  const needsUrl = ['MENU', 'REVIEW', 'CUSTOM'].includes(purpose);
  const totalProb = spinPrizes.reduce((s, p) => s + (p.probability || 0), 0);
  const canCreate = label.trim() && purpose && (!needsUrl || destinationUrl.trim()) && (purpose !== 'SPIN_WHEEL' || totalProb === 100);

  if (step === 'preview' && created) {
    const url = qrPublicUrl(created.token);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center my-auto" onClick={(e) => e.stopPropagation()}>
          <img src={qrImageUrl(url)} alt="QR Code" className="w-48 h-48 mx-auto mb-4 rounded-lg" />
          <h3 className="text-lg font-bold text-slate-900 mb-1">{created.label}</h3>
          <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700 mb-3">{created.purpose}</span>
          <p className="text-xs text-slate-400 font-mono bg-slate-50 rounded-lg px-3 py-2 mb-4 break-all">{url}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onClose} className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-500 transition-colors">Done</button>
            <a href={qrImageUrl(url)} download={`${created.label.replace(/\s+/g, '-').toLowerCase()}-qr.png`} className="px-5 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">Download PNG</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900">Create QR Code</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
        </div>
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Purpose selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">What type of QR code?</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PURPOSES.map((p) => (
                <button key={p.value} onClick={() => setPurpose(p.value)} className={`p-3 rounded-xl border text-left transition-all ${purpose === p.value ? 'border-violet-400 bg-violet-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <span className="text-xl">{p.icon}</span>
                  <p className="text-xs font-semibold text-slate-800 mt-1">{p.label}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{p.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {purpose && (
            <>
              {/* Label */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">QR Code Label</label>
                <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`e.g. Front Counter ${PURPOSES.find((p) => p.value === purpose)?.label ?? ''}`} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
              </div>

              {/* SURVEY: inline survey builder */}
              {purpose === 'SURVEY' && (
                <div className="bg-violet-50/50 border border-violet-200/60 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="flex bg-white rounded-lg p-0.5 border border-slate-200">
                      <button onClick={() => setSurveyMode('new')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${surveyMode === 'new' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}>New Survey</button>
                      {surveys.length > 0 && <button onClick={() => setSurveyMode('existing')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${surveyMode === 'existing' ? 'bg-violet-600 text-white' : 'text-slate-500'}`}>Existing Survey</button>}
                    </div>
                  </div>

                  {surveyMode === 'existing' ? (
                    <select value={surveyId} onChange={(e) => setSurveyId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800">
                      <option value="">Select a survey...</option>
                      {surveys.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.responseCount} responses)</option>)}
                    </select>
                  ) : (
                    <>
                      <input type="text" value={surveyTitle} onChange={(e) => setSurveyTitle(e.target.value)} placeholder="Survey title" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                      <input type="text" value={surveyDesc} onChange={(e) => setSurveyDesc(e.target.value)} placeholder="Brief description (optional)" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />

                      {/* Question builder */}
                      <div className="space-y-3">
                        {questions.map((q, qi) => (
                          <div key={q.id} className="bg-white rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-semibold text-slate-400 uppercase">Question {qi + 1}</span>
                              {questions.length > 1 && <button onClick={() => removeQuestion(q.id)} className="text-xs text-slate-400 hover:text-rose-500">Remove</button>}
                            </div>
                            <div className="flex gap-1.5 mb-2">
                              {Q_TYPES.map((t) => (
                                <button key={t.value} onClick={() => updateQuestion(q.id, { type: t.value as SurveyQuestion['type'] })} className={`px-2 py-1 text-[10px] font-medium rounded-md border transition-all ${q.type === t.value ? 'bg-violet-100 border-violet-300 text-violet-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                  {t.icon} {t.label}
                                </button>
                              ))}
                            </div>
                            <input type="text" value={q.label} onChange={(e) => updateQuestion(q.id, { label: e.target.value })} placeholder="Question text..." className="w-full px-3 py-1.5 border border-slate-200 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 mb-1.5" />
                            {q.type === 'multiple_choice' && (
                              <div className="pl-3 space-y-1">
                                {(q.options ?? []).map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-1.5">
                                    <span className="text-slate-300 text-xs">\u25CB</span>
                                    <span className="text-xs text-slate-600">{opt}</span>
                                    <button onClick={() => updateQuestion(q.id, { options: (q.options ?? []).filter((_, i) => i !== oi) })} className="text-[10px] text-slate-400 hover:text-rose-500">x</button>
                                  </div>
                                ))}
                                <input type="text" placeholder="Add option (Enter)" className="text-xs px-2 py-1 border border-dashed border-slate-300 rounded text-slate-600 w-full" onKeyDown={(e) => { if (e.key === 'Enter') { const v = (e.target as HTMLInputElement).value.trim(); if (v) { updateQuestion(q.id, { options: [...(q.options ?? []), v] }); (e.target as HTMLInputElement).value = ''; } } }} />
                              </div>
                            )}
                            <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
                              <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(q.id, { required: e.target.checked })} className="rounded border-slate-300 text-violet-600" />
                              <span className="text-[10px] text-slate-500">Required</span>
                            </label>
                          </div>
                        ))}
                        <button onClick={addQuestion} className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-colors">+ Add Question</button>
                      </div>
                    </>
                  )}

                  <input type="text" value={surveyReward} onChange={(e) => setSurveyReward(e.target.value)} placeholder="Reward after survey (optional, e.g. '10% off next visit')" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30" />
                </div>
              )}

              {/* DISCOUNT fields */}
              {purpose === 'DISCOUNT' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Discount Value</label>
                    <input type="text" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} placeholder="e.g. 10% off" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Code (optional)</label>
                    <input type="text" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} placeholder="e.g. SAVE10" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 font-mono" />
                  </div>
                </div>
              )}

              {/* SPIN_WHEEL fields */}
              {purpose === 'SPIN_WHEEL' && (
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-slate-500">Prize Pool</label>
                  {spinPrizes.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="text" value={p.label} onChange={(e) => updatePrize(i, 'label', e.target.value)} className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800" />
                      <div className="flex items-center gap-1">
                        <input type="number" value={p.probability} onChange={(e) => updatePrize(i, 'probability', Number(e.target.value))} className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800 text-center" />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                      {spinPrizes.length > 2 && <button onClick={() => setSpinPrizes(spinPrizes.filter((_, idx) => idx !== i))} className="text-xs text-slate-400 hover:text-rose-500">x</button>}
                    </div>
                  ))}
                  <div className="flex items-center justify-between">
                    <button onClick={() => setSpinPrizes([...spinPrizes, { label: '', probability: 0 }])} className="text-xs text-violet-600 hover:text-violet-800 font-medium">+ Add Prize</button>
                    <span className={`text-xs font-medium ${totalProb === 100 ? 'text-emerald-600' : 'text-rose-500'}`}>Total: {totalProb}%</span>
                  </div>
                </div>
              )}

              {/* URL fields */}
              {needsUrl && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{purpose === 'MENU' ? 'Menu URL' : purpose === 'REVIEW' ? 'Google Review URL' : 'Destination URL'}</label>
                  <input type="url" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800" />
                </div>
              )}

              {/* SIGNUP info */}
              {purpose === 'SIGNUP' && (
                <div className="bg-sky-50 border border-sky-200/60 rounded-lg px-4 py-3">
                  <p className="text-xs text-sky-700">Customers scan \u2192 enter name + email/phone \u2192 automatically added to your Contacts list</p>
                </div>
              )}

              {/* Page Style */}
              {['SURVEY', 'SPIN_WHEEL', 'DISCOUNT', 'SIGNUP'].includes(purpose) && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Page Appearance</p>

                  {/* Two color pickers: accent + background */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Accent Color</label>
                      <div className="flex items-center gap-1.5">
                        <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-6 h-6 rounded border-0 cursor-pointer flex-shrink-0" />
                        <input type="text" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-20 px-1.5 py-1 border border-slate-200 rounded text-[10px] text-slate-700 font-mono" />
                        {['#7C3AED', '#3B82F6', '#10B981', '#EF4444', '#EC4899', '#0EA5E9'].map((c) => (
                          <button key={c} onClick={() => setAccentColor(c)} className="w-3.5 h-3.5 rounded-full border transition-all hover:scale-125 flex-shrink-0" style={{ background: c, borderColor: accentColor === c ? '#333' : 'transparent' }} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Background Color</label>
                      <div className="flex items-center gap-1.5">
                        <input type="color" value={bgColor.startsWith('#') ? bgColor : '#f8fafc'} onChange={(e) => setBgColor(e.target.value)} className="w-6 h-6 rounded border-0 cursor-pointer flex-shrink-0" />
                        <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 px-1.5 py-1 border border-slate-200 rounded text-[10px] text-slate-700 font-mono" />
                        {['#ffffff', '#0f172a', '#eff6ff', '#ecfdf5'].map((c) => (
                          <button key={c} onClick={() => setBgColor(c)} className="w-3.5 h-3.5 rounded-full border transition-all hover:scale-125 flex-shrink-0" style={{ background: c, borderColor: bgColor === c ? '#333' : c === '#ffffff' || c === '#eff6ff' || c === '#ecfdf5' ? '#e2e8f0' : 'transparent' }} />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Font */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Font</label>
                    <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800">
                      <option value="system">System Default</option>
                      <option value="inter">Inter</option>
                      <option value="poppins">Poppins</option>
                      <option value="playfair">Playfair Display</option>
                      <option value="mono">Monospace</option>
                    </select>
                  </div>

                  {/* Text overrides */}
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Heading (optional)</label>
                    <input type="text" value={pageHeading} onChange={(e) => setPageHeading(e.target.value)} placeholder={purpose === 'SURVEY' ? 'We\'d love your feedback!' : purpose === 'SPIN_WHEEL' ? 'Spin to Win!' : purpose === 'DISCOUNT' ? 'Your Exclusive Offer' : 'Join Us!'} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">Subheading (optional)</label>
                    <input type="text" value={pageSubheading} onChange={(e) => setPageSubheading(e.target.value)} placeholder="Short description shown below the heading" className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Logo URL (optional)</label>
                      <input type="url" value={pageLogo} onChange={(e) => setPageLogo(e.target.value)} placeholder="https://..." className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Button Text (optional)</label>
                      <input type="text" value={pageButtonText} onChange={(e) => setPageButtonText(e.target.value)} placeholder={purpose === 'SURVEY' ? 'Submit Feedback' : purpose === 'SPIN_WHEEL' ? 'Spin to Win!' : purpose === 'SIGNUP' ? 'Sign Me Up' : 'Claim Now'} className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-800" />
                    </div>
                  </div>

                  {/* Live preview */}
                  <div className="rounded-lg overflow-hidden border border-slate-200">
                    <div className="px-2 py-1 bg-slate-100 border-b border-slate-200 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[8px] text-slate-400 ml-1">Preview</span>
                    </div>
                    <div className="p-3 flex flex-col items-center" style={{ backgroundColor: bgColor, fontFamily: fontStack, minHeight: purpose === 'SPIN_WHEEL' ? 220 : 140 }}>
                      <p className="text-xs font-bold text-center mb-0.5" style={{ color: accentColor }}>{pageHeading || (purpose === 'SPIN_WHEEL' ? 'Spin to Win!' : purpose === 'DISCOUNT' ? 'Your Discount' : 'Join Us!')}</p>
                      <p className="text-[9px] text-center mb-2" style={{ color: bgColor < '#444444' && bgColor !== '#ffffff' && bgColor !== '#f8fafc' && bgColor !== '#eff6ff' && bgColor !== '#ecfdf5' ? 'rgba(255,255,255,0.6)' : '#64748b' }}>{pageSubheading || 'Your subheading here'}</p>
                      {purpose === 'SPIN_WHEEL' && (
                        <div className="mb-2">
                          <MiniSpinPreview prizes={spinPrizes} accentColor={accentColor} />
                        </div>
                      )}
                      {purpose === 'DISCOUNT' && (
                        <div className="rounded-lg px-3 py-2 mb-2 text-center w-full max-w-[140px]" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}dd)`, color: '#ffffff' }}>
                          <p className="text-sm font-black">{discountValue || '10% Off'}</p>
                          {discountCode && <p className="text-[8px] font-mono mt-0.5 opacity-80">Code: {discountCode}</p>}
                        </div>
                      )}
                      {(purpose === 'SIGNUP' || purpose === 'SURVEY') && (
                        <div className="w-full max-w-[140px] space-y-1 mb-2">
                          <div className="w-full h-4 bg-white/80 rounded border border-slate-200" />
                          <div className="w-full h-4 bg-white/80 rounded border border-slate-200" />
                        </div>
                      )}
                      <div className="px-4 py-1 rounded-full text-[9px] font-semibold text-white" style={{ backgroundColor: accentColor }}>
                        {pageButtonText || 'Submit'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Expiration */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Expires (optional)</label>
                <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} min={new Date().toISOString().split('T')[0]} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800" />
              </div>

              {error && <p className="text-sm text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</p>}
            </>
          )}
        </div>
        {purpose && (
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={!canCreate || creating} className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-500 disabled:opacity-50 transition-colors">
              {creating ? 'Creating...' : 'Generate QR Code'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── QR Code Card ─────────────────────────────────────────────── */
function QrCard({ qr, onDelete }: { qr: QrCode; onDelete: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = qrPublicUrl(qr.token);
  const expired = qr.expiresAt && new Date(qr.expiresAt) < new Date();
  const purposeInfo = PURPOSES.find((p) => p.value === qr.purpose);

  function copyLink() { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  return (
    <div className={`bg-white border rounded-2xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5 duration-200 ${expired ? 'border-rose-200 opacity-60' : 'border-slate-200'}`}>
      <div className="flex gap-4">
        <img src={qrImageUrl(url, 100)} alt="QR" className="w-20 h-20 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-slate-800 truncate">{qr.label}</span>
            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-violet-100 text-violet-700">{purposeInfo?.icon} {qr.purpose.replace('_', ' ')}</span>
            {expired && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-100 text-rose-700">Expired</span>}
          </div>
          {qr.survey && <p className="text-xs text-slate-500 mb-1">Survey: {qr.survey.title}</p>}
          {qr.discountValue && <p className="text-xs text-slate-500 mb-1">Discount: {qr.discountValue}</p>}
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span>{qr.scanCount} scans</span>
            <span>{new Date(qr.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
        <button onClick={copyLink} className="px-3 py-1 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">{copied ? 'Copied!' : 'Copy Link'}</button>
        <a href={qrImageUrl(url)} download={`${qr.label.replace(/\s+/g, '-').toLowerCase()}-qr.png`} className="px-3 py-1 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Download</a>
        <button onClick={onDelete} className="px-3 py-1 text-xs text-rose-500 border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors ml-auto">Delete</button>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */
export default function QrCodesPage() {
  const { business, loading: bizLoading } = useBusiness();
  const [showCreate, setShowCreate] = useState(false);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

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
    } finally { setLoading(false); }
  }, [business?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleDelete(id: string) {
    await fetch(`${API_URL}/qr-codes/${id}`, { method: 'DELETE' });
    setQrCodes(qrCodes.filter((q) => q.id !== id));
  }

  if (bizLoading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;
  if (!business) return null;

  const activeCount = qrCodes.filter((q) => q.active && (!q.expiresAt || new Date(q.expiresAt) > new Date())).length;
  const totalScans = qrCodes.reduce((s, q) => s + q.scanCount, 0);
  const totalResponses = surveys.reduce((s, sv) => s + sv.responseCount, 0);
  const filtered = filter === 'ALL' ? qrCodes : qrCodes.filter((q) => q.purpose === filter);

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" /></svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">QR Codes</h1>
            <p className="text-sm text-slate-500">Scannable codes for surveys, promos, menus, and sign-ups</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-500 transition-colors shadow-sm">
          + Create QR Code
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Active QR Codes" value={activeCount} color="violet" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Total Scans" value={totalScans} color="emerald" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Survey Responses" value={totalResponses} color="sky" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Total Created" value={qrCodes.length} color="amber" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>} />
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto">
        {['ALL', ...PURPOSES.map((p) => p.value)].map((f) => {
          const info = PURPOSES.find((p) => p.value === f);
          const count = f === 'ALL' ? qrCodes.length : qrCodes.filter((q) => q.purpose === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)} className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${filter === f ? 'bg-violet-100 text-violet-700 border border-violet-200' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              {info ? `${info.icon} ${info.label}` : 'All'} <span className="text-[10px] opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* QR Code Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <p className="text-3xl mb-3">{filter !== 'ALL' ? PURPOSES.find((p) => p.value === filter)?.icon : '\uD83D\uDCF1'}</p>
          <p className="text-sm text-slate-500 mb-4">{filter !== 'ALL' ? `No ${PURPOSES.find((p) => p.value === filter)?.label} QR codes yet` : 'No QR codes yet'}</p>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-500 transition-colors">Create Your First QR Code</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((qr) => <QrCard key={qr.id} qr={qr} onDelete={() => handleDelete(qr.id)} />)}
        </div>
      )}

      {/* Create Modal — portal to body so it escapes any parent overflow/transform */}
      {showCreate && typeof document !== 'undefined' && createPortal(
        <CreateQrModal
          businessId={business.id}
          surveys={surveys}
          onCreated={(qr) => { setQrCodes([qr, ...qrCodes]); }}
          onClose={() => { setShowCreate(false); fetchData(); }}
        />,
        document.body,
      )}
    </div>
  );
}
