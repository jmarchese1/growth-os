'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useBusiness } from '../../../components/auth/business-provider';
import KpiCard from '../../../components/ui/kpi-card';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface ContentPost {
  id: string;
  platform: string;
  caption: string;
  status: string;
  scheduledAt: string | null;
  postedAt: string | null;
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  INSTAGRAM: 'rose',
  FACEBOOK: 'sky',
  GOOGLE: 'emerald',
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

function GenerateModal({ businessId, onDone, onClose }: { businessId: string; onDone: () => void; onClose: () => void }) {
  const [platform, setPlatform] = useState('INSTAGRAM');
  const [topic, setTopic] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/businesses/${businessId}/posts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, topic: topic.trim() || undefined }),
      });
      if (!res.ok) { setError('Generation failed. Try again.'); return; }
      onDone();
      onClose();
    } catch {
      setError('Generation failed. Try again.');
    } finally {
      setGenerating(false);
    }
  }

  const platforms = ['INSTAGRAM', 'FACEBOOK', 'GOOGLE', 'TIKTOK'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Generate AI Post</h3>
            <p className="text-xs text-slate-400 mt-0.5">Claude will write a platform-optimised post for you</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Platform</label>
            <div className="grid grid-cols-4 gap-2">
              {platforms.map((p) => (
                <button key={p} onClick={() => setPlatform(p)}
                  className={`py-2 rounded-lg border text-xs font-medium transition-colors ${platform === p ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {p === 'GOOGLE' ? 'Google' : p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Topic (optional)</label>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. weekend brunch special, new menu item, happy hour..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300" />
            <p className="text-[10px] text-slate-400 mt-1">Leave blank to generate general business content</p>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
          <button onClick={handleGenerate} disabled={generating}
            className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-2">
            {generating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {generating ? 'Generating...' : 'Generate Post'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SocialMediaPage() {
  const { business } = useBusiness();
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);

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
    {
      platform: 'Google My Business',
      key: 'GOOGLE',
      connected: !!(settings?.['googleBusinessProfileId']),
      color: 'emerald',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      ),
    },
    {
      platform: 'TikTok',
      key: 'TIKTOK',
      connected: !!(settings?.['tiktokConnected']),
      color: 'slate',
      icon: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.18 8.18 0 004.77 1.52V6.82a4.84 4.84 0 01-1-.13z" />
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

  const published = posts.filter((p) => p.status === 'POSTED');
  const scheduled = posts.filter((p) => p.status === 'SCHEDULED');
  const totalEngagement = published.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);

  return (
    <div className="p-8 animate-fade-up">
      {showGenerate && business && (
        <GenerateModal
          businessId={business.id}
          onDone={fetchPosts}
          onClose={() => setShowGenerate(false)}
        />
      )}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Social Media</h1>
          <p className="text-sm text-slate-500 mt-1">AI content generation, scheduling & engagement</p>
        </div>
        <button onClick={() => setShowGenerate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 transition-colors shadow-sm shadow-violet-600/20">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          Generate Post
        </button>
      </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                : 'Your AI-generated content will appear here once the social media module is active.'}
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
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const colorKey = PLATFORM_COLORS[post.platform] ?? 'slate';
                  return (
                    <tr key={post.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 max-w-xs">
                        <p className="text-sm text-slate-700 truncate">{post.caption}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-${colorKey}-50 text-${colorKey}-600`}>
                          {post.platform.replace('_MY_BUSINESS', '')}
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
