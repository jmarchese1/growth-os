'use client';
import { useBusiness } from '../../../../components/auth/business-provider';
import { PageShell, Card, CardHeader, Badge, Button, Spinner } from '../../components';

export default function V2Billing() {
  const { business, loading } = useBusiness();
  if (loading) return <Spinner />;
  const sub = business?.subscription as { status?: string; tier?: string; currentPeriodEnd?: string } | null;

  return (
    <PageShell title="Billing" subtitle="Manage your subscription and payment">
      <Card>
        <CardHeader title="Current Plan" action={sub?.status ? <Badge color={sub.status === 'ACTIVE' ? 'emerald' : 'amber'}>{sub.status}</Badge> : <Badge>Free</Badge>} />
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Plan</p>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">{sub?.tier ?? 'Free'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{sub?.status ?? 'No active subscription'}</p>
            </div>
            {sub?.currentPeriodEnd && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Renews</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
              </div>
            )}
          </div>
          <Button variant="secondary" size="sm">Manage Subscription</Button>
        </div>
      </Card>
    </PageShell>
  );
}
