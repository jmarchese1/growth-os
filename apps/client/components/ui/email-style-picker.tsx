'use client';

import { useState, useEffect } from 'react';
import { EMAIL_STYLES, COLOR_PRESETS, FONT_OPTIONS } from '@/lib/email-styles';
import type { EmailStyleOptions, EmailAttachment } from '@/lib/email-styles';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface QrCode {
  id: string;
  label: string;
  token: string;
  purpose: string;
  discountValue: string | null;
  discountCode: string | null;
  surveyReward: string | null;
}

interface Survey {
  id: string;
  title: string;
  slug: string;
}

interface Props {
  selectedStyle: string;
  onStyleChange: (styleId: string) => void;
  options: EmailStyleOptions;
  onOptionsChange: (opts: EmailStyleOptions) => void;
  businessId?: string;
  attachments: EmailAttachment[];
  onAttachmentsChange: (attachments: EmailAttachment[]) => void;
}

export function EmailStylePicker({ selectedStyle, onStyleChange, options, onOptionsChange, businessId, attachments, onAttachmentsChange }: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loadedData, setLoadedData] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showCtaInput, setShowCtaInput] = useState(false);
  const [ctaText, setCtaText] = useState('Learn More');
  const [ctaUrl, setCtaUrl] = useState('');

  // Fetch QR codes and surveys when businessId is available
  useEffect(() => {
    if (!businessId || loadedData) return;
    Promise.all([
      fetch(`${API_URL}/qr-codes?businessId=${businessId}`).then((r) => r.json()).then((d: { success: boolean; qrCodes?: QrCode[] }) => d.qrCodes ?? []),
      fetch(`${API_URL}/surveys?businessId=${businessId}`).then((r) => r.json()).then((d: { success: boolean; surveys?: Survey[] }) => d.surveys ?? []),
    ]).then(([qr, sv]) => { setQrCodes(qr); setSurveys(sv); setLoadedData(true); }).catch(() => {});
  }, [businessId, loadedData]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.embedo.io';
  const spinWheels = qrCodes.filter((q) => q.purpose === 'SPIN_WHEEL');
  const discountQrs = qrCodes.filter((q) => q.purpose === 'DISCOUNT');
  const surveyQrs = qrCodes.filter((q) => q.purpose === 'SURVEY');

  function addAttachment(att: EmailAttachment) {
    // Don't add duplicates
    if (attachments.some((a) => a.id === att.id)) return;
    onAttachmentsChange([...attachments, att]);
  }

  function removeAttachment(id: string) {
    onAttachmentsChange(attachments.filter((a) => a.id !== id));
  }

  function addImage() {
    if (!imageUrl.trim()) return;
    addAttachment({ id: `img-${Date.now()}`, type: 'image', label: 'Image', url: imageUrl.trim() });
    setImageUrl('');
    setShowImageInput(false);
  }

  function addCta() {
    if (!ctaUrl.trim() || !ctaText.trim()) return;
    addAttachment({ id: `cta-${Date.now()}`, type: 'cta', label: ctaText.trim(), url: ctaUrl.trim() });
    setCtaText('Learn More');
    setCtaUrl('');
    setShowCtaInput(false);
  }

  const selectedFont = FONT_OPTIONS.find((f) => f.value === options.font) ?? FONT_OPTIONS[0];

  return (
    <div className="space-y-3">
      {/* Style buttons */}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Email Style</label>
        <div className="grid grid-cols-4 gap-1.5">
          {EMAIL_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => onStyleChange(style.id)}
              className={`px-2 py-2.5 rounded-xl border text-center transition-all ${
                selectedStyle === style.id
                  ? 'bg-violet-50 border-violet-300 ring-1 ring-violet-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span className={`block text-[11px] font-semibold ${selectedStyle === style.id ? 'text-violet-700' : 'text-slate-600'}`}>
                {style.name}
              </span>
              <span className="block text-[9px] text-slate-400 mt-0.5 leading-tight">{style.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color + Font + Logo */}
      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Color</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="w-full flex items-center gap-2 px-2.5 py-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <span className="w-5 h-5 rounded-md border border-slate-200 flex-shrink-0" style={{ backgroundColor: options.color ?? '#7c3aed' }} />
              <span className="text-xs text-slate-700 font-mono">{options.color ?? '#7c3aed'}</span>
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-3 w-56">
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => { onOptionsChange({ ...options, color: preset.hex }); setShowColorPicker(false); }}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${options.color === preset.hex ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input type="text" value={options.color ?? '#7c3aed'} onChange={(e) => onOptionsChange({ ...options, color: e.target.value })} placeholder="#hex"
                    className="flex-1 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400" />
                  <button type="button" onClick={() => setShowColorPicker(false)} className="px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Font</label>
          <select value={selectedFont.id} onChange={(e) => { const f = FONT_OPTIONS.find((fo) => fo.id === e.target.value); if (f) onOptionsChange({ ...options, font: f.value }); }}
            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30">
            {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Logo URL</label>
          <input type="text" value={options.logoUrl ?? ''} onChange={(e) => onOptionsChange({ ...options, logoUrl: e.target.value || undefined })} placeholder="https://logo.png"
            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400/30" />
        </div>
      </div>

      {/* ─── Embed Dropdowns: Spinners, Surveys, Discounts ─────────── */}
      {businessId && (
        <div className="grid grid-cols-3 gap-2.5">
          {/* Spinner dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Spin Wheel</label>
            <select
              value=""
              onChange={(e) => {
                const qr = spinWheels.find((q) => q.id === e.target.value);
                if (qr) addAttachment({ id: `spin-${qr.id}`, type: 'spin_wheel', label: qr.label, url: `${origin}/qr/${qr.token}`, buttonText: 'Spin the Wheel!' });
              }}
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            >
              <option value="">
                {spinWheels.length === 0 ? 'No spinners' : `Select (${spinWheels.length})`}
              </option>
              {spinWheels.map((qr) => <option key={qr.id} value={qr.id}>{qr.label}</option>)}
            </select>
          </div>

          {/* Survey dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Survey</label>
            <select
              value=""
              onChange={(e) => {
                const qr = surveyQrs.find((q) => q.id === e.target.value);
                if (qr) {
                  addAttachment({ id: `survey-${qr.id}`, type: 'survey', label: `${qr.label}${qr.surveyReward ? ` — ${qr.surveyReward}` : ''}`, url: `${origin}/qr/${qr.token}`, buttonText: 'Take the Survey' });
                  return;
                }
                const sv = surveys.find((s) => s.id === e.target.value);
                if (sv) addAttachment({ id: `survey-${sv.id}`, type: 'survey', label: sv.title, url: `${origin}/s/${sv.slug}`, buttonText: 'Share Your Feedback' });
              }}
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            >
              <option value="">
                {surveyQrs.length + surveys.length === 0 ? 'No surveys' : `Select (${surveyQrs.length + surveys.length})`}
              </option>
              {surveyQrs.map((qr) => <option key={qr.id} value={qr.id}>{qr.label}{qr.surveyReward ? ` (${qr.surveyReward})` : ''}</option>)}
              {surveys.map((sv) => <option key={sv.id} value={sv.id}>{sv.title}</option>)}
            </select>
          </div>

          {/* Discount dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Discount</label>
            <select
              value=""
              onChange={(e) => {
                const qr = discountQrs.find((q) => q.id === e.target.value);
                if (qr) addAttachment({ id: `disc-${qr.id}`, type: 'discount', label: `${qr.label}${qr.discountValue ? ` — ${qr.discountValue}` : ''}`, url: `${origin}/qr/${qr.token}`, buttonText: 'Claim Your Discount' });
              }}
              className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            >
              <option value="">
                {discountQrs.length === 0 ? 'No discounts' : `Select (${discountQrs.length})`}
              </option>
              {discountQrs.map((qr) => <option key={qr.id} value={qr.id}>{qr.label}{qr.discountValue ? ` (${qr.discountValue})` : ''}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ─── Insert Image / CTA Button ─────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        <button type="button" onClick={() => { setShowImageInput(!showImageInput); setShowCtaInput(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showImageInput ? 'text-violet-700 bg-violet-50 border-violet-300' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81V14.75c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.06l-2.22-2.22a.75.75 0 00-1.06 0L8.56 12.08 6.28 9.81a.75.75 0 00-1.06 0L2.5 11.06z" clipRule="evenodd" /></svg>
          Image
        </button>
        <button type="button" onClick={() => { setShowCtaInput(!showCtaInput); setShowImageInput(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showCtaInput ? 'text-violet-700 bg-violet-50 border-violet-300' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4.25 5.5a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5zM4.25 9a.75.75 0 000 1.5h5.5a.75.75 0 000-1.5h-5.5zM3.5 13.25a.75.75 0 01.75-.75h3.5a.75.75 0 010 1.5h-3.5a.75.75 0 01-.75-.75zM14 10a1 1 0 011-1h1a1 1 0 011 1v5a1 1 0 01-1 1h-1a1 1 0 01-1-1v-5z" clipRule="evenodd" /></svg>
          CTA Button
        </button>
      </div>

      {/* Image input */}
      {showImageInput && (
        <div className="flex gap-2">
          <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Paste image URL..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addImage(); } }} />
          <button type="button" onClick={addImage} disabled={!imageUrl.trim()}
            className="px-3 py-2 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-40 transition-colors">Add</button>
        </div>
      )}

      {/* CTA input */}
      {showCtaInput && (
        <div className="flex gap-2">
          <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Button text"
            className="w-28 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400/30" />
          <input type="text" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://link..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCta(); } }} />
          <button type="button" onClick={addCta} disabled={!ctaUrl.trim() || !ctaText.trim()}
            className="px-3 py-2 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-40 transition-colors">Add</button>
        </div>
      )}

      {/* ─── Attached items (removable) ────────────────────────────── */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-500">Attached to email</label>
          <div className="flex flex-wrap gap-1.5">
            {attachments.map((att) => (
              <span key={att.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-700">
                <span>{att.type === 'spin_wheel' ? '🎰' : att.type === 'survey' ? '📋' : att.type === 'discount' ? '🎁' : att.type === 'image' ? '🖼' : '🔗'}</span>
                <span className="font-medium max-w-[160px] truncate">{att.label}</span>
                <button type="button" onClick={() => removeAttachment(att.id)}
                  className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-violet-200 text-violet-500 hover:text-violet-700 transition-colors">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" /></svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
