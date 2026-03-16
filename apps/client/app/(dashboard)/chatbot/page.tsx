import { getCurrentUser } from '../../../lib/auth';
import { db } from '@embedo/db';
import ChatbotClient from './chatbot-client';

export default async function ChatbotPage() {
  const user = await getCurrentUser();

  let businessId = user.id;
  try {
    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (dbUser?.businessId) businessId = dbUser.businessId;
  } catch {
    // DB may not have User table yet — fall back to Supabase ID
  }

  return <ChatbotClient businessId={businessId} />;
}
