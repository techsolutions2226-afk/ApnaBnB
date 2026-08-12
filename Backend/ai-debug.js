require('dotenv').config();
const prisma = require('./db/prisma');

(async () => {
  const rows = await prisma.match.findMany({
    where: { aiStatus: { not: 'scored' } },
    take: 3,
    select: { id: true, aiStatus: true, aiError: true },
  });
  for (const r of rows) console.log(r.id, '|', r.aiStatus, '|', r.aiError);
  process.exit(0);
})().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});
