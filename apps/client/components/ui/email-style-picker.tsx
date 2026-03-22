'use client';

import { useState, useEffect } from 'react';
import { EMAIL_STYLES, COLOR_PRESETS, FONT_OPTIONS, buildEmbedHtml, buildImageHtml } from '@/lib/email-styles';
import type { EmailStyleOptions, EmbedBlock } from '@/lib/email-styles';

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
  onInsertHtml?: (html: string) => void;
}

export function EmailStylePicker({ selectedStyle, onStyleChange, options, onOptionsChange, businessId, onInsertHtml }: Props) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showEmbedPanel, setShowEmbedPanel] = useState(false);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loadedData, setLoadedData] = useState(false);

  useEffect(() => {
    if (!showEmbedPanel || !businessId || loadedData) return;
    Promise.all([
      fetch(`${API_URL}/qr-codes?businessId=${businessId}`).then((r) => r.json()).then((d: { success: boolean; qrCodes?: QrCode[] }) => d.qrCodes ?? []),
      fetch(`${API_URL}/surveys?businessId=${businessId}`).then((r) => r.json()).then((d: { success: boolean; surveys?: Survey[] }) => d.surveys ?? []),
    ]).then(([qr, sv]) => { setQrCodes(qr); setSurveys(sv); setLoadedData(true); }).catch(() => {});
  }, [showEmbedPanel, businessId, loadedData]);

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://app.embedo.io';
  const spinWheels = qrCodes.filter((q) => q.purpose === 'SPIN_WHEEL');
  const discounts = qrCodes.filter((q) => q.purpose === 'DISCOUNT');
  const surveyQrs = qrCodes.filter((q) => q.purpose === 'SURVEY');

  function insertEmbed(embed: EmbedBlock) {
    if (onInsertHtml) {
      onInsertHtml(buildEmbedHtml(embed, options));
    }
    setShowEmbedPanel(false);
  }

  function insertImage() {
    const url = prompt('Paste image URL:');
    if (url && onInsertHtml) {
      onInsertHtml(buildImageHtml(url));
    }
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

      {/* Color + Font + Logo row */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Brand color */}
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
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${
                        options.color === preset.hex ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={options.color ?? '#7c3aed'}
                    onChange={(e) => onOptionsChange({ ...options, color: e.target.value })}
                    placeholder="#hex"
                    className="flex-1 px-2 py-1.5 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                  <button type="button" onClick={() => setShowColorPicker(false)} className="px-2 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Font */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Font</label>
          <select
            value={selectedFont.id}
            onChange={(e) => {
              const f = FONT_OPTIONS.find((fo) => fo.id === e.target.value);
              if (f) onOptionsChange({ ...options, font: f.value });
            }}
            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-violet-400/30"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Logo URL */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Logo URL</label>
          <input
            type="text"
            value={options.logoUrl ?? ''}
            onChange={(e) => onOptionsChange({ ...options, logoUrl: e.target.value || undefined })}
            placeholder="https://logo.png"
            className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400/30"
          />
        </div>
      </div>

      {/* Insert buttons */}
      {onInsertHtml && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={insertImage}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-slate-400">
              <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81V14.75c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.06l-2.22-2.22a.75.75 0 00-1.06 0L8.56 12.08 6.28 9.81a.75.75 0 00-1.06 0L2.5 11.06zm12-1.06a.75.75 0 00-1.06 0L13 11.44V5.25a.75.75 0 00-.75-.75H3.25a.75.75 0 00-.75.75v4.19l2.72-2.72a.75.75 0 011.06 0l2.28 2.28 5.56-5.56a.75.75 0 011.06 0L17.5 5.72V5.25a.75.75 0 00-.75-.75z" clipRule="evenodd" />
            </svg>
            Insert Image
          </button>
          {businessId && (
            <button
              type="button"
              onClick={() => setShowEmbedPanel(!showEmbedPanel)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                showEmbedPanel
                  ? 'text-violet-700 bg-violet-50 border-violet-300'
                  : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M3.25 3A2.25 2.25 0 001 5.25v9.5A2.25 2.25 0 003.25 17h13.5A2.25 2.25 0 0019 14.75v-9.5A2.25 2.25 0 0016.75 3H3.25zM2.5 9v5.75c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75V9h-15zM4 5.25a.75.75 0 00-.75.75v.5c0 .414.336.75.75.75h.5A.75.75 0 005.25 6.5V6a.75.75 0 00-.75-.75H4z" clipRule="evenodd" />
              </svg>
              Insert QR / Survey / Discount
            </button>
          )}
        </div>
      )}

      {/* Embed panel */}
      {showEmbedPanel && onInsertHtml && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          {/* Spin Wheels */}
          {spinWheels.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Spin-to-Win Wheels</p>
              <div className="space-y-1">
                {spinWheels.map((qr) => (
                  <button
                    key={qr.id}
                    type="button"
                    onClick={() => insertEmbed({ type: 'spin_wheel', label: qr.label, url: `${origin}/qr/${qr.token}`, buttonText: 'Spin the Wheel!' })}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-violet-50 hover:border-violet-300 transition-colors text-left"
                  >
                    <span className="text-lg">🎰</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{qr.label}</p>
                      <p className="text-[10px] text-slate-400">Spin wheel for prizes</p>
                    </div>
                    <span className="text-[10px] text-violet-600 font-medium">Insert</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Surveys */}
          {(surveys.length > 0 || surveyQrs.length > 0) && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Surveys</p>
              <div className="space-y-1">
                {surveyQrs.map((qr) => (
                  <button
                    key={qr.id}
                    type="button"
                    onClick={() => insertEmbed({ type: 'survey', label: `${qr.label}${qr.surveyReward ? ` — ${qr.surveyReward}` : ''}`, url: `${origin}/qr/${qr.token}`, buttonText: 'Take the Survey' })}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-violet-50 hover:border-violet-300 transition-colors text-left"
                  >
                    <span className="text-lg">📋</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{qr.label}</p>
                      <p className="text-[10px] text-slate-400">{qr.surveyReward ? `Reward: ${qr.surveyReward}` : 'Take survey via QR page'}</p>
                    </div>
                    <span className="text-[10px] text-violet-600 font-medium">Insert</span>
                  </button>
                ))}
                {surveys.filter((s) => !surveyQrs.some((q) => q.purpose === 'SURVEY')).map((sv) => (
                  <button
                    key={sv.id}
                    type="button"
                    onClick={() => insertEmbed({ type: 'survey', label: sv.title, url: `${origin}/s/${sv.slug}`, buttonText: 'Share Your Feedback' })}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-violet-50 hover:border-violet-300 transition-colors text-left"
                  >
                    <span className="text-lg">📋</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{sv.title}</p>
                      <p className="text-[10px] text-slate-400">Direct survey link</p>
                    </div>
                    <span className="text-[10px] text-violet-600 font-medium">Insert</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Discounts */}
          {discounts.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Discount Codes</p>
              <div className="space-y-1">
                {discounts.map((qr) => (
                  <button
                    key={qr.id}
                    type="button"
                    onClick={() => insertEmbed({ type: 'discount', label: `${qr.label}${qr.discountValue ? ` — ${qr.discountValue}` : ''}`, url: `${origin}/qr/${qr.token}`, buttonText: 'Claim Your Discount' })}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg hover:bg-violet-50 hover:border-violet-300 transition-colors text-left"
                  >
                    <span className="text-lg">🎁</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{qr.label}</p>
                      <p className="text-[10px] text-slate-400">{qr.discountValue ?? 'Discount offer'}{qr.discountCode ? ` (${qr.discountCode})` : ''}</p>
                    </div>
                    <span className="text-[10px] text-violet-600 font-medium">Insert</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {spinWheels.length === 0 && surveys.length === 0 && surveyQrs.length === 0 && discounts.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">No QR codes, surveys, or discounts created yet. Create some in the QR Codes or Surveys page first.</p>
          )}
        </div>
      )}
    </div>
  );
}
