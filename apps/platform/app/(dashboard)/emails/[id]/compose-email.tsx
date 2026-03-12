'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function ComposeEmail({ prospectId, prospectName, prospectEmail, prospectorUrl }: {
  prospectId: string;
  prospectName: string;
  prospectEmail: string;
  prospectorUrl: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;

    setSending(true);
    setResult(null);

    try {
      // Wrap the plain text body in basic HTML
      const htmlBody = body
        .split('\n')
        .map((line) => (line.trim() === '' ? '<br>' : `<p style="margin:0 0 8px 0;font-family:sans-serif;font-size:14px;color:#333;">${line}</p>`))
        .join('\n');

      const res = await fetch(`${prospectorUrl}/prospects/${prospectId}/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, bodyHtml: htmlBody }),
      });

      if (res.ok) {
        setResult({ ok: true, message: 'Email sent successfully' });
        setSubject('');
        setBody('');
        setTimeout(() => {
          setResult(null);
          setExpanded(false);
          router.refresh();
        }, 2000);
      } else {
        const data = await res.json();
        setResult({ ok: false, message: data.error ?? 'Failed to send' });
      }
    } catch {
      setResult({ ok: false, message: 'Network error — check if services are running' });
    } finally {
      setSending(false);
    }
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
        Compose Email to {prospectName}
      </button>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-violet-500/30 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-violet-600/10">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400">
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
          New Email
        </h3>
        <button onClick={() => setExpanded(false)} className="text-slate-500 hover:text-white transition-colors">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSend} className="p-4 space-y-3">
        {/* To */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium w-12">To:</span>
          <span className="text-slate-300 font-mono">{prospectEmail}</span>
        </div>

        {/* Subject */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium w-12">Subject:</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject..."
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
            required
          />
        </div>

        {/* Body */}
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your message here..."
          rows={8}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y"
          required
        />

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-600">
            Sent from jason@embedo.io via SendGrid. Open tracking enabled.
          </p>
          <div className="flex items-center gap-2">
            {result && (
              <span className={`text-xs font-medium ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.message}
              </span>
            )}
            <button
              type="submit"
              disabled={sending || !subject.trim() || !body.trim()}
              className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
