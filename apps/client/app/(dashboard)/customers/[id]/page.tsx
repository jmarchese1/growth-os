'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

type LeadSource = 'VOICE' | 'CHATBOT' | 'SURVEY' | 'SOCIAL' | 'WEBSITE' | 'MANUAL' | 'CALENDLY' | 'OUTBOUND' | 'QR_CODE';
type ContactStatus = 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'CHURNED';
type ActivityType = 'CALL' | 'CHAT' | 'EMAIL' | 'SMS' | 'APPOINTMENT' | 'SURVEY_RESPONSE' | 'NOTE' | 'LEAD_CREATED' | 'STATUS_CHANGE';
type QrPurpose = 'SURVEY' | 'DISCOUNT' | 'SPIN_WHEEL' | 'SIGNUP' | 'MENU' | 'REVIEW' | 'CUSTOM';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string | null;
  createdAt: string;
}

interface SurveyResponse {
  id: string;
  score: number | null;
  createdAt: string;
  survey: { id: string; title: string } | null;
}

interface QrScan {
  id: string;
  outcome: string | null;
  createdAt: string;
  qrCode: { id: string; label: string; purpose: QrPurpose } | null;
}

interface Appointment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface ChatSession {
  id: string;
  channel: string;
  leadCaptured: boolean;
  createdAt: string;
}

interface CallLog {
  id: string;
  direction: string;
  duration: number | null;
  intent: string;
  sentiment: string | null;
  summary: string | null;
  createdAt: string;
}

interface ContactDetail {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: LeadSource;
  status: ContactStatus;
  leadScore: number | null;
  tags: string[];
  notes: string | null;
  createdAt: string;
  activities: Activity[];
  surveyResponses: SurveyResponse[];
  qrScans: QrScan[];
  appointments: Appointment[];
  chatSessions: ChatSession[];
  callLogs: CallLog[];
}

const STATUS_CONFIG: Record<ContactStatus, { label: string; color: string }> = {
  CUSTOMER:  { label: 'Customer',  color: 'bg-emerald-100 text-emerald-700' },
  PROSPECT:  { label: 'Prospect',  color: 'bg-violet-100 text-violet-700' },
  LEAD:      { label: 'Lead',      color: 'bg-amber-100 text-amber-700' },
  CHURNED:   { label: 'Churned',   color: 'bg-slate-100 text-slate-500' },
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  VOICE: 'Voice Call', CHATBOT: 'Chatbot', SURVEY: 'Survey', SOCIAL: 'Social',
  WEBSITE: 'Website', MANUAL: 'Manual', CALENDLY: 'Cal.com', OUTBOUND: 'Outreach', QR_CODE: 'QR Code',
};

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  CALL: '📞', CHAT: '💬', EMAIL: '✉️', SMS: '📱', APPOINTMENT: '📅',
  SURVEY_RESPONSE: '📋', NOTE: '📝', LEAD_CREATED: '✨', STATUS_CHANGE: '🔄',
};

const QR_PURPOSE_LABELS: Record<QrPurpose, string> = {
  SURVEY: 'Survey', DISCOUNT: 'Discount', SPIN_WHEEL: 'Spin to Win',
  SIGNUP: 'Sign-up', MENU: 'Menu', REVIEW: 'Review', CUSTOM: 'Custom',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function fullName(c: Pick<ContactDetail, 'firstName' | 'lastName' | 'email'>) {
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ');
  return name || c.email || 'Unknown';
}

function initials(c: Pick<ContactDetail, 'firstName' | 'lastName' | 'email'>) {
  if (c.firstName) return (c.firstName[0] ?? '') + (c.lastName?.[0] ?? '');
  return (c.email?.[0] ?? '?').toUpperCase();
}

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // We need businessId in the URL — extract from the contact itself after load
  // Route: GET /businesses/:businessId/contacts/:contactId
  // We don't have businessId here, so use a lightweight proxy approach:
  // The API fetches by contactId directly, businessId in path is just for namespacing
  // We'll pass a placeholder and let the server find by contactId
  useEffect(() => {
    // Fetch contact via a direct lookup — businessId placeholder '_' works since route finds by contactId
    fetch(`${API_URL}/contacts/${id}`)
      .then((r) => r.json())
      .then((data: { success: boolean; contact?: ContactDetail; error?: string }) => {
        if (!data.success || !data.contact) setError(data.error ?? 'Contact not found');
        else setContact(data.contact);
      })
      .catch(() => setError('Failed to load contact'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="p-8 flex justify-center items-center min-h-[400px]">
      <div className="w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    </div>
  );

  if (error || !contact) return (
    <div className="p-8 text-slate-500">{error || 'Not found'}</div>
  );

  const statusCfg = STATUS_CONFIG[contact.status];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.push('/customers')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" /></svg>
        Back to Customers
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex gap-5 items-start">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600 font-bold text-xl shrink-0">
          {initials(contact).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-slate-900">{fullName(contact)}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                <span className="text-xs text-slate-400">{SOURCE_LABELS[contact.source]}</span>
                {contact.leadScore !== null && (
                  <span className="text-xs text-slate-400">Score: <span className="font-medium text-slate-700">{contact.leadScore}</span></span>
                )}
              </div>
            </div>
            <span className="text-xs text-slate-400">Added {formatDate(contact.createdAt)}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            {contact.email && <div className="text-slate-500">Email <span className="text-slate-800 font-medium">{contact.email}</span></div>}
            {contact.phone && <div className="text-slate-500">Phone <span className="text-slate-800 font-medium">{contact.phone}</span></div>}
            {contact.tags.length > 0 && (
              <div className="col-span-2 flex gap-1.5 flex-wrap mt-1">
                {contact.tags.map((t) => (
                  <span key={t} className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{t}</span>
                ))}
              </div>
            )}
            {contact.notes && <div className="col-span-2 text-slate-500 text-xs mt-1">{contact.notes}</div>}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Activities', value: contact.activities.length },
          { label: 'Survey Responses', value: contact.surveyResponses.length },
          { label: 'QR Scans', value: contact.qrScans.length },
          { label: 'Appointments', value: contact.appointments.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <div className="text-2xl font-bold text-slate-900">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity timeline */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Activity Timeline</h2>
          {contact.activities.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No activity recorded yet</p>
          ) : (
            <div className="space-y-3">
              {contact.activities.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="text-base shrink-0 mt-0.5">{ACTIVITY_ICONS[a.type] ?? '•'}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{a.title}</p>
                    {a.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{a.description}</p>}
                    <p className="text-[10px] text-slate-300 mt-0.5">{formatDateTime(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Appointments */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Appointments</h2>
          {contact.appointments.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No appointments</p>
          ) : (
            <div className="space-y-2">
              {contact.appointments.map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(a.startTime)}</p>
                  <span className={`inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    a.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    a.status === 'CANCELLED' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'
                  }`}>{a.status.toLowerCase()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Survey responses */}
        {contact.surveyResponses.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Survey Responses</h2>
            <div className="space-y-2">
              {contact.surveyResponses.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.survey?.title ?? 'Survey'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(r.createdAt)}</p>
                  </div>
                  {r.score !== null && (
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={`text-sm ${s <= r.score! ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR scans */}
        {contact.qrScans.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">QR Code Scans</h2>
            <div className="space-y-2">
              {contact.qrScans.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.qrCode?.label ?? 'QR Code'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{s.qrCode ? QR_PURPOSE_LABELS[s.qrCode.purpose] : ''} · {formatDateTime(s.createdAt)}</p>
                  </div>
                  {s.outcome && <span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{s.outcome}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Call logs */}
        {contact.callLogs.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Call History</h2>
            <div className="space-y-2">
              {contact.callLogs.map((c) => (
                <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800 capitalize">{c.direction.toLowerCase()} · {c.intent.toLowerCase()}</span>
                    {c.duration && <span className="text-xs text-slate-400">{Math.round(c.duration / 60)}m</span>}
                  </div>
                  {c.summary && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.summary}</p>}
                  {c.sentiment && <span className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full ${c.sentiment === 'POSITIVE' ? 'bg-emerald-100 text-emerald-700' : c.sentiment === 'NEGATIVE' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>{c.sentiment.toLowerCase()}</span>}
                  <p className="text-[10px] text-slate-300 mt-1">{formatDateTime(c.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat sessions */}
        {contact.chatSessions.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Chat Sessions</h2>
            <div className="space-y-2">
              {contact.chatSessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800 capitalize">{s.channel.toLowerCase()} chat</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(s.createdAt)}</p>
                  </div>
                  {s.leadCaptured && <span className="text-[11px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Lead captured</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
