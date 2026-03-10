import { db } from '@embedo/db';

export async function isSuppressed(email: string): Promise<boolean> {
  const normalized = email.toLowerCase();
  const record = await db.outreachSuppression.findUnique({ where: { email: normalized } });
  return !!record;
}

export async function upsertSuppression(params: {
  email: string;
  reason: string;
  source?: string;
}): Promise<void> {
  const { email, reason, source } = params;
  const normalized = email.toLowerCase();
  await db.outreachSuppression.upsert({
    where: { email: normalized },
    update: { reason, source },
    create: { email: normalized, reason, source },
  });
}
