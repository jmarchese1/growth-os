'use client';
import { useBusiness } from '../../../../components/auth/business-provider';
import { PageShell, Card, Button, Spinner, EmptyState } from '../../components';

export default function V2Surveys() {
  const { loading } = useBusiness();
  if (loading) return <Spinner />;

  return (
    <PageShell title="QR Codes & Surveys" subtitle="Collect feedback and capture contacts at every table"
      actions={<Button variant="primary" size="sm">+ New Survey</Button>}>
      <Card>
        <EmptyState
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5z" clipRule="evenodd" /></svg>}
          title="No surveys yet"
          description="Create QR codes and surveys to capture customer feedback and contact info."
          action={<Button variant="primary" size="sm">Create First Survey</Button>}
        />
      </Card>
    </PageShell>
  );
}
