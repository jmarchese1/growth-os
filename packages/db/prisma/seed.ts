import { PrismaClient, BusinessType, OnboardingStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.warn('Seeding demo data...');

  const business = await prisma.business.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
      name: 'The Golden Fork Restaurant',
      slug: 'demo-restaurant',
      type: BusinessType.RESTAURANT,
      status: OnboardingStatus.ACTIVE,
      phone: '+15551234567',
      email: 'owner@goldenfork.com',
      website: 'https://goldenfork.embedo.ai',
      address: {
        street: '123 Main Street',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        country: 'US',
      },
      timezone: 'America/Chicago',
      settings: {
        hours: {
          monday: { open: '11:00', close: '22:00' },
          tuesday: { open: '11:00', close: '22:00' },
          wednesday: { open: '11:00', close: '22:00' },
          thursday: { open: '11:00', close: '22:00' },
          friday: { open: '11:00', close: '23:00' },
          saturday: { open: '10:00', close: '23:00' },
          sunday: { open: '10:00', close: '21:00' },
        },
        cuisine: 'American Fine Dining',
        maxPartySize: 12,
        chatbotPersona: 'friendly and professional',
      },
    },
  });

  console.warn(`Created demo business: ${business.name} (${business.id})`);

  const contact1 = await prisma.contact.upsert({
    where: {
      businessId_email: {
        businessId: business.id,
        email: 'jane@example.com',
      },
    },
    update: {},
    create: {
      businessId: business.id,
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '+15559876543',
      source: 'CHATBOT',
      status: 'CUSTOMER',
      leadScore: 85,
      tags: ['vip', 'repeat-customer'],
    },
  });

  console.warn(`Created demo contact 1: ${contact1.firstName} ${contact1.lastName}`);

  // Add more test contacts to show variety
  const contact2 = await prisma.contact.upsert({
    where: {
      businessId_email: {
        businessId: business.id,
        email: 'michael.torres@example.com',
      },
    },
    update: {},
    create: {
      businessId: business.id,
      firstName: 'Michael',
      lastName: 'Torres',
      email: 'michael.torres@example.com',
      phone: '+15551119999',
      source: 'VOICE',
      status: 'CUSTOMER',
      leadScore: 92,
      tags: ['frequent-diner', 'events'],
    },
  });

  console.warn(`Created demo contact 2: ${contact2.firstName} ${contact2.lastName}`);

  const contact3 = await prisma.contact.upsert({
    where: {
      businessId_email: {
        businessId: business.id,
        email: 'sarah.anderson@example.com',
      },
    },
    update: {},
    create: {
      businessId: business.id,
      firstName: 'Sarah',
      lastName: 'Anderson',
      email: 'sarah.anderson@example.com',
      phone: '+15552223333',
      source: 'WEBSITE',
      status: 'PROSPECT',
      leadScore: 68,
      tags: ['inquiry', 'corporate-event'],
    },
  });

  console.warn(`Created demo contact 3: ${contact3.firstName} ${contact3.lastName}`);

  const contact4 = await prisma.contact.upsert({
    where: {
      businessId_email: {
        businessId: business.id,
        email: 'david.lee@example.com',
      },
    },
    update: {},
    create: {
      businessId: business.id,
      firstName: 'David',
      lastName: 'Lee',
      email: 'david.lee@example.com',
      phone: '+15554445555',
      source: 'SOCIAL',
      status: 'LEAD',
      leadScore: 45,
      tags: ['instagram-dm', 'new-lead'],
    },
  });

  console.warn(`Created demo contact 4: ${contact4.firstName} ${contact4.lastName}`);

  console.warn('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
