import { db } from '@embedo/db';

async function main() {
  // Find the embedo business to keep
  const embedo = await db.business.findFirst({
    where: { name: { contains: 'embedo', mode: 'insensitive' } },
  });

  console.log('\n=== CLEANUP PREVIEW ===\n');
  console.log('Keeping business:', embedo ? `${embedo.name} (${embedo.id})` : 'NOT FOUND — will delete all businesses');

  const [proposalCount, businessCount, convertedProspects] = await Promise.all([
    db.proposal.count(),
    db.business.count({ where: embedo ? { id: { not: embedo.id } } : {} }),
    db.prospectBusiness.count({ where: { status: 'CONVERTED' } }),
  ]);

  console.log(`Proposals to delete: ${proposalCount}`);
  console.log(`Businesses to delete (+ cascaded records): ${businessCount}`);
  console.log(`Converted prospects to reset: ${convertedProspects}`);

  const args = process.argv.slice(2);
  if (!args.includes('--confirm')) {
    console.log('\nRun with --confirm to execute.\n');
    await db.$disconnect();
    return;
  }

  console.log('\n=== RUNNING CLEANUP ===\n');

  // 1. Delete all proposals
  const deletedProposals = await db.proposal.deleteMany({});
  console.log(`Deleted ${deletedProposals.count} proposals`);

  // 2. Delete all businesses except embedo (cascades: contacts, leads, voice logs, etc.)
  const whereClause = embedo ? { id: { not: embedo.id } } : {};
  const deletedBusinesses = await db.business.deleteMany({ where: whereClause });
  console.log(`Deleted ${deletedBusinesses.count} businesses (all cascaded records removed)`);

  // 3. Reset converted prospects back to REPLIED, clear businessId link
  const resetProspects = await db.prospectBusiness.updateMany({
    where: { status: 'CONVERTED' },
    data: { status: 'REPLIED', convertedToBusinessId: null },
  });
  console.log(`Reset ${resetProspects.count} converted prospects → REPLIED`);

  console.log('\nDone.\n');
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
