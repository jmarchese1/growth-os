'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  campaignId: string;
  currentSubject: string;
  currentBodyHtml: string;
  prospectorUrl: string;
}

export function EditEmailButton({ campaignId, currentSubject, currentBodyHtml, prospectorUrl }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState(currentSubject);
  const [bodyHtml, setBodyHtml] = useState(currentBodyHtml);

  async function handleSave() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailSubject: subject, emailBodyHtml: bodyHtml }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? 'Failed to update campaign');
        return;
      }
      router.refresh();
      setOpen(false);
    } catch {
      setError('Network error — is the prospector service running?');
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500 transition-colors";
  const labelCls = "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-white/5 border border-white/10 text-slate-400 text-xs font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors"
      >
        Edit Email
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-base font-semibold text-white">Edit Campaign Email</h2>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors text-lg leading-none">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className={labelCls}>
                  Subject <span className="text-slate-600 normal-case font-normal tracking-normal">— &#123;&#123;businessName&#125;&#125;</span>
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>
                  Email Body HTML <span className="text-slate-600 normal-case font-normal tracking-normal">— &#123;&#123;businessName&#125;&#125;, &#123;&#123;city&#125;&#125;, &#123;&#123;calLink&#125;&#125;, &#123;&#123;replyEmail&#125;&#125;</span>
                </label>
                <textarea
                  rows={14}
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  className={inputCls + ' font-mono resize-y text-xs'}
                />
              </div>

              {bodyHtml && (
                <div>
                  <label className={labelCls}>Preview</label>
                  <div className="bg-white rounded-lg overflow-hidden border border-white/10">
                    <iframe
                      srcDoc={bodyHtml
                        .replace(/\{\{businessName\}\}/g, 'Acme Restaurant')
                        .replace(/\{\{city\}\}/g, 'New York')
                        .replace(/\{\{calLink\}\}/g, 'https://cal.com/jason')
                        .replace(/\{\{replyEmail\}\}/g, 'jason@embedo.io')}
                      className="w-full border-0"
                      style={{ height: '280px' }}
                      title="Email preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}

              {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-white/10">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-5 py-2 bg-white/5 text-slate-400 text-sm font-medium rounded-lg hover:bg-white/10 hover:text-white transition-colors border border-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
