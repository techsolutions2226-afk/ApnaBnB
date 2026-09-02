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

/* Cap Prisma's connection pool under Supabase's PgBouncer ceiling (15 clients
   in session mode). Prisma's default pool (cpu*2+1) can exceed that, which
   trips EMAXCONNSESSION whenever several controllers query in parallel.

   - connection_limit: keep the client pool small so parallel bursts (e.g.
     Promise.all in getUserStats) can never exhaust Supabase's 15-connection
     session cap. 6 leaves clear headroom even when Prisma opens an extra
     physical connection per transaction/query batch.
   - pool_timeout: fail fast instead of queueing indefinitely once the pool is
     full. Without this, saturated requests pile up and re-open/re-hold more
     connections, making the exhaustion cascade worse. */
function cappedDatabaseUrl(url) {
  if (!url || !url.includes('pooler.supabase.com')) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('connection_limit', '6');
    u.searchParams.set('pool_timeout', '5');
    return u.toString();
  } catch {
    return url;
  }
}

const basePrisma = new PrismaClient({
  datasources: { db: { url: cappedDatabaseUrl(process.env.DATABASE_URL) } },
});

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
