/**
 * Creates the "Embedo" business record in the database.
 *
 * This is YOUR business — the one that owns the platform.
 * All inbound leads (Cal.com bookings, website form submissions, etc.)
 * are filed under this business ID.
 *
 * After running, copy the printed ID and set it as:
 *   EMBEDO_BUSINESS_ID=<the-id>
 * in your .env.local (local) and Railway env vars (production).
 *
 * Usage:
 *   npx tsx infrastructure/scripts/create-embedo-business.ts
 */

import { PrismaClient, BusinessType, OnboardingStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.upsert({
    where: { slug: 'embedo' },
    update: {},
    create: {
      name: 'Embedo',
      slug: 'embedo',
      type: BusinessType.OTHER,
      status: OnboardingStatus.ACTIVE,
      phone: '+15551234567', // replace with your real number
      email: 'jason@embedo.io',
      website: 'https://embedo.io',
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'US',
      },
      timezone: 'America/New_York',
      settings: {
        isOwnerBusiness: true,
        description: 'AI infrastructure platform for local businesses',
      },
    },
  });

  console.log('');
  console.log('='.repeat(60));
  console.log('  Embedo business record created (or already exists)');
  console.log('='.repeat(60));
  console.log('');
  console.log(`  Business ID:  ${business.id}`);
  console.log(`  Name:         ${business.name}`);
  console.log(`  Slug:         ${business.slug}`);
  console.log('');
  console.log('  Next steps:');
  console.log(`  1. Add to .env.local:     EMBEDO_BUSINESS_ID=${business.id}`);
  console.log(`  2. Add to Railway vars:   EMBEDO_BUSINESS_ID=${business.id}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error('Failed to create Embedo business:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
