import { getCurrentUser } from '../../../lib/auth';
import { db } from '@embedo/db';
import WebsitePageClient from './website-page-client';

export default async function WebsitePage() {
  const user = await getCurrentUser();

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  const businessId = dbUser?.businessId ?? user.id; // fallback to supabase ID for dev

  return <WebsitePageClient businessId={businessId} />;
}
