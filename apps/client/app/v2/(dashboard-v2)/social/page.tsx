'use client';
import { useBusiness } from '../../../../components/auth/business-provider';
import { PageShell, Card, Button, Spinner, EmptyState, StatusDot } from '../../components';

export default function V2Social() {
  const { business, loading } = useBusiness();
  if (loading) return <Spinner />;
  const hasIG = !!business?.instagramPageId;
  const hasFB = !!business?.facebookPageId;

  return (
    <PageShell title="Social Media" subtitle="AI content creation, scheduling & engagement">
      <Card>
        {!hasIG && !hasFB ? (
          <EmptyState
            icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>}
            title="Connect your social accounts"
            description="Link Instagram and Facebook to let AI manage your content and DMs."
            action={<Button href="/v2/settings" variant="primary" size="sm">Connect Accounts</Button>}
          />
        ) : (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <StatusDot active={hasIG} />
              <p className="text-sm text-slate-700 dark:text-white">Instagram {hasIG ? 'connected' : 'not connected'}</p>
            </div>
            <div className="flex items-center gap-3">
              <StatusDot active={hasFB} />
              <p className="text-sm text-slate-700 dark:text-white">Facebook {hasFB ? 'connected' : 'not connected'}</p>
            </div>
          </div>
        )}
      </Card>
    </PageShell>
  );
}
