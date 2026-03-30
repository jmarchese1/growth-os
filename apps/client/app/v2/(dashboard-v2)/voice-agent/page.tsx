'use client';
import { useBusiness } from '../../../../components/auth/business-provider';
import { PageShell, Card, CardHeader, Badge, Button, Spinner, StatusDot } from '../../components';

export default function V2VoiceAgent() {
  const { business, loading } = useBusiness();
  if (loading) return <Spinner />;
  const hasAgent = !!business?.elevenLabsAgentId;
  const hasPhone = !!business?.twilioPhoneNumber;

  return (
    <PageShell title="Phone Agent" subtitle="AI voice receptionist for inbound calls">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Voice Agent" action={<Badge color={hasAgent ? 'emerald' : 'slate'}>{hasAgent ? 'Active' : 'Not configured'}</Badge>} />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <StatusDot active={hasAgent} />
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-white">ElevenLabs Agent</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{hasAgent ? 'Connected and answering calls' : 'Set up your AI voice agent'}</p>
              </div>
            </div>
            {!hasAgent && <Button variant="primary" size="sm">Configure Agent</Button>}
          </div>
        </Card>
        <Card>
          <CardHeader title="Phone Number" action={<Badge color={hasPhone ? 'emerald' : 'slate'}>{hasPhone ? 'Active' : 'None'}</Badge>} />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <StatusDot active={hasPhone} />
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-white">{hasPhone ? business?.twilioPhoneNumber : 'No phone number'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{hasPhone ? 'Dedicated business line' : 'Provision a local number'}</p>
              </div>
            </div>
            {!hasPhone && <Button variant="primary" size="sm">Get Phone Number</Button>}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
