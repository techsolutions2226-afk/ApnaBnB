require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma
  .$queryRaw`SELECT 1 AS ok`
  .then((r) => {
    console.log('CONNECTED, result:', JSON.stringify(r));
    process.exit(0);
  })
  .catch((e) => {
    console.log('FAILED:', e.message);
    process.exit(1);
  });
