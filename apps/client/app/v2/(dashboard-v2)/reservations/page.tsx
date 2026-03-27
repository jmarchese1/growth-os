'use client';
import { useBusiness } from '../../../../components/auth/business-provider';
import { PageShell, Card, Spinner, EmptyState } from '../../components';

export default function V2Reservations() {
  const { loading } = useBusiness();
  if (loading) return <Spinner />;

  return (
    <PageShell title="Reservations" subtitle="Upcoming and past bookings">
      <Card>
        <EmptyState
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>}
          title="No reservations yet"
          description="Reservations from your AI phone agent and website will appear here."
        />
      </Card>
    </PageShell>
  );
}
