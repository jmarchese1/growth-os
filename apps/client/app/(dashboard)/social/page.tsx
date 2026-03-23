'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useBusiness } from '../../../components/auth/business-provider';
import KpiCard from '../../../components/ui/kpi-card';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface ContentPost {
  id: string;
  platform: string;
  caption: string;
  imageUrl: string | null;
  hashtags: string[];
  status: string;
  scheduledAt: string | null;
  postedAt: string | null;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
}

interface ImageAsset {
  id: string;
  url: string;
  alt: string | null;
  category: string | null;
  source: string;
  createdAt: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: 'rose',
  FACEBOOK: 'sky',
  GOOGLE_MY_BUSINESS: 'emerald',
  TIKTOK: 'slate',
};

const STATUS_COLORS: Record<string, string> = {
  POSTED: 'bg-emerald-50 text-emerald-700',
  SCHEDULED: 'bg-amber-50 text-amber-700',
  DRAFT: 'bg-slate-100 text-slate-500',
  FAILED: 'bg-red-50 text-red-600',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function platformLabel(p: string) {
  if (p === 'GOOGLE_MY_BUSINESS') return 'Google';
  return p.charAt(0) + p.slice(1).toLowerCase();
}

/* ─── Image Picker ───────────────────────────────────────────────────────── */

function ImagePicker({ businessId, selectedUrl, onSelect }: { businessId: string; selectedUrl: string | null; onSelect: (url: string | null) => void }) {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/images?businessId=${businessId}`);
        if (res.ok) {
          const data = (await res.json()) as { images: ImageAsset[] };
          setImages(data.images ?? []);
        }
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, [businessId]);

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 py-2"><div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> Loading images...</div>;
  }

  if (images.length === 0) {
    return (
      <div className="text-xs text-slate-400 dark:text-slate-500 py-2">
        No images in your library. <Link href="/images" className="text-violet-500 hover:underline">Upload or generate images</Link> first.
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto pr-1">
        {images.map((img) => (
          <button key={img.id} type="button" onClick={() => onSelect(selectedUrl === img.url ? null : img.url)}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedUrl === img.url ? 'border-violet-500 ring-2 ring-violet-500/30' : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300'}`}>
            <img src={img.url} alt={img.alt ?? ''} className="w-full h-full object-cover" />
            {selectedUrl === img.url && (
              <div className="absolute inset-0 bg-violet-500/20 flex items-center justify-center">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white drop-shadow-md">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
      {selectedUrl && (
        <button type="button" onClick={() => onSelect(null)} className="text-[10px] text-red-400 hover:text-red-500 mt-1">Remove image</button>
      )}
    </div>
  );
}

/* ─── Modal Backdrop ─────────────────────────────────────────────────────── */

function ModalBackdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1730] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ─── Generate Modal ─────────────────────────────────────────────────────── */

function GenerateModal({ businessId, onDone, onClose }: { businessId: string; onDone: () => void; onClose: () => void }) {
  const [platform, setPlatform] = useState('INSTAGRAM');
  const [topic, setTopic] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [publishNow, setPublishNow] = useState(false);
  const [error, setError] = useState('');

  const tomorrow = new Date(Date.now() + 86400000);
  const defaultDate = tomorrow.toISOString().slice(0, 10);

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      let scheduledAt: string | undefined;
      if (scheduleDate && !publishNow) {
        const dt = new Date(`${scheduleDate}T${scheduleTime || '09:00'}:00`);
        if (!isNaN(dt.getTime())) scheduledAt = dt.toISOString();
      }

      // Generate the post
      const res = await fetch(`${API_BASE}/businesses/${businessId}/posts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, topic: topic.trim() || undefined, scheduledAt }),
      });
      if (!res.ok) { setError('Generation failed. Try again.'); return; }

      const data = (await res.json()) as { success: boolean; post: { id: string } };

      // Attach the selected image if any
      if (imageUrl && data.post?.id) {
        await fetch(`${API_BASE}/businesses/${businessId}/posts/${data.post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl }),
        });
      }

      // Publish immediately if requested
      if (publishNow && data.post?.id) {
        if (platform === 'INSTAGRAM' && !imageUrl) {
          setError('Instagram requires an image — select one from your library.');
          onDone();
          return;
        }
        const pubRes = await fetch(`${API_BASE}/businesses/${businessId}/posts/${data.post.id}/publish`, { method: 'POST' });
        if (!pubRes.ok) {
          const pubData = (await pubRes.json()) as { error?: string };
          setError(pubData.error ?? 'Publishing failed');
          onDone();
          return;
        }
      }

      onDone();
      onClose();
    } catch {
      setError('Generation failed. Try again.');
    } finally {
      setGenerating(false);
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300';
  const platforms = ['INSTAGRAM', 'FACEBOOK'];

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Generate AI Post</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Claude will write a platform-optimised post for you</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-slate-500 transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </button>
      </div>
      <div className="px-6 py-5 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Platform</label>
          <div className="grid grid-cols-2 gap-2">
            {platforms.map((p) => (
              <button key={p} onClick={() => setPlatform(p)}
                className={`py-2 rounded-lg border text-xs font-medium transition-colors ${platform === p ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}>
                {platformLabel(p)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Topic (optional)</label>
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. weekend brunch special, new menu item, happy hour..."
            className={inputClass} />
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Leave blank to generate general business content</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Image</label>
          <ImagePicker businessId={businessId} selectedUrl={imageUrl} onSelect={setImageUrl} />
          {platform === 'INSTAGRAM' && !imageUrl && (
            <p className="text-[10px] text-amber-500 mt-1">Instagram requires an image to publish</p>
          )}
        </div>
        {!publishNow && (
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Schedule (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={scheduleDate} min={defaultDate} onChange={(e) => setScheduleDate(e.target.value)} className={inputClass} />
              <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className={inputClass} placeholder="09:00" />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Leave blank to save as a draft</p>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 dark:border-white/[0.08] text-violet-600 focus:ring-violet-500" />
          <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Publish immediately after generating</span>
        </label>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
      <div className="px-6 py-4 bg-slate-50 dark:bg-white/[0.04] border-t border-slate-200 dark:border-white/[0.08] flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Cancel</button>
        <button onClick={handleGenerate} disabled={generating}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-2">
          {generating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {generating ? 'Working...' : publishNow ? 'Generate & Publish' : scheduleDate ? 'Generate & Schedule' : 'Generate Draft'}
        </button>
      </div>
    </ModalBackdrop>
  );
}

/* ─── Edit Modal ─────────────────────────────────────────────────────────── */

function EditModal({ businessId, post, onDone, onClose }: { businessId: string; post: ContentPost; onDone: () => void; onClose: () => void }) {
  const [caption, setCaption] = useState(post.caption);
  const [hashtags, setHashtags] = useState(post.hashtags.join(', '));
  const [platform, setPlatform] = useState(post.platform);
  const [imageUrl, setImageUrl] = useState<string | null>(post.imageUrl);
  const [scheduleDate, setScheduleDate] = useState(post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 10) : '');
  const [scheduleTime, setScheduleTime] = useState(post.scheduledAt ? new Date(post.scheduledAt).toTimeString().slice(0, 5) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inputClass = 'w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300';
  const platforms = ['INSTAGRAM', 'FACEBOOK'];

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      let scheduledAt: string | null = null;
      if (scheduleDate) {
        const dt = new Date(`${scheduleDate}T${scheduleTime || '09:00'}:00`);
        if (!isNaN(dt.getTime())) scheduledAt = dt.toISOString();
      }

      const res = await fetch(`${API_BASE}/businesses/${businessId}/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          hashtags: hashtags.split(',').map((h) => h.trim()).filter(Boolean),
          platform,
          imageUrl,
          scheduledAt,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Save failed');
        return;
      }

      onDone();
      onClose();
    } catch {
      setError('Save failed. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Edit Post</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-slate-500 transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </button>
      </div>
      <div className="px-6 py-5 space-y-4 overflow-y-auto">
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Platform</label>
          <div className="grid grid-cols-2 gap-2">
            {platforms.map((p) => (
              <button key={p} type="button" onClick={() => setPlatform(p)}
                className={`py-2 rounded-lg border text-xs font-medium transition-colors ${platform === p ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'}`}>
                {platformLabel(p)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Caption</label>
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hashtags</label>
          <input type="text" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="food, restaurant, dining" className={inputClass} />
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Comma-separated, without #</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Image</label>
          <ImagePicker businessId={businessId} selectedUrl={imageUrl} onSelect={setImageUrl} />
          {platform === 'INSTAGRAM' && !imageUrl && (
            <p className="text-[10px] text-amber-500 mt-1">Instagram requires an image to publish</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Schedule</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className={inputClass} />
            <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className={inputClass} />
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Clear to save as draft</p>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
      <div className="px-6 py-4 bg-slate-50 dark:bg-white/[0.04] border-t border-slate-200 dark:border-white/[0.08] flex gap-2 justify-end">
        <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-2">
          {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </ModalBackdrop>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────────────── */

export default function SocialMediaPage() {
  const { business } = useBusiness();
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const settings = business?.settings as Record<string, unknown> | null;

  const platforms = [
    {
      platform: 'Instagram',
      key: 'INSTAGRAM',
      connected: !!(business?.instagramPageId),
      color: 'rose',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      ),
    },
    {
      platform: 'Facebook',
      key: 'FACEBOOK',
      connected: !!(business?.facebookPageId),
      color: 'sky',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  ];

  const connectedCount = platforms.filter((p) => p.connected).length;

  const fetchPosts = useCallback(async () => {
    if (!business?.id) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/businesses/${business.id}/posts`);
      if (res.ok) {
        const data = await res.json() as { items: ContentPost[] };
        setPosts(data.items ?? []);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  async function handlePublish(postId: string) {
    if (!business?.id) return;
    setPublishingId(postId);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/businesses/${business.id}/posts/${postId}/publish`, { method: 'POST' });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Publishing failed');
      }
      await fetchPosts();
    } catch {
      setError('Publishing failed — check your connection');
    } finally {
      setPublishingId(null);
    }
  }

  async function handleDelete(postId: string) {
    if (!business?.id || !confirm('Delete this post?')) return;
    try {
      await fetch(`${API_BASE}/businesses/${business.id}/posts/${postId}`, { method: 'DELETE' });
      await fetchPosts();
    } catch {
      setError('Delete failed');
    }
  }

  const published = posts.filter((p) => p.status === 'POSTED');
  const scheduled = posts.filter((p) => p.status === 'SCHEDULED');
  const totalEngagement = published.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);

  return (
    <div className="p-8 animate-fade-up">
      {showGenerate && business && (
        <GenerateModal businessId={business.id} onDone={fetchPosts} onClose={() => setShowGenerate(false)} />
      )}
      {editingPost && business && (
        <EditModal businessId={business.id} post={editingPost} onDone={fetchPosts} onClose={() => setEditingPost(null)} />
      )}

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Social Media</h1>
          <p className="text-sm text-slate-500 mt-1">AI content generation, scheduling & publishing</p>
        </div>
        <button onClick={() => setShowGenerate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 transition-colors shadow-sm shadow-violet-600/20">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          Generate Post
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-red-600 flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Posts Published" value={published.length} color="violet"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>} />
        <KpiCard label="Total Engagement" value={totalEngagement} color="emerald"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Scheduled" value={scheduled.length} color="sky"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Platforms Connected" value={connectedCount} color="amber"
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>} />
      </div>

      {/* Connected Platforms */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">Connected Platforms</h2>
          <Link href="/integrations"
            className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
            Manage Integrations
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {platforms.map(({ platform, icon, color, connected }) => (
            <Link key={platform} href="/integrations"
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 hover:border-slate-300 hover:shadow-sm transition-all group">
              <div className={`w-9 h-9 rounded-lg bg-${color}-50 border border-${color}-200/60 flex items-center justify-center text-${color}-600`}>
                {icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700">{platform}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <p className={`text-[10px] ${connected ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                    {connected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
          ))}
        </div>
      </div>

      {/* Content Posts */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Content</h2>
        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-slate-300 mx-auto mb-3">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
            <p className="text-slate-500 text-sm font-medium mb-1">No content yet</p>
            <p className="text-slate-400 text-xs mb-4">
              {connectedCount === 0
                ? 'Connect a social account to start generating and scheduling AI content.'
                : 'Click "Generate Post" to create your first AI-powered social media post.'}
            </p>
            {connectedCount === 0 && (
              <Link href="/integrations"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-violet-600 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
                Connect Social Accounts
              </Link>
            )}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Content</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Platform</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Engagement</th>
                  <th className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const colorKey = PLATFORM_COLORS[post.platform] ?? 'slate';
                  const isPublishing = publishingId === post.id;
                  return (
                    <tr key={post.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 max-w-xs">
                        <div className="flex items-center gap-3">
                          {post.imageUrl && (
                            <img src={post.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                          )}
                          <p className="text-sm text-slate-700 truncate">{post.caption}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-${colorKey}-50 text-${colorKey}-600`}>
                          {platformLabel(post.platform)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[post.status] ?? 'bg-slate-100 text-slate-500'}`}>
                          {post.status === 'POSTED' ? 'Published' : post.status.charAt(0) + post.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {post.postedAt ? formatDate(post.postedAt) : post.scheduledAt ? formatDate(post.scheduledAt) : '—'}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">
                        {post.status === 'POSTED' ? `${post.likes + post.comments + post.shares} total` : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {(post.status === 'DRAFT' || post.status === 'SCHEDULED' || post.status === 'FAILED') && (
                            <>
                              <button onClick={() => handlePublish(post.id)} disabled={isPublishing}
                                className="px-2.5 py-1 text-[11px] font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-1">
                                {isPublishing ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                  </svg>
                                )}
                                {post.status === 'FAILED' ? 'Retry' : 'Publish'}
                              </button>
                              <button onClick={() => setEditingPost(post)}
                                className="px-2.5 py-1 text-[11px] font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                Edit
                              </button>
                              <button onClick={() => handleDelete(post.id)}
                                className="px-2.5 py-1 text-[11px] font-medium text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors">
                                Delete
                              </button>
                            </>
                          )}
                          {post.status === 'POSTED' && (
                            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Live
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
