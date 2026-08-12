require('dotenv').config();
const prisma = require('./db/prisma');
const { enrichMatchesWithAI } = require('./utils/aiMatch');

(async () => {
  const pending = await prisma.match.findMany({
    where: { aiStatus: { not: 'scored' } },
    take: 3,
    include: { property: true, requirement: true },
  });
  console.log('candidates found:', pending.length);
  if (pending.length === 0) {
    console.log('no pending matches');
    process.exit(0);
  }
  enrichMatchesWithAI(pending.map((m) => ({ matchId: m.id, ruleScore: m.score })));
  console.log('enrichment kicked off, waiting 25s...');
  await new Promise((r) => setTimeout(r, 25000));
  const updated = await prisma.match.findMany({
    where: { id: { in: pending.map((m) => m.id) } },
  });
  for (const m of updated) {
    console.log(
      m.id,
      '| status:', m.aiStatus,
      '| aiScore:', m.aiScore,
      '| blended:', m.score,
      '| reason:', m.aiReason,
    );
  }
  process.exit(0);
})().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});
