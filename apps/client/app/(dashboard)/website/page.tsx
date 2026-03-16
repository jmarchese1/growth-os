'use client';

import { useBusiness } from '../../../components/auth/business-provider';
import WebsitePageClient from './website-page-client';

export default function WebsitePage() {
  const { business, loading } = useBusiness();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!business) return null;

  return <WebsitePageClient businessId={business.id} />;
}
