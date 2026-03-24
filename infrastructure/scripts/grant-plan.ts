/**
 * Grant a subscription plan to a business — bypasses Stripe for testing.
 *
 * Usage:
 *   npx tsx infrastructure/scripts/grant-plan.ts jason@embedo.io LARGE
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const tier = (process.argv[3] ?? 'LARGE').toUpperCase();

  if (!email) {
    console.error('Usage: npx tsx infrastructure/scripts/grant-plan.ts <email> [tier]');
    process.exit(1);
  }

  const validTiers = ['FREE', 'SOLO', 'SMALL', 'MEDIUM', 'LARGE'];
  if (!validTiers.includes(tier)) {
    console.error(`Invalid tier "${tier}". Valid: ${validTiers.join(', ')}`);
    process.exit(1);
  }

  // Try finding by user email first, then by business email
  let businessId: string | null = null;

  const user = await db.user.findUnique({
    where: { email },
    select: { businessId: true, firstName: true, lastName: true },
  });

  if (user?.businessId) {
    businessId = user.businessId;
    console.log(`Found user: ${user.firstName} ${user.lastName} → businessId: ${businessId}`);
  } else {
    const biz = await db.business.findFirst({
      where: { email },
      select: { id: true, name: true },
    });
    if (biz) {
      businessId = biz.id;
      console.log(`Found business by email: ${biz.name} → businessId: ${businessId}`);
    }
  }

  if (!businessId) {
    console.error(`No user or business found for email: ${email}`);
    process.exit(1);
  }

  const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  const sub = await db.subscription.upsert({
    where: { businessId },
    update: {
      pricingTier: tier as 'FREE' | 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: oneYear,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
    create: {
      businessId,
      pricingTier: tier as 'FREE' | 'SOLO' | 'SMALL' | 'MEDIUM' | 'LARGE',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: oneYear,
    },
  });

  console.log(`\n✅ Subscription granted!`);
  console.log(`   Plan: ${sub.pricingTier}`);
  console.log(`   Status: ${sub.status}`);
  console.log(`   Expires: ${oneYear.toLocaleDateString()}`);
  console.log(`   Stripe: bypassed (no charge)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
