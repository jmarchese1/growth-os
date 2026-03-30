'use client';
import { useBusiness } from '../../../../components/auth/business-provider';
import { PageShell, Card, Button, Spinner, EmptyState } from '../../components';

export default function V2Images() {
  const { loading } = useBusiness();
  if (loading) return <Spinner />;

  return (
    <PageShell title="Image Library" subtitle="AI-generated and uploaded images for your business"
      actions={<Button variant="primary" size="sm">+ Generate Image</Button>}>
      <Card>
        <EmptyState
          icon={<svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" /></svg>}
          title="No images yet"
          description="Generate AI images or upload your own to use across your website and social media."
          action={<Button variant="primary" size="sm">Generate First Image</Button>}
        />
      </Card>
    </PageShell>
  );
}
