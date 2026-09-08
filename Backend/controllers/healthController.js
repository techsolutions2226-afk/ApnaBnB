/* HealthController — powers GET /api/admin/health.
 *
 * Aggregates REAL platform health into one payload for the admin
 * "System Maintenance & Platform Health" page:
 *
 *   - Traffic + error/security metrics (Backend/middleware/requestMetrics)
 *   - Live DB checks ($queryRaw probes + Postgres catalog)
 *   - Server resource probes (os.cpus / os.mem / df)
 *   - External service pings (Cloudinary, Gemini, Brevo, Maps TCP, …)
 *   - Matching-engine DB aggregates + recent activity logs
 *
 * Cached for 60s (same pattern as the stats endpoint); ?fresh=1 bypasses.
 * Every sub-check is independently try/caught so one failing service can
 * never take down the whole dashboard.
 */

const prisma = require('../db/prisma');
const cache = require('../utils/cache');
const { snapshot } = require('../middleware/requestMetrics');
const health = require('../utils/healthChecks');

const CACHE_KEY = 'admin:health';
const CACHE_TTL_MS = 60_000;

/* Overall status is derived from REAL signals:
   - database unreachable            → down
   - high error rate / failing deps  → degraded
   - otherwise                      → operational */
const computeOverall = (db, metrics, services) => {
  if (db?.status === 'down') {
    return {
      status: 'down',
      label: 'Down',
      healthScore: 0,
      reason: 'Database connection failed - the platform cannot serve requests.',
    };
  }

  const lastHour = metrics?.lastHour || {};
  const errorRate = lastHour.errorRate || 0; // already a percentage (0-100)
  const failing = services.filter((s) => s.status === 'down' || s.status === 'degraded').length;

  let score = 100;
  if (errorRate > 10) score -= 40;
  else if (errorRate > 5) score -= 20;
  if (failing > 0) score -= Math.min(30, failing * 10);
  score = Math.max(0, Math.min(100, Math.round(score)));

  const degraded = errorRate > 5 || failing >= 2;
  const status = degraded ? 'degraded' : 'operational';
  return {
    status,
    label: status === 'degraded' ? 'Degraded' : 'Operational',
    healthScore: score,
    reason: degraded
      ? `Error rate ${errorRate}% in the last hour${failing ? ` and ${failing} external service(s) impaired` : ''}.`
      : 'All core subsystems are responding normally.',
  };
};

const getHealth = async (req, res, next) => {
  try {
    const forceFresh =
      req.query.fresh === '1' ||
      req.query.fresh === 'true' ||
      String(req.headers['cache-control'] || '').includes('no-cache');

    if (!forceFresh) {
      const cached = cache.get(CACHE_KEY);
      if (cached) return res.status(200).json(cached);
    } else {
      cache.del(CACHE_KEY);
    }

    // Traffic/error/security metrics (real, since process boot).
    const metrics = snapshot(60);

    const [db, dbUsage, system, services, matching, active, logs] = await Promise.all([
      health.dbCheck(),
      health.dbUsage(),
      health.systemHealth(),
      health.services(),
      health.matchingStats().catch(() => ({ status: 'unavailable', available: false })),
      health.activeUsers(),
      prisma.activityLog
        .findMany({ orderBy: { createdAt: 'desc' }, take: 8 })
        .catch(() => []),
    ]);

    const overall = computeOverall(db, metrics, services);
    const now = new Date().toISOString();

    const payload = {
      generatedAt: now,
      overall,

      system: {
        activeUsers: active,
        activeSessions: null, // JWTs are stateless; no session store to count.
        lastCheckedAt: now,
        processUptimeSec: system?.processUptimeSec ?? null,
      },

      api: {
        uptimeSec: metrics.uptimeSec,
        startedAt: metrics.startedAt,
        totals: metrics.totals,
        rpm: metrics.rpm,
        lastHour: metrics.lastHour,
        byMinute: metrics.byMinute,
        endpoints: metrics.endpoints,
      },

      database: {
        connected: db.status === 'operational',
        status: db.status,
        latencyMs: db.latencyMs,
        detail: db.detail,
        activeConnections: dbUsage?.activeConnections ?? null,
        usageBytes: dbUsage?.databaseSizeBytes ?? null,
        usageLabel: health.formatBytes(dbUsage?.databaseSizeBytes ?? null),
        // Not measurable from this process:
        failedQueries: null,
        slowQueries: null,
        lastBackupAt: null,
      },

      server: system,

      matching: matching?.available === false
        ? { status: 'unavailable', available: false }
        : matching,

      jobs: {
        configured: false,
        note: 'No background job framework (cron/queue) is configured. Requests are served synchronously by the API process.',
        tasks: [],
        counts: {
          running: 1,             // the in-process 2FA sweep below
          completed: null,
          failed: null,
          pending: null,
          retries: null,
          lastStatus: 'running',
        },
      },

      services,

      security: {
        failedLogins: metrics.authFailures,
        rateLimited: metrics.security.filter((s) => s.type === 'rate_limited').length,
        unauthorized: metrics.security.filter((s) => s.type === 'unauthorized').length,
        forbidden: metrics.security.filter((s) => s.type === 'forbidden').length,
        events: metrics.security.slice(-25),
      },

      errors: {
        total: metrics.errors.length,
        critical: metrics.errors.filter((e) => e.severity === 'critical').length,
        warnings: metrics.errors.filter((e) => e.severity === 'warning').length,
        errors: metrics.errors.filter((e) => e.severity === 'error').length,
        recent: metrics.errors.slice(-30),
      },

      activity: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        userName: log.userName,
        userEmail: log.userEmail,
        ip: log.ip,
        meta: log.meta,
        createdAt: log.createdAt,
      })),
    };

    cache.set(CACHE_KEY, payload, CACHE_TTL_MS);
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = { getHealth };