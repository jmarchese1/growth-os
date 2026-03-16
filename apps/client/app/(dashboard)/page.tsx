'use client';

import KpiCard from '../../components/ui/kpi-card';
import ModuleStatus from '../../components/ui/module-status';
import { useBusiness } from '../../components/auth/business-provider';

export default function DashboardOverview() {
  const { business, loading } = useBusiness();

  const counts = business?.counts ?? { contacts: 0, callLogs: 0, chatSessions: 0, appointments: 0, leads: 0 };
  const settings = business?.settings as Record<string, unknown> | null;

  return (
    <div className="p-8 animate-fade-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          {business ? `Overview for ${business.name}` : 'Overview of your Embedo AI services'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Total Contacts" value={counts.contacts} color="violet"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" /></svg>} />
            <KpiCard label="Calls This Month" value={counts.callLogs} color="sky"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>} />
            <KpiCard label="Chat Conversations" value={counts.chatSessions} color="emerald"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>} />
            <KpiCard label="Appointments" value={counts.appointments} color="amber"
              icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>} />
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Active Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ModuleStatus name="Voice Agent" active={!!business?.elevenLabsAgentId} description="AI receptionist for inbound calls"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" /></svg>} />
              <ModuleStatus name="Chatbot" active={!!settings?.['chatbotEnabled']} description="AI chat on website, IG & FB"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" clipRule="evenodd" /></svg>} />
              <ModuleStatus name="Lead Engine" active={counts.leads > 0} description="Lead capture, scoring & sequences"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v1h8v-1z" /></svg>} />
              <ModuleStatus name="Surveys" active={false} description="Customer satisfaction & feedback"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>} />
              <ModuleStatus name="Social Media" active={!!(business?.instagramPageId || business?.facebookPageId)} description="Content generation & scheduling"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>} />
              <ModuleStatus name="Website" active={business?.status === 'ACTIVE'} description="Auto-generated business website"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16z" clipRule="evenodd" /></svg>} />
              <ModuleStatus name="Proposals" active={false} description="AI-generated business proposals"
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>} />
              <ModuleStatus name="Phone Number" active={!!business?.twilioPhoneNumber} description={business?.twilioPhoneNumber ?? 'Dedicated business phone line'}
                icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" /></svg>} />
            </div>
          </div>

          {!business && (
            <div>
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Getting Started</h2>
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm">Your account is not linked to a business yet. Contact your Embedo administrator to get set up.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
