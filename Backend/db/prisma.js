/* Singleton Prisma client for the whole backend.
 *
 * The `result` extension adds a computed `_id` (= `id`) to EVERY model — top
 * level and inside nested `include`s alike. That's the linchpin of the Mongo→
 * Postgres migration: the frontend reads `_id` in ~114 places, and this keeps
 * every API response shaped exactly as before without touching a single
 * frontend file.
 *
 * NOTE for controllers: when you use `select` on a relation (e.g. to avoid
 * leaking a user's password), always include `id: true` in that select so the
 * `_id` compute has what it needs.
 */

const { PrismaClient } = require('@prisma/client');

const basePrisma = new PrismaClient();

const prisma = basePrisma.$extends({
  result: {
    $allModels: {
      _id: {
        needs: { id: true },
        compute(record) {
          return record.id;
        },
      },
    },
  },
});

module.exports = prisma;
