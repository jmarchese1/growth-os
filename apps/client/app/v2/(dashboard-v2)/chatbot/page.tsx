'use client';
import { useBusiness } from '../../../../components/auth/business-provider';
import { PageShell, Card, CardHeader, Badge, Spinner, StatusDot } from '../../components';

export default function V2Chatbot() {
  const { business, loading } = useBusiness();
  if (loading) return <Spinner />;
  const settings = business?.settings as Record<string, unknown> | null;
  const enabled = !!settings?.['chatbotEnabled'];

  return (
    <PageShell title="Chat Widget" subtitle="AI chatbot for your website, Instagram & Facebook">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Channels" action={<Badge color={enabled ? 'emerald' : 'slate'}>{enabled ? 'Active' : 'Inactive'}</Badge>} />
          <div className="p-5 space-y-4">
            {[
              { label: 'Web Widget', active: enabled, sub: enabled ? 'Live on your website' : 'Enable to start capturing leads' },
              { label: 'Instagram DMs', active: !!business?.instagramPageId, sub: business?.instagramPageId ? 'Connected' : 'Not connected' },
              { label: 'Facebook Messenger', active: !!business?.facebookPageId, sub: business?.facebookPageId ? 'Connected' : 'Not connected' },
            ].map((ch) => (
              <div key={ch.label} className="flex items-center gap-3">
                <StatusDot active={ch.active} />
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{ch.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{ch.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Stats" />
          <div className="p-5 space-y-4">
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{business?.counts?.chatSessions ?? 0}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total conversations</p>
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
