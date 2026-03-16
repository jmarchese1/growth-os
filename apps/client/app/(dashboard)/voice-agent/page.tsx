import { getCurrentUser } from '../../../lib/auth';
import { db } from '@embedo/db';
import VoiceAgentClient from './voice-agent-client';

export default async function VoiceAgentPage() {
  const user = await getCurrentUser();
  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  const businessId = dbUser?.businessId ?? user.id;

  return <VoiceAgentClient businessId={businessId} />;
}
