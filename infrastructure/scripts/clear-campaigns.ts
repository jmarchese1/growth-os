import { db } from '@embedo/db';

async function main() {
  const msgs = await db.outreachMessage.deleteMany({});
  console.log('Deleted', msgs.count, 'outreach messages');

  const prospects = await db.prospectBusiness.deleteMany({});
  console.log('Deleted', prospects.count, 'prospects');

  const campaigns = await db.outboundCampaign.deleteMany({});
  console.log('Deleted', campaigns.count, 'campaigns');

  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
