'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import WebsiteBuilder from './website-builder';

// ── Color Wheel Popup ────────────────────────────────────────────────────────
function ColorWheelPopup({ onClose }: { onClose: () => void }) {
  const [hue, setHue] = useState(270);
  const [saturation, setSaturation] = useState(80);
  const [lightness, setLightness] = useState(55);
  const [hexInput, setHexInput] = useState('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function hslToHex(h: number, s: number, l: number): string {
    const a = s / 100;
    const b = l / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = b - a * Math.min(b, 1 - b) * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * Math.max(0, Math.min(1, color))).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  const hex = hexInput || hslToHex(hue, saturation, lightness);

  function copyHex() {
    void navigator.clipboard.writeText(hex);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Draw the color wheel canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = 180;
    const center = size / 2;
    const radius = center - 6;
    canvas.width = size;
    canvas.height = size;

    // Draw hue wheel
    for (let angle = 0; angle < 360; angle++) {
      const startAngle = (angle - 1) * Math.PI / 180;
      const endAngle = (angle + 1) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = `hsl(${angle}, ${saturation}%, ${lightness}%)`;
      ctx.fill();
    }

    // Draw white center circle
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Draw current color in center
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();

    // Draw selector dot on wheel
    const selectorAngle = (hue - 90) * Math.PI / 180;
    const selectorRadius = radius * 0.78;
    const sx = center + selectorRadius * Math.cos(selectorAngle);
    const sy = center + selectorRadius * Math.sin(selectorAngle);
    ctx.beginPath();
    ctx.arc(sx, sy, 7, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = hslToHex(hue, saturation, lightness);
    ctx.fill();
  }, [hue, saturation, lightness, hex]);

  function handleWheelClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 90;
    const y = e.clientY - rect.top - 90;
    const angle = Math.atan2(y, x) * 180 / Math.PI + 90;
    setHue(((angle % 360) + 360) % 360);
    setHexInput('');
  }

  function handleHexChange(val: string) {
    setHexInput(val);
    // Try to parse hex into HSL
    const match = val.match(/^#?([0-9a-f]{6})$/i);
    if (match) {
      const r = parseInt(match[1]!.slice(0, 2), 16) / 255;
      const g = parseInt(match[1]!.slice(2, 4), 16) / 255;
      const b = parseInt(match[1]!.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const l = (max + min) / 2;
      let h = 0, s = 0;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
        else if (max === g) h = ((b - r) / d + 2) * 60;
        else h = ((r - g) / d + 4) * 60;
      }
      setHue(Math.round(h));
      setSaturation(Math.round(s * 100));
      setLightness(Math.round(l * 100));
    }
  }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-14 right-48 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/80 p-5 w-[280px] animate-fade-up"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-slate-700">Color Picker</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
          </button>
        </div>

        {/* Color wheel */}
        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            width={180}
            height={180}
            className="cursor-crosshair rounded-full"
            onClick={handleWheelClick}
          />
        </div>

        {/* Sliders */}
        <div className="space-y-2.5 mb-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Saturation</label>
            <input type="range" min="0" max="100" value={saturation} onChange={(e) => { setSaturation(Number(e.target.value)); setHexInput(''); }} className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-violet-600 bg-slate-200" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Lightness</label>
            <input type="range" min="0" max="100" value={lightness} onChange={(e) => { setLightness(Number(e.target.value)); setHexInput(''); }} className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-violet-600 bg-slate-200" />
          </div>
        </div>

        {/* Hex input + copy */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={hexInput || hex}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#a855f7"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md border border-slate-200" style={{ background: hex }} />
          </div>
          <button
            onClick={copyHex}
            className="px-3 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 transition-colors flex-shrink-0"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Usage hint */}
        <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
          <p className="text-[10px] text-violet-700 leading-relaxed">
            <span className="font-bold">How to use:</span> Find a color you like, copy the hex code, then tell the AI editor something like: <span className="italic">&quot;Change the hero background to {hex}&quot;</span> or <span className="italic">&quot;Use {hex} as the accent color&quot;</span>
          </p>
        </div>
      </div>
    </div>
  );
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface WebsiteRecord {
  id: string;
  deployUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  config: Record<string, unknown> | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

type View =
  | { mode: 'loading' }
  | { mode: 'list'; sites: WebsiteRecord[] }
  | { mode: 'builder' }
  | { mode: 'editor'; site: WebsiteRecord; html: string };

function siteName(site: WebsiteRecord): string {
  return String(site.config?.['businessName'] ?? 'Untitled Website');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Image Generator Popup ─────────────────────────────────────────────────────
function ImageGeneratorPopup({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (imageUrl: string) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState<'1024x1024' | '1792x1024' | '1024x1792'>('1024x1024');
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard');
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [revisedPrompt, setRevisedPrompt] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    setImageUrl('');
    try {
      const res = await fetch(`${API_URL}/websites/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size, quality }),
      });
      const data = await res.json() as { success: boolean; imageUrl?: string; revisedPrompt?: string; error?: string };
      if (!data.success) throw new Error(data.error ?? 'Generation failed');
      setImageUrl(data.imageUrl ?? '');
      setRevisedPrompt(data.revisedPrompt ?? '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
    setGenerating(false);
  }

  function copyUrl() {
    if (!imageUrl) return;
    void navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto animate-fade-up"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-800">AI Image Generator</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Create images with DALL-E 3, then tell the AI editor to use them</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Describe your image</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A beautifully plated pasta dish on a dark marble table, overhead shot, warm lighting, restaurant ambiance..."
              rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>

          {/* Options */}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Size</label>
              <div className="flex gap-1.5">
                {([['1024x1024', 'Square'], ['1792x1024', 'Wide'], ['1024x1792', 'Tall']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setSize(val)}
                    className={`flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors ${size === val ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quality</label>
              <div className="flex gap-1.5">
                {([['standard', 'Standard'], ['hd', 'HD']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setQuality(val)}
                    className={`flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-lg border transition-colors ${quality === val ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={() => void handleGenerate()}
            disabled={!prompt.trim() || generating}
            className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl text-sm hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {generating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating image...
              </span>
            ) : 'Generate with DALL-E 3'}
          </button>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          {/* Result */}
          {imageUrl && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                <img src={imageUrl} alt="Generated" className="w-full" />
              </div>
              {revisedPrompt && (
                <p className="text-[10px] text-slate-400 italic leading-relaxed">DALL-E interpreted: &quot;{revisedPrompt}&quot;</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={copyUrl}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-xl text-xs hover:bg-slate-50 transition-colors"
                >
                  {copied ? 'Copied URL!' : 'Copy Image URL'}
                </button>
                <button
                  onClick={() => onInsert(imageUrl)}
                  className="flex-1 py-2.5 bg-violet-600 text-white font-semibold rounded-xl text-xs hover:bg-violet-700 transition-colors"
                >
                  Use as Hero Image
                </button>
              </div>
              <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
                <p className="text-[10px] text-violet-700 leading-relaxed">
                  <span className="font-bold">Tip:</span> Copy the URL and tell the AI editor: <span className="italic">&quot;Use this image as the hero background: {imageUrl.slice(0, 50)}...&quot;</span> or <span className="italic">&quot;Add this to the gallery section&quot;</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── List view ────────────────────────────────────────────────────────────────
function WebsiteList({
  sites,
  onSelect,
  onBuildNew,
  onDelete,
}: {
  sites: WebsiteRecord[];
  onSelect: (site: WebsiteRecord) => void;
  onBuildNew: () => void;
  onDelete: (site: WebsiteRecord) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="p-8 animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Websites</h1>
          <p className="text-sm text-slate-500 mt-1">All your AI-generated websites</p>
        </div>
        <button
          onClick={onBuildNew}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Build New Website
        </button>
      </div>

      {sites.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-violet-600">
              <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-slate-800 mb-1">No websites yet</h2>
          <p className="text-sm text-slate-500 mb-6">Generate your first AI-powered website in under 2 minutes.</p>
          <button
            onClick={onBuildNew}
            className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
          >
            Build My Website
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-6 py-3">Name</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">URL</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Created</th>
                <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-4 py-3">Last updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr
                  key={site.id}
                  onClick={() => onSelect(site)}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-slate-800">{siteName(site)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 capitalize">{String(site.config?.['cuisine'] ?? site.config?.['colorScheme'] ?? 'restaurant')}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                      site.status === 'LIVE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${site.status === 'LIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {site.status === 'LIVE' ? 'Live' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {site.deployUrl ? (
                      <a
                        href={site.deployUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-violet-600 hover:text-violet-800 hover:underline flex items-center gap-1 transition-colors"
                      >
                        <span className="truncate max-w-[180px]">{site.deployUrl.replace(/^https?:\/\//, '')}</span>
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                        </svg>
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-500">{formatDate(site.createdAt)}</td>
                  <td className="px-4 py-4 text-xs text-slate-500">{formatDate(site.updatedAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onSelect(site)}
                        className="text-xs text-violet-600 font-medium hover:text-violet-800 transition-colors"
                      >
                        Edit →
                      </button>
                      {confirmId === site.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => { onDelete(site); setConfirmId(null); }}
                            className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 transition-colors"
                          >
                            Confirm
                          </button>
                          <span className="text-slate-300">·</span>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-[11px] text-slate-500 hover:text-slate-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(site.id)}
                          className="text-[11px] text-slate-400 hover:text-rose-500 transition-colors"
                          title="Delete website"
                        >
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Editor view ──────────────────────────────────────────────────────────────
function WebsiteEditor({
  site,
  initialHtml,
  onBack,
  businessId,
}: {
  site: WebsiteRecord;
  initialHtml: string;
  onBack: () => void;
  businessId: string;
}) {
  const [html, setHtml] = useState(initialHtml);
  const [deployUrl, setDeployUrl] = useState(site.deployUrl ?? '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [editing, setEditing] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [showColorWheel, setShowColorWheel] = useState(false);
  const [showImageGen, setShowImageGen] = useState(false);
  const [showDomainSetup, setShowDomainSetup] = useState(false);
  const [showPexelsSearch, setShowPexelsSearch] = useState(false);
  const [pexelsQuery, setPexelsQuery] = useState('');
  const [pexelsResults, setPexelsResults] = useState<Array<{ url: string; alt: string; photographer: string }>>([]);
  const [pexelsSearching, setPexelsSearching] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [domainStatus, setDomainStatus] = useState<{ configured: boolean; dnsRecords: Array<{ type: string; name: string; value: string }> } | null>(null);
  const [domainSaving, setDomainSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState<Array<{ id: string; label: string | null; createdAt: string }>>([]);
  const [reverting, setReverting] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  async function searchPexels() {
    if (!pexelsQuery.trim()) return;
    setPexelsSearching(true);
    try {
      const res = await fetch(`${API_URL}/images/search-pexels?query=${encodeURIComponent(pexelsQuery)}`);
      const data = await res.json() as { success: boolean; images: Array<{ url: string; alt: string; photographer: string }> };
      if (data.success) setPexelsResults(data.images);
    } catch { /* silent */ }
    setPexelsSearching(false);
  }

  async function loadVersions() {
    try {
      const res = await fetch(`${API_URL}/websites/${site.id}/versions`);
      const data = await res.json() as { success: boolean; versions: typeof versions };
      if (data.success) setVersions(data.versions);
    } catch { /* silent */ }
  }

  async function handleRevert(versionId: string) {
    setReverting(versionId);
    try {
      const res = await fetch(`${API_URL}/websites/${site.id}/revert/${versionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json() as { success: boolean; html?: string; url?: string; error?: string };
      if (data.success && data.html) {
        setHtml(data.html);
        if (data.url) setDeployUrl(data.url);
        setMessages((prev) => [...prev, { role: 'assistant', text: 'Reverted to previous version. Preview updated.' }]);
        void loadVersions();
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', text: `Revert failed: ${data.error ?? 'Unknown error'}` }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: 'assistant', text: `Revert error: ${e instanceof Error ? e.message : 'Network error'}` }]);
    }
    setReverting(null);
    setShowHistory(false);
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, editing]);

  async function handleSend() {
    const text = input.trim();
    if (!text || editing) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setEditing(true);
    setSuggestions([]);

    try {
      const res = await fetch(`${API_URL}/websites/${site.id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json() as { success: boolean; html?: string; url?: string; error?: string; suggestions?: string[] };

      if (!data.success || !data.html) {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.error ?? 'Something went wrong — try rephrasing.' }]);
        return;
      }

      setHtml(data.html);
      if (data.url) setDeployUrl(data.url);
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Done! Preview updated.' }]);
      if (data.suggestions?.length) {
        setSuggestions(data.suggestions);
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Network error — please try again.' }]);
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${siteName(site)}"? This cannot be undone.`)) return;
    try {
      await fetch(`${API_URL}/businesses/${businessId}/websites/${site.id}`, { method: 'DELETE' });
    } catch {
      // best effort
    }
    onBack();
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Websites
        </button>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-800">{siteName(site)}</span>

        <div className="flex items-center gap-3 ml-auto">
          {site.status === 'LIVE' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-emerald-700">Live</span>
            </div>
          )}
          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 transition-colors"
            >
              <span className="truncate max-w-[160px]">{deployUrl.replace(/^https?:\/\//, '')}</span>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
              </svg>
            </a>
          )}

          <button
            onClick={() => void handleDelete()}
            title="Delete website"
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Tools Toolbar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-slate-50 flex-shrink-0">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">Tools</span>
        <button
          onClick={() => setShowColorWheel(!showColorWheel)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showColorWheel ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600'}`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 110-12 6 6 0 010 12zm0-2a4 4 0 100-8 4 4 0 000 8zm0-2a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" /></svg>
          Color Picker
        </button>
        <button
          onClick={() => setShowImageGen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM10 14a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>
          AI Images
        </button>
        <button
          onClick={() => setShowDomainSetup(!showDomainSetup)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showDomainSetup ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600'}`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" /></svg>
          Custom Domain
        </button>
        <button
          onClick={() => setShowPexelsSearch(!showPexelsSearch)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showPexelsSearch ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-600'}`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
          Search Photos
        </button>
        <a
          href="/images"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600 transition-colors"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
          My Images
        </a>
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 bg-white rounded-lg border border-slate-200 p-0.5">
          <button
            onClick={() => setMobilePreview(false)}
            title="Desktop"
            className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${!mobilePreview ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Desktop
          </button>
          <button
            onClick={() => setMobilePreview(true)}
            title="Mobile"
            className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${mobilePreview ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Mobile
          </button>
        </div>
      </div>

      {/* Domain setup panel */}
      {showDomainSetup && (
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-lg">
            <p className="text-xs font-bold text-slate-700 mb-2">Connect Custom Domain</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="www.yourbusiness.com"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <button
                onClick={async () => {
                  if (!customDomain.trim()) return;
                  setDomainSaving(true);
                  try {
                    const res = await fetch(`${API_URL}/websites/${site.id}/domain`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ domain: customDomain.trim() }),
                    });
                    const data = await res.json() as { success: boolean; configured: boolean; dnsRecords: Array<{ type: string; name: string; value: string }>; error?: string };
                    if (data.success) {
                      setDomainStatus({ configured: data.configured, dnsRecords: data.dnsRecords });
                    }
                  } catch { /* silent */ }
                  setDomainSaving(false);
                }}
                disabled={domainSaving || !customDomain.trim()}
                className="px-4 py-2 bg-violet-600 text-white text-xs font-semibold rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
              >
                {domainSaving ? 'Saving...' : 'Connect'}
              </button>
            </div>
            {domainStatus && (
              <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  {domainStatus.configured ? 'Domain connected!' : 'Add these DNS records at your registrar:'}
                </p>
                {!domainStatus.configured && (
                  <table className="w-full text-[11px]">
                    <thead><tr className="text-slate-400"><th className="text-left pr-4">Type</th><th className="text-left pr-4">Name</th><th className="text-left">Value</th></tr></thead>
                    <tbody>
                      {domainStatus.dnsRecords.map((r, i) => (
                        <tr key={i} className="text-slate-700 font-mono"><td className="pr-4">{r.type}</td><td className="pr-4">{r.name}</td><td>{r.value}</td></tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <p className="text-[10px] text-slate-400 mt-2">DNS changes can take up to 48 hours to propagate.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pexels search panel */}
      {showPexelsSearch && (
        <div className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-3xl">
            <p className="text-xs font-bold text-slate-700 mb-2">Search Free Photos (Pexels)</p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={pexelsQuery}
                onChange={(e) => setPexelsQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void searchPexels(); } }}
                placeholder="Search for photos... e.g. 'italian restaurant interior'"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                onClick={() => void searchPexels()}
                disabled={!pexelsQuery.trim() || pexelsSearching}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {pexelsSearching ? 'Searching...' : 'Search'}
              </button>
            </div>
            {pexelsResults.length > 0 && (
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                {pexelsResults.map((img, i) => (
                  <div key={i} className="relative group cursor-pointer" onClick={() => {
                    void navigator.clipboard.writeText(img.url);
                    setInput(`Use this image: ${img.url}`);
                    setShowPexelsSearch(false);
                  }}>
                    <img src={img.url} alt={img.alt} className="w-full aspect-square object-cover rounded-lg group-hover:ring-2 ring-emerald-500 transition-all" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-lg transition-all flex items-center justify-center">
                      <span className="text-white text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">Click to use</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pexelsResults.length > 0 && (
              <p className="text-[9px] text-slate-400 mt-2">Photos by <a href="https://www.pexels.com" target="_blank" rel="noreferrer" className="underline">Pexels</a> photographers. Click an image to use it.</p>
            )}
          </div>
        </div>
      )}

      {/* Color wheel popup */}
      {showColorWheel && <ColorWheelPopup onClose={() => setShowColorWheel(false)} />}

      {/* Image generator popup */}
      {showImageGen && (
        <ImageGeneratorPopup
          onClose={() => setShowImageGen(false)}
          onInsert={(imageUrl) => {
            setShowImageGen(false);
            setInput(`Use this image as the hero background: ${imageUrl}`);
          }}
        />
      )}

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Preview */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 bg-slate-100">
          <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-shrink-0">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 bg-white border border-slate-200 rounded px-3 py-1 text-[11px] text-slate-500 truncate">
              {deployUrl ? deployUrl.replace(/^https?:\/\//, '') : 'local preview'}
            </div>
          </div>
          <div className={`flex-1 overflow-auto flex ${mobilePreview ? 'items-start justify-center py-6' : ''}`}>
            {/* Render HTML directly — srcDoc works for both template and AI-generated HTML.
                Tailwind CDN loads within the iframe since allow-scripts is set. */}
            <iframe
              srcDoc={html}
              title="Website Preview"
              className="border-0 bg-white"
              style={mobilePreview
                ? { width: '375px', height: '812px', flexShrink: 0, borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }
                : { width: '100%', height: '100%' }
              }
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        </div>

        {/* Chat */}
        <div className="w-80 flex flex-col bg-white flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-700">{showHistory ? 'Version History' : 'AI Editor'}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{showHistory ? 'Revert to any previous version' : 'Ask me to change anything on this site'}</p>
              </div>
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  if (!showHistory && versions.length === 0) void loadVersions();
                }}
                className={`p-1.5 rounded-lg transition-colors ${showHistory ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-violet-600'}`}
                title="Version history"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd"/></svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {/* Version history panel */}
            {showHistory && (
              <div className="space-y-2">
                {versions.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No previous versions yet. Versions are saved automatically before each edit.</p>
                ) : versions.map((v) => (
                  <div key={v.id} className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-slate-700 truncate">{v.label ?? 'Version'}</p>
                      <p className="text-[10px] text-slate-400">{new Date(v.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                    </div>
                    <button
                      onClick={() => void handleRevert(v.id)}
                      disabled={reverting !== null}
                      className="px-2.5 py-1 bg-violet-600 text-white text-[10px] font-semibold rounded-md hover:bg-violet-700 disabled:opacity-50 transition-colors flex-shrink-0"
                    >
                      {reverting === v.id ? 'Reverting...' : 'Revert'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 ${showHistory ? 'hidden' : ''}`}>
            {messages.length === 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Try asking:</p>
                {[
                  'Change the hero heading to "Best Pizza in Brooklyn"',
                  'Switch to the warm color scheme',
                  'Update the phone number to (212) 555-0100',
                  'Change the CTA button to say "Reserve Now"',
                  'Add "Closed" for Sunday hours',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="w-full text-left px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-700 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Smart AI suggestions — shown after edits */}
            {suggestions.length > 0 && !editing && messages.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide flex items-center gap-1">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3"><path d="M8 1.5A4.5 4.5 0 003.5 6c0 1.09.39 2.09 1.03 2.87.48.58.72 1.2.72 1.88V11a1 1 0 001 1h3.5a1 1 0 001-1v-.25c0-.68.24-1.3.72-1.88A4.48 4.48 0 0012.5 6 4.5 4.5 0 008 1.5zM6.25 13a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z"/></svg>
                  Ideas for your next change
                </p>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); setSuggestions([]); }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-violet-50/50 border border-violet-100 text-[11px] text-violet-700 hover:bg-violet-50 hover:border-violet-200 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {editing && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-xl rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
                  {[0, 150, 300].map((delay) => (
                    <div
                      key={delay}
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: `${delay}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="px-3 py-3 border-t border-slate-100 flex-shrink-0">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
                placeholder="What would you like to change?"
                rows={2}
                disabled={editing}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 resize-none disabled:opacity-50"
              />
              <button
                onClick={() => void handleSend()}
                disabled={editing || !input.trim()}
                className="px-3 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors flex-shrink-0 self-end"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1.5 text-center">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Root component ───────────────────────────────────────────────────────────
// Map Prisma BusinessType enum values to IndustryId used by the builder
function mapBusinessType(type?: string): string | null {
  const map: Record<string, string> = {
    RESTAURANT: 'restaurant',
    SALON: 'salon',
    RETAIL: 'retail',
    FITNESS: 'gym',
    MEDICAL: 'spa',
    OTHER: '',
  };
  return map[type ?? ''] ?? null;
}

export default function WebsitePageClient({ businessId, businessType }: { businessId: string; businessType?: string }) {
  const detectedIndustry = mapBusinessType(businessType) || null;
  const [view, setView] = useState<View>({ mode: 'loading' });

  const loadList = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/businesses/${businessId}/websites`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const d = await res.json() as { success: boolean; websites?: WebsiteRecord[] };
      setView({ mode: 'list', sites: d.websites ?? [] });
    } catch (err) {
      console.error('[Website] Failed to load websites:', err);
      setView({ mode: 'list', sites: [] });
    }
  }, [businessId]);

  useEffect(() => { void loadList(); }, [loadList]);

  async function handleSelectSite(site: WebsiteRecord) {
    try {
      const res = await fetch(`${API_URL}/websites/preview/${site.id}`);
      const html = res.ok ? await res.text() : '';
      setView({ mode: 'editor', site, html });
    } catch {
      setView({ mode: 'editor', site, html: '' });
    }
  }

  async function handleDelete(site: WebsiteRecord) {
    try {
      await fetch(`${API_URL}/businesses/${businessId}/websites/${site.id}`, { method: 'DELETE' });
    } catch {
      // best effort
    }
    void loadList();
  }

  function handleGenerated(result: { websiteId: string; html: string; url: string }) {
    const newSite: WebsiteRecord = {
      id: result.websiteId,
      deployUrl: result.url || null,
      status: result.url ? 'LIVE' : 'GENERATING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config: null,
    };
    setView({ mode: 'editor', site: newSite, html: result.html });
  }

  if (view.mode === 'loading') {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (view.mode === 'builder') {
    return <WebsiteBuilder businessId={businessId} detectedIndustry={detectedIndustry} onGenerated={handleGenerated} />;
  }

  if (view.mode === 'editor') {
    return (
      <WebsiteEditor
        site={view.site}
        initialHtml={view.html}
        businessId={businessId}
        onBack={() => { void loadList(); }}
      />
    );
  }

  // list
  return (
    <WebsiteList
      sites={view.sites}
      onSelect={(site) => { void handleSelectSite(site); }}
      onBuildNew={() => setView({ mode: 'builder' })}
      onDelete={(site) => { void handleDelete(site); }}
    />
  );
}
