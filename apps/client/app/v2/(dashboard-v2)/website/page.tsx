'use client';
import { useBusiness } from '../../../../components/auth/business-provider';
import { PageShell, Card, CardHeader, Badge, Button, Spinner, EmptyState } from '../../components';

export default function V2Website() {
  const { business, loading } = useBusiness();
  if (loading) return <Spinner />;
  const hasWebsite = business?.status === 'ACTIVE';

  return (
    <PageShell title="Website" subtitle="Your AI-generated business website"
      actions={hasWebsite ? <Button variant="secondary" size="sm">Open Live Site</Button> : undefined}>
      {!hasWebsite ? (
        <Card>
          <EmptyState
            icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16z" clipRule="evenodd" /></svg>}
            title="No website generated yet"
            description="Generate a professional website for your business in seconds with AI."
            action={<Button variant="primary" size="sm">Generate Website</Button>}
          />
        </Card>
      ) : (
        <Card>
          <CardHeader title="Website Status" action={<Badge color="emerald">Live</Badge>} />
          <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Domain</p>
              <p className="text-sm font-medium text-slate-800 dark:text-white">{business?.name?.toLowerCase().replace(/\s+/g, '') ?? 'your-site'}.embedo.site</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</p>
              <Badge color="emerald">Published</Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Last updated</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">Today</p>
            </div>
          </div>
        </Card>
      )}
    </PageShell>
  );
}
