'use client';

import { useState } from 'react';

interface Props {
  /** The campaign's email subject template */
  subjectTemplate: string;
  /** The campaign's email body template (step 1 or campaign default) */
  bodyTemplate: string;
  /** Prospect data to fill variables */
  prospect: {
    name: string;
    contactFirstName: string | null;
    contactLastName: string | null;
    email: string | null;
    address: { city?: string; state?: string } | null;
  };
  /** Cal link for {{calLink}} variable */
  calLink?: string;
}

function fillVariables(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

export function ColdEmailPreview({ subjectTemplate, bodyTemplate, prospect, calLink = 'https://cal.com/jason-marchese-mkfkwl/30min' }: Props) {
  const [open, setOpen] = useState(false);

  const vars: Record<string, string> = {
    '{{firstName}}': prospect.contactFirstName || 'there',
    '{{lastName}}': prospect.contactLastName || '',
    '{{company}}': prospect.name,
    '{{city}}': prospect.address?.city || '',
    '{{calLink}}': calLink,
    '{{businessName}}': prospect.name,
  };

  const subject = fillVariables(subjectTemplate, vars);
  const body = fillVariables(bodyTemplate, vars);

  // Wrap plain text in basic HTML for preview
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 1.7; color: #1a1a1a; max-width: 600px; padding: 20px;">
      ${body.includes('<') ? body : body.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>').replace(/^/, '<p>').replace(/$/, '</p>')}
    </div>
  `;

  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="text-[10px] px-2 py-1 rounded-md bg-signal-soft border border-rule text-signal hover:text-signal hover:border-signal transition-colors whitespace-nowrap"
      >
        Preview
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-2xl bg-[#0f0c1e] border border-rule rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold text-signal uppercase tracking-widest">Cold Email Preview</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-signal-soft text-signal font-medium">Step 1</span>
                </div>
                <p className="text-sm font-semibold text-white truncate max-w-[480px]">{subject}</p>
                <p className="text-[10px] text-paper-4 mt-0.5">To: {prospect.email ?? 'no email'} · {prospect.name}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-paper-4 hover:text-white transition-colors ml-4 flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                </svg>
              </button>
            </div>
            <div className="bg-white">
              <iframe
                srcDoc={htmlBody}
                className="w-full border-0"
                style={{ height: '400px' }}
                title="Cold email preview"
                sandbox="allow-same-origin"
              />
            </div>
            <div className="px-5 py-3 border-t border-white/[0.07] bg-ink-1">
              <p className="text-[10px] text-paper-4">Variables filled from prospect data. Signature + unsubscribe added automatically at send time.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
