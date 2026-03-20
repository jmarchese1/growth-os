'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBusiness } from '../../../components/auth/business-provider';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface ImageAsset {
  id: string;
  url: string;
  thumbnail: string | null;
  prompt: string | null;
  source: string;
  alt: string | null;
  category: string | null;
  favorite: boolean;
  createdAt: string;
}

const CATEGORIES = ['all', 'food', 'interior', 'team', 'logo', 'product', 'lifestyle', 'general'] as const;

const SIZES = [
  { value: '1024x1024', label: 'Square (1024x1024)' },
  { value: '1792x1024', label: 'Wide (1792x1024)' },
  { value: '1024x1792', label: 'Tall (1024x1792)' },
];

export default function ImagesPage() {
  const { business } = useBusiness();
  const businessId = business?.id ?? '';

  const [images, setImages] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showGenerator, setShowGenerator] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard');
  const [category, setCategory] = useState('food');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageAsset | null>(null);
  const [saveUrl, setSaveUrl] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [allowRewrite, setAllowRewrite] = useState(true);
  const [lastRevisedPrompt, setLastRevisedPrompt] = useState('');

  const loadImages = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId });
      if (filter !== 'all') params.set('category', filter);
      const res = await fetch(`${API_URL}/images?${params}`);
      const data = await res.json() as { success: boolean; images: ImageAsset[] };
      if (data.success) setImages(data.images);
    } catch { /* silent */ }
    setLoading(false);
  }, [businessId, filter]);

  useEffect(() => { void loadImages(); }, [loadImages]);

  async function handleGenerate() {
    if (!prompt.trim() || !businessId) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/images/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, prompt, size, quality, category }),
      });
      const data = await res.json() as { success: boolean; image?: ImageAsset; error?: string };
      if (!data.success) throw new Error(data.error ?? 'Generation failed');
      if (data.image) {
        setImages((prev) => [data.image!, ...prev]);
        if (data.image.prompt && data.image.prompt !== prompt) {
          setLastRevisedPrompt(data.image.prompt);
        }
      }
      setPrompt('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    }
    setGenerating(false);
  }

  async function handleSaveUrl() {
    if (!saveUrl.trim() || !businessId) return;
    try {
      const res = await fetch(`${API_URL}/images/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, url: saveUrl, category, source: 'upload' }),
      });
      const data = await res.json() as { success: boolean; image?: ImageAsset };
      if (data.success && data.image) setImages((prev) => [data.image!, ...prev]);
      setSaveUrl('');
      setShowSaveForm(false);
    } catch { /* silent */ }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`${API_URL}/images/${id}`, { method: 'DELETE' });
      setImages((prev) => prev.filter((img) => img.id !== id));
      if (selectedImage?.id === id) setSelectedImage(null);
    } catch { /* silent */ }
  }

  async function handleToggleFavorite(id: string, current: boolean) {
    try {
      await fetch(`${API_URL}/images/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: !current }),
      });
      setImages((prev) => prev.map((img) => img.id === id ? { ...img, favorite: !current } : img));
    } catch { /* silent */ }
  }

  function copyUrl(url: string) {
    void navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="p-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Image Library</h1>
          <p className="text-sm text-slate-500 mt-1">Generate AI images, save URLs, and use them across your website, surveys, and campaigns.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSaveForm(!showSaveForm)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>
            Save URL
          </button>
          <button
            onClick={() => setShowGenerator(!showGenerator)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
            Generate with AI
          </button>
        </div>
      </div>

      {/* Save URL form */}
      {showSaveForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Save Image URL</h3>
          <div className="flex gap-3">
            <input
              type="url"
              value={saveUrl}
              onChange={(e) => setSaveUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
              className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600">
              {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
            <button onClick={() => void handleSaveUrl()} disabled={!saveUrl.trim()} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50">Save</button>
          </div>
        </div>
      )}

      {/* AI Generator */}
      {showGenerator && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Generate Image with DALL-E 3</h3>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A beautifully plated pasta dish on a rustic wooden table, warm restaurant lighting, overhead shot, professional food photography..."
            rows={3}
            style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none mb-3"
          />
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Size</label>
              <div className="flex gap-1.5">
                {SIZES.map(s => (
                  <button key={s.value} onClick={() => setSize(s.value)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${size === s.value ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
                    {s.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Quality</label>
              <div className="flex gap-1.5">
                {(['standard', 'hd'] as const).map(q => (
                  <button key={q} onClick={() => setQuality(q)} className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${quality === q ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}>
                    {q === 'hd' ? 'HD' : 'Standard'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600">
                {CATEGORIES.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex-1" />
            <button
              onClick={() => void handleGenerate()}
              disabled={!prompt.trim() || generating}
              className="px-6 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </span>
              ) : 'Generate'}
            </button>
          </div>
          {/* Rewrite toggle */}
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => setAllowRewrite(!allowRewrite)}
              className={`relative w-9 h-5 rounded-full transition-colors ${allowRewrite ? 'bg-violet-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${allowRewrite ? 'left-4.5 translate-x-0' : 'left-0.5'}`} style={{ left: allowRewrite ? '18px' : '2px' }} />
            </button>
            <span className="text-xs text-slate-600">Let AI rewrite my prompt for better results</span>
          </div>
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 mb-6">
        {CATEGORIES.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filter === c ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
          >
            {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-slate-400 self-center">{images.length} image{images.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Image grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : images.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center">
          <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-violet-600"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>
          </div>
          <h2 className="text-base font-semibold text-slate-800 mb-1">No images yet</h2>
          <p className="text-sm text-slate-500 mb-6">Generate AI images or save URLs to build your library.</p>
          <button onClick={() => setShowGenerator(true)} className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700">Generate Your First Image</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative bg-white border border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-violet-200 transition-all"
              onClick={() => setSelectedImage(img)}
            >
              <div className="aspect-square overflow-hidden bg-slate-100">
                <img src={img.url} alt={img.alt ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{img.source === 'dalle' ? 'AI Generated' : img.source}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); void handleToggleFavorite(img.id, img.favorite); }}
                    className={`p-1 rounded transition-colors ${img.favorite ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'}`}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  </button>
                </div>
                {img.category && <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-medium rounded-full">{img.category}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image detail modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedImage(null)}>
          <div onClick={(e) => e.stopPropagation()} className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto my-auto">
            {/* Close button */}
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white shadow-sm transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/></svg>
            </button>
            <div className="aspect-video overflow-hidden rounded-t-2xl bg-slate-100">
              <img src={selectedImage.url} alt={selectedImage.alt ?? ''} className="w-full h-full object-contain" />
            </div>
            <div className="p-6 space-y-4">
              {selectedImage.prompt && (
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Prompt</p>
                  <p className="text-sm text-slate-700">{selectedImage.prompt}</p>
                </div>
              )}
              <div className="flex gap-3 text-xs text-slate-500">
                <span className="px-2 py-1 bg-slate-100 rounded-full">{selectedImage.source === 'dalle' ? 'AI Generated' : selectedImage.source}</span>
                {selectedImage.category && <span className="px-2 py-1 bg-slate-100 rounded-full">{selectedImage.category}</span>}
                <span className="px-2 py-1 bg-slate-100 rounded-full">{new Date(selectedImage.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyUrl(selectedImage.url)} className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50">
                  {copied === selectedImage.url ? 'Copied!' : 'Copy URL'}
                </button>
                <a href={selectedImage.url} target="_blank" rel="noreferrer" className="flex-1 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 text-center">
                  Open Full Size
                </a>
                <button onClick={() => { void handleDelete(selectedImage.id); setSelectedImage(null); }} className="py-2.5 px-4 border border-rose-200 text-rose-600 text-sm font-medium rounded-xl hover:bg-rose-50">
                  Delete
                </button>
              </div>
              <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
                <p className="text-[10px] text-violet-700">
                  <span className="font-bold">Use this image:</span> Copy the URL and paste it into the website builder hero image field, gallery section, or any tool that accepts image URLs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
