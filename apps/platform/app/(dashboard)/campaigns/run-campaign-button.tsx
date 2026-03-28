'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type State = 'idle' | 'running' | 'done' | 'error';

interface Props {
  campaignId: string;
  prospectorUrl: string;
  initialTotal?: number;
}

const LOADING_MESSAGES = [
  'Scanning Apollo for businesses...',
  'Matching industries and locations...',
  'Finding decision makers...',
  'Enriching contact emails...',
  'Cross-referencing duplicates...',
  'Scraping websites for info...',
  'Scoring website quality...',
  'Verifying email addresses...',
  'Building prospect profiles...',
  'Extracting phone numbers...',
  'Checking LinkedIn profiles...',
  'Analyzing business data...',
  'Running deduplication checks...',
  'Mapping social media presence...',
  'Compiling results...',
  'Almost there...',
];

function EmbedoCube({ size = 48 }: { size?: number }) {
  const s = size;
  const half = s / 2;
  return (
    <div className="embedo-cube-wrapper" style={{ width: s, height: s, perspective: s * 4 }}>
      <div className="embedo-cube-inner" style={{ width: s, height: s, transformStyle: 'preserve-3d', animation: 'embedo-cube-spin 2.2s linear infinite' }}>
        {/* Front */}
        <div style={{ position: 'absolute', width: s, height: s, background: 'rgba(124,58,237,0.85)', border: '1px solid rgba(196,181,253,0.2)', transform: `translateZ(${half}px)` }} />
        {/* Back */}
        <div style={{ position: 'absolute', width: s, height: s, background: 'rgba(99,58,237,0.6)', border: '1px solid rgba(196,181,253,0.1)', transform: `rotateY(180deg) translateZ(${half}px)` }} />
        {/* Left */}
        <div style={{ position: 'absolute', width: s, height: s, background: 'rgba(109,40,217,0.75)', border: '1px solid rgba(196,181,253,0.15)', transform: `rotateY(-90deg) translateZ(${half}px)` }} />
        {/* Right */}
        <div style={{ position: 'absolute', width: s, height: s, background: 'rgba(139,92,246,0.7)', border: '1px solid rgba(196,181,253,0.15)', transform: `rotateY(90deg) translateZ(${half}px)` }} />
        {/* Top */}
        <div style={{ position: 'absolute', width: s, height: s, background: 'rgba(167,139,250,0.8)', border: '1px solid rgba(196,181,253,0.2)', transform: `rotateX(90deg) translateZ(${half}px)` }} />
        {/* Bottom */}
        <div style={{ position: 'absolute', width: s, height: s, background: 'rgba(76,29,149,0.7)', border: '1px solid rgba(196,181,253,0.1)', transform: `rotateX(-90deg) translateZ(${half}px)` }} />
      </div>
    </div>
  );
}

function playSuccessSound() {
  try {
    const ctx = new AudioContext();
    // Rising arpeggio
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + i * 0.12 + 0.5);
    });
    // Final shimmer
    const shimmer = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    shimmer.type = 'sine';
    shimmer.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.5); // G6
    shimmerGain.gain.setValueAtTime(0.08, ctx.currentTime + 0.5);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    shimmer.connect(shimmerGain);
    shimmerGain.connect(ctx.destination);
    shimmer.start(ctx.currentTime + 0.5);
    shimmer.stop(ctx.currentTime + 1.2);
  } catch { /* audio not available */ }
}

function SuccessOverlay({ total, onClose }: { total: number; onClose: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    playSuccessSound();
    requestAnimationFrame(() => setShow(true));
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}>
      <div className={`text-center transition-all duration-700 ${show ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
        {/* Success checkmark */}
        <div className="mx-auto w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mb-6" style={{ animation: 'success-pop 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-emerald-400" style={{ animation: 'success-draw 0.6s ease-out 0.3s both' }}>
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Campaign Ready</h2>
        <p className="text-lg text-emerald-400 font-semibold mb-1">{total} prospects discovered</p>
        <p className="text-sm text-slate-400 mb-8">Emails enriched and ready to send</p>

        {/* Particle burst effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                left: '50%',
                top: '45%',
                background: i % 3 === 0 ? '#34d399' : i % 3 === 1 ? '#7c3aed' : '#a78bfa',
                animation: `confetti-burst 1s cubic-bezier(0.16,1,0.3,1) ${i * 0.05}s both`,
                transform: `rotate(${i * 30}deg)`,
              }}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          className="px-6 py-3 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 transition-colors shadow-lg shadow-violet-600/30"
        >
          View Prospects
        </button>
      </div>
    </div>
  );
}

function LoadingOverlay({ total, message }: { total: number; message: string }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)' }}>
      {/* Ambient glow */}
      <div className="absolute w-[400px] h-[400px] rounded-full bg-violet-600/10 blur-[100px]" />

      <div className="relative text-center">
        {/* Rotating cube */}
        <div className="mx-auto mb-8 flex justify-center">
          <EmbedoCube size={56} />
        </div>

        {/* Status message */}
        <div className="h-8 flex items-center justify-center mb-3">
          <p
            key={message}
            className="text-base text-slate-200 font-medium"
            style={{ animation: 'fade-up-msg 0.5s ease both' }}
          >
            {message}
          </p>
        </div>

        {/* Live count */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <p className="text-sm text-violet-300 font-semibold tabular-nums">
            {total > 0 ? `${total} prospects found` : 'Searching...'}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-violet-400"
              style={{ animation: `pulse-dot 1.4s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function RunCampaignButton({ campaignId, prospectorUrl, initialTotal = 0 }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');
  const [liveTotal, setLiveTotal] = useState(initialTotal);
  const [msgIndex, setMsgIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevTotal = useRef(initialTotal);

  useEffect(() => { setMounted(true); }, []);

  const startPolling = useCallback(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}/stats`, { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { total: number };
          setLiveTotal(data.total);

          // If total stopped growing for 2 consecutive polls, mark done
          if (data.total > 0 && data.total === prevTotal.current) {
            stopPolling();
            setState('done');
          }
          prevTotal.current = data.total;
        }
      } catch { /* silent */ }
    }, 4000);

    // Rotate loading messages
    msgRef.current = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2800);
  }, [campaignId, prospectorUrl]);

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (msgRef.current) { clearInterval(msgRef.current); msgRef.current = null; }
  }

  useEffect(() => () => stopPolling(), []);

  async function run() {
    setState('running');
    setError('');
    setMsgIndex(0);
    prevTotal.current = initialTotal;
    startPolling();

    try {
      const res = await fetch(`${prospectorUrl}/campaigns/${campaignId}/run`, { method: 'POST' });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        stopPolling();
        setState('error');
        setError(data.error ?? 'Failed to start campaign');
        return;
      }

      // Max timeout: 120s then auto-complete
      setTimeout(() => {
        if (pollRef.current) {
          stopPolling();
          setState('done');
        }
      }, 120_000);
    } catch {
      stopPolling();
      setState('error');
      setError('Network error — is the prospector service running?');
    }
  }

  function handleDone() {
    setState('idle');
    router.refresh();
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 max-w-xs">
          {error}
        </p>
        <button
          onClick={() => setState('idle')}
          className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors w-fit"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={run}
        disabled={state !== 'idle'}
        className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-colors font-medium disabled:opacity-50"
      >
        Run
      </button>

      {mounted && state === 'running' && createPortal(
        <LoadingOverlay total={liveTotal} message={LOADING_MESSAGES[msgIndex] ?? 'Working...'} />,
        document.body,
      )}

      {mounted && state === 'done' && createPortal(
        <SuccessOverlay total={liveTotal} onClose={handleDone} />,
        document.body,
      )}
    </>
  );
}
