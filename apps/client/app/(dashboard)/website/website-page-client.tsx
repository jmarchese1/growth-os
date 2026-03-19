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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, editing]);

  async function handleSend() {
    const text = input.trim();
    if (!text || editing) return;

    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setEditing(true);

    try {
      const res = await fetch(`${API_URL}/websites/${site.id}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json() as { success: boolean; html?: string; url?: string; error?: string };

      if (!data.success || !data.html) {
        setMessages((prev) => [...prev, { role: 'assistant', text: data.error ?? 'Something went wrong — try rephrasing.' }]);
        return;
      }

      setHtml(data.html);
      if (data.url) setDeployUrl(data.url);
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Done! Preview updated. Want anything else changed?' }]);
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
          {/* Mobile / Desktop toggle */}
          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setMobilePreview(false)}
              title="Desktop preview"
              className={`p-1.5 rounded-md transition-colors ${!mobilePreview ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 011 1v7a1 1 0 01-1 1H4a1 1 0 01-1-1V5zm14 9H3a1 1 0 000 2h14a1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => setMobilePreview(true)}
              title="Mobile preview"
              className={`p-1.5 rounded-md transition-colors ${mobilePreview ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {site.status === 'LIVE' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-emerald-700">Live</span>
            </div>
          )}
          {/* Color wheel button */}
          <button
            onClick={() => setShowColorWheel(!showColorWheel)}
            title="Color picker — find hex codes for precise AI edits"
            className={`p-1.5 rounded-lg transition-colors ${showColorWheel ? 'bg-violet-100 text-violet-700' : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'}`}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 110-12 6 6 0 010 12zm0-2a4 4 0 100-8 4 4 0 000 8zm0-2a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
            </svg>
          </button>

          {/* Image generator button */}
          <button
            onClick={() => setShowImageGen(true)}
            title="AI Image Generator — create images with DALL-E 3"
            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v7a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM10 14a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>

          {deployUrl && (
            <a
              href={deployUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 transition-colors"
            >
              <span className="truncate max-w-[200px]">{deployUrl.replace(/^https?:\/\//, '')}</span>
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
            <iframe
              srcDoc={html}
              title="Website Preview"
              className="border-0 bg-white"
              style={mobilePreview
                ? { width: '375px', height: '812px', flexShrink: 0, borderRadius: '20px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }
                : { width: '100%', height: '100%' }
              }
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </div>

        {/* Chat */}
        <div className="w-80 flex flex-col bg-white flex-shrink-0">
          <div className="px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <p className="text-xs font-semibold text-slate-700">AI Editor</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Ask me to change anything on this site</p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
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
