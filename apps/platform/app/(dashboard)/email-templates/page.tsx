'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? process.env['API_BASE_URL'] ?? 'https://embedoapi-production.up.railway.app';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
  active: boolean;
  timesSent: number;
  timesOpened: number;
  timesReplied: number;
  openRate: number;
  replyRate: number;
  createdAt: string;
}

const PREVIEW_VARS: Record<string, string> = {
  '{{firstName}}': 'Michael',
  '{{lastName}}': 'Chen',
  '{{company}}': 'Golden Dragon Kitchen',
  '{{shortName}}': 'Golden Dragon',
  '{{businessName}}': 'Golden Dragon Kitchen',
  '{{city}}': 'New York',
  '{{calLink}}': 'https://cal.com/jason-marchese-mkfkwl/30min',
};

function applyVars(text: string): string {
  return Object.entries(PREVIEW_VARS).reduce((s, [k, v]) => s.replaceAll(k, v), text);
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/email-templates`);
      if (res.ok) setTemplates(await res.json());
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  async function handleSave(data: { name: string; subject: string; body: string; category: string }, id?: string) {
    const url = id ? `${API_URL}/email-templates/${id}` : `${API_URL}/email-templates`;
    const method = id ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (res.ok) { setEditing(null); setCreating(false); await fetchTemplates(); }
  }

  async function handleDuplicate(id: string) {
    await fetch(`${API_URL}/email-templates/${id}/duplicate`, { method: 'POST' });
    await fetchTemplates();
  }

  async function handleDelete(id: string) {
    await fetch(`${API_URL}/email-templates/${id}`, { method: 'DELETE' });
    await fetchTemplates();
  }

  return (
    <div className="p-8 animate-fade-up">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Email Templates</h1>
          <p className="text-sm text-slate-400 mt-1">Save, compare, and track performance of different email copy.</p>
        </div>
        <button onClick={() => setCreating(true)} className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors">
          + New Template
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-7 h-7 text-slate-500"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
          </div>
          <h3 className="text-sm font-semibold text-white mb-1">No templates yet</h3>
          <p className="text-xs text-slate-500 mb-4">Create your first email template to start tracking performance.</p>
          <button onClick={() => setCreating(true)} className="px-4 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors">
            Create Template
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <div key={t.id} className={`bg-white/[0.03] border rounded-2xl p-5 glow-card ${t.active ? 'border-white/[0.08]' : 'border-white/[0.04] opacity-50'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{t.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      t.category === 'cold' ? 'bg-violet-500/10 text-violet-400' :
                      t.category === 'followup' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-slate-500/10 text-slate-400'
                    }`}>{t.category}</span>
                    {!t.active && <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-400">Inactive</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">Subject: {t.subject}</p>
                </div>

                {/* Performance metrics */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-white tabular-nums">{t.timesSent}</p>
                    <p className="text-[9px] text-slate-600 uppercase">Sent</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold tabular-nums ${t.openRate > 30 ? 'text-emerald-400' : t.openRate > 15 ? 'text-amber-400' : 'text-slate-400'}`}>{t.openRate}%</p>
                    <p className="text-[9px] text-slate-600 uppercase">Opens</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-lg font-bold tabular-nums ${t.replyRate > 5 ? 'text-emerald-400' : t.replyRate > 2 ? 'text-amber-400' : 'text-slate-400'}`}>{t.replyRate}%</p>
                    <p className="text-[9px] text-slate-600 uppercase">Replies</p>
                  </div>
                </div>
              </div>

              {/* Body preview */}
              <div className="bg-white/[0.02] rounded-lg p-3 mb-3 max-h-32 overflow-y-auto">
                <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">{t.body.slice(0, 300)}{t.body.length > 300 ? '...' : ''}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button onClick={() => setEditing(t)} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
                  Edit
                </button>
                <button onClick={() => handleDuplicate(t.id)} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors">
                  Duplicate
                </button>
                <button onClick={() => handleDelete(t.id)} className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 transition-colors">
                  Archive
                </button>
                <span className="ml-auto text-[10px] text-slate-600">Created {new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {mounted && (creating || editing) && createPortal(
        <TemplateEditor
          template={editing}
          onSave={(data) => handleSave(data, editing?.id)}
          onClose={() => { setEditing(null); setCreating(false); }}
        />,
        document.body,
      )}
    </div>
  );
}

function TemplateEditor({ template, onSave, onClose }: {
  template: EmailTemplate | null;
  onSave: (data: { name: string; subject: string; body: string; category: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [subject, setSubject] = useState(template?.subject ?? 'quick question about {{shortName}}');
  const [body, setBody] = useState(template?.body ?? '');
  const [category, setCategory] = useState(template?.category ?? 'cold');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');

  const VARS = [
    { key: '{{firstName}}', label: 'First Name' },
    { key: '{{shortName}}', label: 'Short Name' },
    { key: '{{company}}', label: 'Company' },
    { key: '{{city}}', label: 'City' },
    { key: '{{calLink}}', label: 'Cal Link' },
  ];

  const inputCls = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#0f1117] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 flex-shrink-0">
          <h2 className="text-base font-semibold text-white">{template ? 'Edit Template' : 'New Template'}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 flex-shrink-0">
          {(['edit', 'preview'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                tab === t ? 'text-white border-violet-500 bg-white/5' : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}>
              {t === 'edit' ? 'Edit' : 'Preview'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 border-t border-white/10">
          {tab === 'edit' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Template Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Genuine Intro v1" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}
                    className={`${inputCls} bg-[#12101f] appearance-none`}>
                    <option value="cold">Cold Email</option>
                    <option value="followup">Follow-up</option>
                    <option value="breakup">Break-up</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Body</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {VARS.map((v) => (
                    <button key={v.key} type="button" onClick={() => setBody(body + v.key)}
                      className="px-2 py-1 text-[10px] font-semibold rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 transition-colors">
                      {v.label}
                    </button>
                  ))}
                </div>
                <textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)}
                  className={`${inputCls} resize-y leading-relaxed`}
                  placeholder="Hey {{firstName}},&#10;&#10;Write your email here..." />
              </div>
            </>
          ) : (
            <div>
              <div className="bg-white/[0.03] rounded-lg px-3 py-2 mb-3 border border-white/[0.06]">
                <span className="text-[9px] text-slate-600 uppercase tracking-wider">Subject: </span>
                <span className="text-sm text-white">{applyVars(subject)}</span>
              </div>
              <div className="bg-white rounded-xl overflow-hidden border border-white/10">
                <div className="p-5" style={{ fontFamily: '-apple-system, system-ui, sans-serif', fontSize: '14px', lineHeight: '1.7', color: '#222', maxWidth: 580 }}
                  dangerouslySetInnerHTML={{ __html: applyVars(body).replace(/\n\n/g, '</p><p style="margin:0 0 16px">').replace(/\n/g, '<br/>').replace(/^/, '<p style="margin:0 0 16px">').replace(/$/, '</p>') }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-white/10 flex-shrink-0">
          <button onClick={() => onSave({ name, subject, body, category })} disabled={!name || !subject || !body}
            className="px-5 py-2 bg-violet-600 text-white text-sm font-semibold rounded-lg hover:bg-violet-500 transition-colors disabled:opacity-50">
            {template ? 'Save Changes' : 'Create Template'}
          </button>
          <button onClick={onClose} className="px-5 py-2 bg-white/5 text-slate-400 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors border border-white/10">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
