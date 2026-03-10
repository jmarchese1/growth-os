'use client';

import { useState } from 'react';

interface Props {
  subject: string | null;
  bodyHtml: string | null;
  label?: string;
}

/** Strip tracking pixels so previewing doesn't fire an open event */
function stripPixels(html: string): string {
  return html.replace(/<img[^>]*\/track\/open\/[^>]*\/?>/gi, '');
}

export function EmailPreviewModal({ subject, bodyHtml, label = 'View Email' }: Props) {
  const [open, setOpen] = useState(false);

  if (!bodyHtml) return null;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="text-[10px] px-2 py-1 rounded-md bg-white/5 border border-white/10 text-slate-500 hover:text-violet-400 hover:border-violet-500/30 transition-colors whitespace-nowrap"
      >
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative z-10 w-full max-w-2xl bg-[#0f0c1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div>
                <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-0.5">Email Preview</p>
                <p className="text-sm font-semibold text-white truncate max-w-[480px]">
                  {subject ?? '(no subject)'}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-600 hover:text-white transition-colors ml-4 flex-shrink-0"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                </svg>
              </button>
            </div>

            {/* Email body in iframe */}
            <div className="bg-white">
              <iframe
                srcDoc={stripPixels(bodyHtml)}
                className="w-full border-0"
                style={{ height: '480px' }}
                title="Email preview"
                sandbox="allow-same-origin"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
