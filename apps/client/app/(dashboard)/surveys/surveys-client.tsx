'use client';

import { useState, useEffect, useCallback } from 'react';
import KpiCard from '../../../components/ui/kpi-card';
import { useBusiness } from '../../../components/auth/business-provider';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface SurveyQuestion {
  id: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'yes_no';
  label: string;
  options?: string[];
  required: boolean;
}

interface Survey {
  id: string;
  title: string;
  slug: string;
  description: string;
  questions: SurveyQuestion[];
  active: boolean;
  createdAt: string;
  responseCount: number;
}

const QUESTION_TYPES = [
  { value: 'rating', label: 'Star Rating', icon: '★' },
  { value: 'text', label: 'Free Text', icon: '✎' },
  { value: 'multiple_choice', label: 'Multiple Choice', icon: '☰' },
  { value: 'yes_no', label: 'Yes / No', icon: '✓' },
] as const;

/* ── Question Builder ───────────────────────────────────────────── */
function QuestionRow({ question, onChange, onRemove }: {
  question: SurveyQuestion;
  onChange: (q: SurveyQuestion) => void;
  onRemove: () => void;
}) {
  const [newOption, setNewOption] = useState('');

  function addOption() {
    if (!newOption.trim()) return;
    onChange({ ...question, options: [...(question.options ?? []), newOption.trim()] });
    setNewOption('');
  }

  function removeOption(idx: number) {
    onChange({ ...question, options: (question.options ?? []).filter((_, i) => i !== idx) });
  }

  return (
    <div className="border border-slate-200 dark:border-white/[0.08] rounded-lg p-4 bg-slate-50/50 dark:bg-white/[0.06]">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {QUESTION_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => onChange({ ...question, type: t.value, options: t.value === 'multiple_choice' ? question.options ?? [] : undefined })}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  question.type === t.value ? 'bg-violet-600 text-white' : 'bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                }`}
              >
                <span className="mr-1">{t.icon}</span> {t.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={question.label}
            onChange={(e) => onChange({ ...question, label: e.target.value })}
            placeholder="Enter your question..."
            className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white bg-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 dark:focus:border-violet-500/40"
          />
          {question.type === 'multiple_choice' && (
            <div className="space-y-2">
              {(question.options ?? []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-slate-300 dark:border-slate-500 flex-shrink-0" />
                  <span className="text-sm text-slate-700 dark:text-slate-200 flex-1">{opt}</span>
                  <button onClick={() => removeOption(i)} className="text-xs text-slate-400 dark:text-slate-400 hover:text-red-500">remove</button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                  placeholder="Add an option..."
                  className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-white/[0.08] rounded-lg text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                <button onClick={addOption} disabled={!newOption.trim()} className="px-3 py-1.5 text-xs font-medium text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg disabled:opacity-50">Add</button>
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={question.required} onChange={(e) => onChange({ ...question, required: e.target.checked })} className="rounded border-slate-300 dark:border-white/[0.08] text-violet-600 focus:ring-violet-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400">Required</span>
          </label>
        </div>
        <button onClick={onRemove} className="p-1.5 text-slate-400 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
        </button>
      </div>
    </div>
  );
}

/* ── Create Survey Modal ────────────────────────────────────────── */
function CreateSurveyModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (questions: SurveyQuestion[], title: string, description: string) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<SurveyQuestion[]>([
    { id: `q_${Date.now()}`, type: 'rating', label: 'How was your overall experience?', required: true },
  ]);
  const [saving, setSaving] = useState(false);

  function addQuestion() {
    setQuestions([...questions, { id: `q_${Date.now()}_${questions.length}`, type: 'text', label: '', required: false }]);
  }

  async function handleCreate() {
    if (!title.trim() || questions.filter((q) => q.label.trim()).length === 0) return;
    setSaving(true);
    await onCreate(questions.filter((q) => q.label.trim()), title.trim(), description.trim());
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-[#1a1730] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Create Survey</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Survey Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Post-Visit Feedback" className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 dark:focus:border-violet-500/40" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description (optional)</label>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A brief description shown to customers" className="w-full px-3 py-2 border border-slate-200 dark:border-white/[0.08] rounded-lg text-sm text-slate-800 dark:text-white dark:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 dark:focus:border-violet-500/40" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Questions</label>
              <span className="text-[10px] text-slate-400 dark:text-slate-400">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-3">
              {questions.map((q, i) => (
                <QuestionRow key={q.id} question={q} onChange={(updated) => { const u = [...questions]; u[i] = updated; setQuestions(u); }} onRemove={() => setQuestions(questions.filter((_, j) => j !== i))} />
              ))}
            </div>
            <button onClick={addQuestion} className="mt-3 w-full py-2.5 border-2 border-dashed border-slate-200 dark:border-white/[0.08] rounded-lg text-xs font-medium text-slate-400 dark:text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-colors">
              + Add Question
            </button>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 dark:border-white/[0.08] flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !title.trim() || questions.filter((q) => q.label.trim()).length === 0} className="px-5 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 disabled:opacity-50 transition-colors flex items-center gap-2">
            {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? 'Creating...' : 'Create Survey'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function SurveysTab() {
  const { business, loading: bizLoading } = useBusiness();
  const [showCreate, setShowCreate] = useState(false);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSurveys = useCallback(async () => {
    if (!business?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/surveys?businessId=${business.id}`);
      const data = await res.json() as { success: boolean; surveys: Survey[] };
      if (data.success) setSurveys(data.surveys);
    } finally {
      setLoading(false);
    }
  }, [business?.id]);

  useEffect(() => { fetchSurveys(); }, [fetchSurveys]);

  async function handleCreate(questions: SurveyQuestion[], title: string, description: string) {
    if (!business?.id) return;
    const res = await fetch(`${API_URL}/surveys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId: business.id, title, description, questions }),
    });
    const data = await res.json() as { success: boolean; survey: Survey };
    if (data.success) {
      setSurveys([data.survey, ...surveys]);
      setShowCreate(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    const res = await fetch(`${API_URL}/surveys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    });
    const data = await res.json() as { success: boolean; survey: Survey };
    if (data.success) setSurveys(surveys.map((s) => s.id === id ? data.survey : s));
  }

  async function handleDelete(id: string) {
    await fetch(`${API_URL}/surveys/${id}`, { method: 'DELETE' });
    setSurveys(surveys.filter((s) => s.id !== id));
  }

  if (bizLoading) return <div className="p-8 flex items-center justify-center min-h-[400px]"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div>;
  if (!business) return null;

  const activeSurveys = surveys.filter((s) => s.active).length;
  const totalResponses = surveys.reduce((sum, s) => sum + s.responseCount, 0);
  const surveyUrl = (slug: string) => `${typeof window !== 'undefined' ? window.location.origin : 'https://app.embedo.io'}/s/${slug}`;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Manage your customer feedback surveys</p>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors">
          Create Survey
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Active Surveys" value={activeSurveys} color="violet" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Total Responses" value={totalResponses} color="sky" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Response Rate" value="--" color="emerald" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>} />
        <KpiCard label="Avg Satisfaction" value="--" color="amber" icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>} />
      </div>

      <div className="bg-white dark:bg-white/[0.04] dark:backdrop-blur-sm border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your Surveys</h2>
          {surveys.length > 0 && <span className="text-xs text-slate-400 dark:text-slate-400">{surveys.length} total</span>}
        </div>

        {loading ? (
          <div className="px-5 py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-violet-500"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
            </div>
            <p className="text-sm text-slate-400 dark:text-slate-400 mb-1">No surveys created yet</p>
            <p className="text-xs text-slate-300 dark:text-slate-600">Create a survey to start collecting customer feedback after visits and appointments</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-white/[0.04]">
            {surveys.map((s) => (
              <div key={s.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.04] transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{s.title}</p>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${s.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' : 'bg-slate-100 text-slate-400 dark:bg-white/[0.06] dark:text-slate-400'}`}>
                      {s.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  {s.description && <p className="text-xs text-slate-400 dark:text-slate-400 truncate mt-0.5">{s.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-400">{s.questions.length} question{s.questions.length !== 1 ? 's' : ''}</span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">|</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400">{s.responseCount} response{s.responseCount !== 1 ? 's' : ''}</span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">|</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400">{new Date(s.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  </div>
                  {/* Survey link */}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-mono truncate max-w-[220px]">{surveyUrl(s.slug)}</span>
                    <button
                      onClick={() => navigator.clipboard.writeText(surveyUrl(s.slug))}
                      className="text-[10px] text-violet-500 hover:text-violet-700 transition-colors flex-shrink-0"
                    >
                      Copy link
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => handleToggle(s.id, !s.active)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${s.active ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'}`}>
                    {s.active ? 'Pause' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="px-3 py-1.5 text-xs font-medium text-slate-400 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && <CreateSurveyModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </div>
  );
}
