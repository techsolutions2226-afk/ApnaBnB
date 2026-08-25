/* Seeds the subscription catalog for all three roles.
 *
 * Run with: npm run seed:plans
 *
 * Reuses SEED_PLANS from controllers/planController.js so there is one source
 * of truth — the lazy ensureSeeded() bootstrap and this script cannot drift.
 *
 * Per-role and idempotent: a role that already has plans is left alone, so an
 * admin's edits are never overwritten. Delete a role's plans in the admin panel
 * and re-run to restore just that role.
 */
const prisma = require('./db/prisma');
const { SEED_PLANS } = require('./controllers/planController');

(async () => {
  const roles = [...new Set(SEED_PLANS.map((p) => p.role))];
  let inserted = 0;

  for (const role of roles) {
    const existing = await prisma.plan.count({ where: { role } });
    if (existing > 0) {
      console.log(`  ${role.padEnd(7)} skipped — ${existing} plan(s) already exist`);
      continue;
    }
    const rows = SEED_PLANS.filter((p) => p.role === role);
    await prisma.plan.createMany({ data: rows });
    inserted += rows.length;
    console.log(`  ${role.padEnd(7)} seeded ${rows.length} plans`);
  }

  const all = await prisma.plan.findMany({ orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }] });
  console.log(`\n${inserted} inserted · ${all.length} total\n`);
  for (const p of all) {
    const price = p.monthlyPrice === 0 ? 'free' : `PKR ${p.monthlyPrice.toLocaleString()}/mo`;
    console.log(`  ${p.role.padEnd(7)} ${p.name.padEnd(9)} ${price.padEnd(18)} ${p.popular ? '★ popular' : ''}`);
  }

  await prisma.$disconnect();
})().catch((e) => {
  console.error('Seeding failed:', e.message);
  process.exit(1);
});
