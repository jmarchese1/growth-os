'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, FileText } from 'lucide-react';
import { SectionHeader, HeroMetric, MetricBlock, Button } from '../../../components/ui/primitives';

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

  const totalSent = templates.reduce((a, t) => a + t.timesSent, 0);
  const avgOpen = templates.length > 0 ? Math.round(templates.reduce((a, t) => a + t.openRate, 0) / templates.length) : 0;
  const avgReply = templates.length > 0 ? Math.round(templates.reduce((a, t) => a + t.replyRate, 0) / templates.length) : 0;

  return (
    <div className="pt-10 pb-24 px-8 max-w-[1400px] mx-auto space-y-14">
      {/* Masthead */}
      <section className="pb-10 hairline-b">
        <div className="flex items-center gap-4 mb-3">
          <span className="font-mono text-[10px] tracking-mega text-paper-4 uppercase">Chapter 06 · Copy</span>
          <span className="h-px w-16 bg-rule" />
          <span className="font-mono text-[10px] tracking-mega text-paper-3 uppercase">
            {templates.length} on file
          </span>
        </div>
        <div className="flex items-end justify-between gap-8">
          <h1 className="font-display italic font-light text-paper leading-[0.95] tracking-tight text-[64px] lg:text-[76px] max-w-3xl">
            Email templates.
          </h1>
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="w-3 h-3" />
            <span>New template</span>
          </Button>
        </div>
        <p className="font-ui text-paper-2 text-[15px] mt-5 max-w-xl leading-relaxed">
          Save, A/B, and track the performance of every cold email version you deploy.
        </p>
      </section>

      {/* Summary */}
      {templates.length > 0 && (
        <section className="grid grid-cols-12 gap-8">
          <div className="col-span-12 lg:col-span-5">
            <HeroMetric label="Deployed across" value={totalSent.toLocaleString()} unit="sends" caption={`Across ${templates.length} template versions`} size="md" />
          </div>
          <div className="col-span-12 lg:col-span-7 panel">
            <div className="grid grid-cols-3">
              <MetricBlock label="Templates" value={templates.length} delta={`${templates.filter(t => t.active).length} active`} />
              <MetricBlock label="Avg open" value={`${avgOpen}%`} trend={avgOpen > 15 ? 'up' : 'flat'} />
              <MetricBlock label="Avg reply" value={`${avgReply}%`} trend={avgReply > 2 ? 'up' : 'flat'} />
            </div>
          </div>
        </section>
      )}

      <section>
        <SectionHeader numeral="1" title="The library" subtitle={`${templates.length} email template variants`} />

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="panel p-16 text-center">
              <p className="font-mono text-[11px] tracking-micro uppercase text-paper-4">Loading…</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="panel p-20 text-center">
              <FileText className="w-8 h-8 text-paper-4 mx-auto mb-4" />
              <p className="font-display italic text-paper-3 text-2xl font-light">No templates yet.</p>
              <button onClick={() => setCreating(true)} className="font-mono text-[11px] tracking-micro uppercase text-signal hover:underline mt-4 inline-block">
                Compose the first template →
              </button>
            </div>
          ) : (
            templates.map((t, idx) => (
              <article key={t.id} className={`panel p-6 hover:border-paper-4 transition-colors ${!t.active ? 'opacity-40' : ''}`}>
                <div className="grid grid-cols-12 gap-6">
                  {/* LEFT — name + subject + body */}
                  <div className="col-span-12 lg:col-span-8">
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-[10px] tracking-mega text-paper-4 pt-1.5 shrink-0">
                        №{(idx + 1).toString().padStart(3, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className={`font-mono text-[9px] tracking-mega uppercase ${
                            t.category === 'cold' ? 'text-signal' : t.category === 'followup' ? 'text-amber' : 'text-paper-3'
                          }`}>
                            {t.category}
                          </span>
                          {!t.active && <span className="font-mono text-[9px] tracking-mega uppercase text-ember">Inactive</span>}
                        </div>
                        <h3 className="font-display italic text-paper text-[26px] font-light leading-tight">{t.name}</h3>
                        <p className="label-sm mt-3 mb-1">Subject</p>
                        <p className="font-ui text-sm text-paper-2">{t.subject}</p>
                        <p className="label-sm mt-3 mb-1">Body</p>
                        <p className="font-ui text-[12px] text-paper-3 leading-relaxed italic line-clamp-3">
                          "{t.body.slice(0, 260)}{t.body.length > 260 ? '…' : ''}"
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT — performance */}
                  <div className="col-span-12 lg:col-span-4 grid grid-cols-3 gap-0 hairline border-t border-b content-start">
                    <NumCell label="Sent" value={t.timesSent.toLocaleString()} />
                    <NumCell label="Open" value={`${t.openRate}%`} accent={t.openRate > 20} />
                    <NumCell label="Reply" value={`${t.replyRate}%`} accent={t.replyRate > 3} />
                  </div>
                </div>

                <div className="mt-5 hairline-t pt-4 flex items-center gap-2">
                  <Button size="sm" onClick={() => setEditing(t)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(t.id)}>Duplicate</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)}>Archive</Button>
                  <span className="ml-auto font-mono text-[9px] tracking-micro text-paper-4 uppercase">
                    Created {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

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

function NumCell({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-3 py-3 hairline-r last:border-r-0">
      <p className="label-sm">{label}</p>
      <p className={`font-display italic font-light text-2xl nums leading-none mt-1 ${accent ? 'text-signal' : 'text-paper'}`}>{value}</p>
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-0/80" onClick={onClose} />
      <div className="relative panel-2 w-full max-w-3xl max-h-[90vh] flex flex-col">
        <header className="flex items-center justify-between px-6 py-4 hairline-b shrink-0">
          <span className="font-mono text-[11px] tracking-mega uppercase text-paper-2">
            {template ? 'Edit template' : 'New template'}
          </span>
          <button onClick={onClose} className="text-paper-4 hover:text-paper transition"><X className="w-4 h-4" /></button>
        </header>

        {/* Tabs */}
        <div className="flex px-6 pt-4 shrink-0 gap-4 hairline-b">
          {(['edit', 'preview'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 font-mono text-[11px] tracking-mega uppercase transition-colors relative ${
                tab === t ? 'text-signal' : 'text-paper-4 hover:text-paper'
              }`}
            >
              {t}
              {tab === t && <span className="absolute left-0 right-0 -bottom-px h-px bg-signal" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === 'edit' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-sm block mb-2">Template Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="input w-full" placeholder="Genuine Intro v1" />
                </div>
                <div>
                  <label className="label-sm block mb-2">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-full appearance-none">
                    <option value="cold">Cold Email</option>
                    <option value="followup">Follow-up</option>
                    <option value="breakup">Break-up</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-sm block mb-2">Subject</label>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input w-full" />
              </div>
              <div>
                <label className="label-sm block mb-2">Body</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {VARS.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setBody(body + v.key)}
                      className="px-2 py-1 font-mono text-[9px] tracking-micro uppercase text-signal hairline hover:bg-signal-soft transition-colors"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                <textarea
                  rows={12}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="input w-full resize-y leading-relaxed font-mono text-[12px]"
                  placeholder="Hey {{firstName}},&#10;&#10;Write your email here..."
                />
              </div>
            </>
          ) : (
            <div>
              <div className="panel-2 px-4 py-3 mb-4">
                <span className="label-sm block mb-1">Subject</span>
                <span className="font-ui text-sm text-paper">{applyVars(subject)}</span>
              </div>
              <div className="bg-paper rounded overflow-hidden">
                <div
                  className="p-6"
                  style={{ fontFamily: '-apple-system, system-ui, sans-serif', fontSize: '14px', lineHeight: '1.7', color: '#222' }}
                  dangerouslySetInnerHTML={{
                    __html: applyVars(body)
                      .replace(/\n\n/g, '</p><p style="margin:0 0 16px">')
                      .replace(/\n/g, '<br/>')
                      .replace(/^/, '<p style="margin:0 0 16px">')
                      .replace(/$/, '</p>'),
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <footer className="flex gap-3 px-6 py-4 hairline-t shrink-0">
          <Button variant="primary" onClick={() => onSave({ name, subject, body, category })} disabled={!name || !subject || !body}>
            {template ? 'Save changes' : 'Create template'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </footer>
      </div>
    </div>
  );
}
