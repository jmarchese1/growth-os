'use client';
import { useBusiness } from '../../../../components/auth/business-provider';
import { PageShell, Card, CardHeader, Button, Spinner } from '../../components';

export default function V2Settings() {
  const { business, loading } = useBusiness();
  if (loading) return <Spinner />;

  return (
    <PageShell title="Settings" subtitle="Business profile and preferences">
      <Card>
        <CardHeader title="Business Profile" action={<Button variant="secondary" size="sm">Edit</Button>} />
        <div className="p-5 space-y-4">
          {[
            { label: 'Business Name', value: business?.name ?? '—' },
            { label: 'Type', value: business?.type ?? '—' },
            { label: 'Phone', value: business?.phone ?? '—' },
            { label: 'Address', value: business?.address ?? '—' },
            { label: 'Email', value: business?.email ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
              <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
              <span className="text-sm font-medium text-slate-800 dark:text-white">{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </PageShell>
  );
}
