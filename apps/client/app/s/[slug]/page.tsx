'use client';

import { useState, useEffect, use } from 'react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

interface Question {
  id: string;
  type: 'rating' | 'text' | 'multiple_choice' | 'yes_no';
  label: string;
  options?: string[];
  required: boolean;
}

interface SurveyData {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
}

export default function PublicSurveyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/surveys/public/${slug}`)
      .then((r) => r.json())
      .then((data: { success: boolean; survey?: SurveyData; error?: string }) => {
        if (!data.success || !data.survey) setError(data.error ?? 'Survey not found');
        else setSurvey(data.survey);
      })
      .catch(() => setError('Failed to load survey'))
      .finally(() => setLoading(false));
  }, [slug]);

  function setAnswer(id: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!survey) return;
    setSubmitting(true);
    await fetch(`${API_URL}/surveys/${survey.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, name, email, phone }),
    });
    setDone(true);
    setSubmitting(false);
  }

  const inputClass = 'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 bg-white';

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-600/20">
            <svg viewBox="0 0 32 32" fill="none" className="w-7 h-7">
              <polygon points="16,4 28,10 16,16 4,10" fill="#fff" fillOpacity="0.9" />
              <polygon points="4,10 16,16 16,28 4,22" fill="#fff" fillOpacity="0.5" />
              <polygon points="28,10 16,16 16,28 28,22" fill="#fff" fillOpacity="0.7" />
            </svg>
          </div>
        </div>
        {children}
        <p className="text-center text-[10px] text-slate-300 mt-10">Powered by Embedo</p>
      </div>
    </div>
  );

  if (loading) return <Wrapper><div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" /></div></Wrapper>;
  if (error) return <Wrapper><div className="text-center py-12 text-slate-500">{error}</div></Wrapper>;
  if (!survey) return null;

  if (done) return (
    <Wrapper>
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-emerald-500"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Thanks for your feedback!</h2>
        <p className="text-sm text-slate-400 mt-2">Your response has been recorded.</p>
      </div>
    </Wrapper>
  );

  return (
    <Wrapper>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{survey.title}</h2>
          {survey.description && <p className="text-sm text-slate-500 mt-1">{survey.description}</p>}
        </div>

        {survey.questions.map((q) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {q.label} {q.required && <span className="text-red-400">*</span>}
            </label>

            {q.type === 'rating' && (
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setAnswer(q.id, star)} className={`text-2xl transition-transform active:scale-110 ${Number(answers[q.id]) >= star ? 'text-amber-400' : 'text-slate-200'}`}>★</button>
                ))}
              </div>
            )}

            {q.type === 'text' && (
              <textarea value={(answers[q.id] as string) ?? ''} onChange={(e) => setAnswer(q.id, e.target.value)} rows={3} required={q.required} className={`${inputClass} resize-none`} placeholder="Your answer..." />
            )}

            {q.type === 'multiple_choice' && (
              <div className="space-y-2">
                {(q.options ?? []).map((opt) => (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-violet-50/50 transition-colors">
                    <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} className="text-violet-600" required={q.required} />
                    <span className="text-sm text-slate-700">{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'yes_no' && (
              <div className="flex gap-3">
                {['Yes', 'No'].map((opt) => (
                  <button key={opt} type="button" onClick={() => setAnswer(q.id, opt)} className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${answers[q.id] === opt ? 'border-violet-300 bg-violet-600 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{opt}</button>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="border-t border-slate-100 pt-5 space-y-3">
          <p className="text-xs font-medium text-slate-500">Your info (optional)</p>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" className={inputClass} />
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className={inputClass} />
        </div>

        <button type="submit" disabled={submitting} className="w-full py-3.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-500 disabled:opacity-50 transition-colors shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2">
          {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>
    </Wrapper>
  );
}
