'use client';
import { useBusiness } from '../../../../components/auth/business-provider';
import { PageShell, Card, Spinner, EmptyState } from '../../components';

export default function V2Orders() {
  const { loading } = useBusiness();
  if (loading) return <Spinner />;

  return (
    <PageShell title="Orders" subtitle="Customer orders and history">
      <Card>
        <EmptyState
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4z" clipRule="evenodd" /></svg>}
          title="No orders yet"
          description="Orders placed through your AI systems will show up here."
        />
      </Card>
    </PageShell>
  );
}
