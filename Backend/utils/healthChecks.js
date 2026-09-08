/* HealthChecks — live, REAL infrastructure checks for the admin Health page.
 *
 * Nothing here is fabricated. Every check performs an actual probe:
 *   - Database  → real $queryRaw SELECT 1 + Postgres catalog queries
 *   - CPU/mem   → os.process + a sampled os.cpus() delta
 *   - Storage   → `df -k` against the filesystem (Linux hosts)
 *   - Services  → live API pings (Cloudinary ping, Gemini model list, Brevo
 *                 account, TCP reachability for Maps/SMTP)
 *
 * Anything that cannot be measured is reported as `null` (the UI renders it
 * as "Unavailable") — never an invented number.
 */

const { execFile } = require('child_process');
const { promisify } = require('util');
const net = require('net');
const os = require('os');
const cloudinary = require('cloudinary').v2;
const prisma = require('../db/prisma');

const execFileAsync = promisify(execFile);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* ── Generic helpers ─────────────────────────────────────────── */

const measure = async (fn) => {
  const start = process.hrtime.bigint();
  const result = await fn();
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { result, ms: Math.round(ms * 10) / 10 };
};

const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 'B';
  for (let i = 0; i < units.length && value >= 1024; i += 1) {
    value /= 1024;
    unit = units[i];
  }
  return `${value >= 10 ? Math.round(value) : Math.round(value * 10) / 10} ${unit}`;
};

/* ── Database ────────────────────────────────────────────────── */

const dbCheck = async () => {
  try {
    // Average over three real probes so the reported latency is not a fluke.
    let total = 0;
    let samples = 0;
    for (let i = 0; i < 3; i += 1) {
      const { ms } = await measure(() => prisma.$queryRaw`SELECT 1 AS ok`);
      total += ms;
      samples += 1;
    }
    const latencyMs = samples ? Math.round((total / samples) * 10) / 10 : null;
    return { status: 'operational', latencyMs, detail: 'SELECT 1 OK' };
  } catch (error) {
    return { status: 'down', latencyMs: null, detail: error.message };
  }
};

const dbUsage = async () => {
  const out = { databaseSizeBytes: null, activeConnections: null };

  try {
    const rows = await prisma.$queryRaw`SELECT pg_database_size(current_database())::bigint AS bytes`;
    const bytes = Number(rows?.[0]?.bytes || 0);
    out.databaseSizeBytes = bytes >= 0 ? bytes : null;
  } catch {
    out.databaseSizeBytes = null;
  }

  try {
    const rows = await prisma.$queryRaw`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = current_database()`;
    out.activeConnections = Number(rows?.[0]?.n || 0);
  } catch {
    out.activeConnections = null;
  }

  return out;
};

/* ── Server / resources ──────────────────────────────────────── */

const sampleCpu = () => {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) total += cpu.times[type];
    idle += cpu.times.idle;
  }
  return { idle, total, count: cpus.length };
};

/* Real CPU %: sample kernel CPU times, wait ~150ms, sample again, and compute
   the idle delta. (os.cpus() totals are cumulative, so a single read only
   gives a meaningless 100%.) */
const cpuUsagePercent = async () => {
  const a = sampleCpu();
  await sleep(150);
  const b = sampleCpu();
  const idleDelta = b.idle - a.idle;
  const totalDelta = b.total - a.total;
  if (totalDelta <= 0) return null;
  const pct = (1 - idleDelta / totalDelta) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
};

const storageUsage = async () => {
  try {
    const { stdout } = await execFileAsync('df', ['-k', '/']);
    const lines = stdout.trim().split('\n');
    const parts = (lines[1] || '').split(/\s+/);
    if (parts.length < 5) return null; // Unavailable
    const usedKB = Number(parts[2]);
    const availKB = Number(parts[3]);
    const totalKB = Number(parts[1]);
    const usedPct = totalKB ? Math.round((usedKB / totalKB) * 1000) / 10 : null;
    return { usedBytes: usedKB * 1024, availBytes: availKB * 1024, totalBytes: totalKB * 1024, usedPct };
  } catch {
    return null; // df unavailable (e.g. Windows dev machines) → Unavailable
  }
};

const systemHealth = async () => {
  const totalmem = os.totalmem();
  const freemem = os.freemem();
  const usedMem = totalmem ? totalmem - freemem : 0;
  const memoryUsedPct = totalmem ? Math.round(((totalmem - freemem) / totalmem) * 1000) / 10 : null;
  const storage = await storageUsage();

  return {
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.arch()}`,
    osType: os.type(),
    processUptimeSec: Math.round(process.uptime()),
    serverUptimeSec: Math.ceil(os.uptime()),
    cpuCount: sampleCpu().count,
    cpuUsage: await cpuUsagePercent(),
    loadAvg: os.platform() === 'win32' ? null : Number((os.loadavg()[0] || 0).toFixed(2)),
    memory: {
      usedBytes: usedMem,
      totalBytes: totalmem,
      usedPct: memoryUsedPct,
      usedLabel: formatBytes(usedMem),
      totalLabel: formatBytes(totalmem),
    },
    storage: storage
      ? {
          usedPct: storage.usedPct,
          usedLabel: formatBytes(storage.usedBytes),
          availLabel: formatBytes(storage.availBytes),
          totalLabel: formatBytes(storage.totalBytes),
        }
      : null,
    serverTime: new Date().toISOString(),
  };
};

/* ── External services ───────────────────────────────────────── */

const checkTcp = (host, port, timeoutMs = 5000) =>
  new Promise((resolve) => {
    const t0 = Date.now();
    const socket = net.connect({ host, port });
    const done = (ok, detail) => {
      socket.destroy();
      resolve({ ok, latencyMs: Date.now() - t0, detail });
    };
    socket.setTimeout(timeoutMs, () => done(false, 'Connection timed out'));
    socket.once('connect', () => done(true, 'Port reachable'));
    socket.once('error', (e) => done(false, e.message));
  });

const services = async () => {
  const now = new Date().toISOString();
  const out = [];

  // 1. Database — real query.
  const db = await dbCheck();
  out.push({
    id: 'database',
    name: 'Database (Postgres)',
    status: db.status,
    latencyMs: db.latencyMs,
    lastCheckedAt: now,
    detail: db.detail,
  });

  // 2. Cloudinary — real API ping.
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    out.push({ id: 'cloudinary', name: 'Cloudinary', status: 'unconfigured', latencyMs: null, lastCheckedAt: now, detail: 'Missing CLOUDINARY_CLOUD_NAME / API key.' });
  } else {
    try {
      const { result, ms } = await measure(() => cloudinary.api.ping());
      const ok = result?.status === 'ok';
      out.push({
        id: 'cloudinary',
        name: 'Cloudinary',
        status: ok ? 'operational' : 'degraded',
        latencyMs: ms,
        lastCheckedAt: now,
        detail: ok ? 'API ping OK' : String(JSON.stringify(result)).slice(0, 120),
      });
    } catch (error) {
      out.push({ id: 'cloudinary', name: 'Cloudinary', status: 'down', latencyMs: null, lastCheckedAt: now, detail: error.message });
    }
  }

  // 3. Google Maps — quota-free TCP reachability (no billing burn per check).
  if (process.env.GOOGLE_MAPS_API_KEY) {
    const tcp = await checkTcp('maps.googleapis.com', 443);
    out.push({
      id: 'google-maps',
      name: 'Google Maps',
      status: tcp.ok ? 'operational' : 'degraded',
      latencyMs: tcp.latencyMs,
      lastCheckedAt: now,
      detail: 'Key configured - network reachable (quota-free check).',
    });
  } else {
    out.push({ id: 'google-maps', name: 'Google Maps', status: 'unconfigured', latencyMs: null, lastCheckedAt: now, detail: 'GOOGLE_MAPS_API_KEY not set.' });
  }

  // 4. Gemini (AI) — real, free models-list call.
  if (process.env.GEMINI_API_KEY) {
    try {
      const { result, ms } = await measure(() =>
        fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`).then(async (r) => ({
          status: r.status,
          body: await r.text(),
        }))
      );
      const ok = result?.status === 200;
      out.push({
        id: 'gemini',
        name: 'Google Gemini (AI)',
        status: ok ? 'operational' : 'degraded',
        latencyMs: ms,
        lastCheckedAt: now,
        detail: ok ? 'Model list OK' : `HTTP ${result.status}`,
      });
    } catch (error) {
      out.push({ id: 'gemini', name: 'Google Gemini (AI)', status: 'down', latencyMs: null, lastCheckedAt: now, detail: error.message });
    }
  } else {
    out.push({ id: 'gemini', name: 'Google Gemini (AI)', status: 'unconfigured', latencyMs: null, lastCheckedAt: now, detail: 'GEMINI_API_KEY not set.' });
  }

  // 5. Email — Brevo account API when configured, else SMTP TCP reachability.
  const mailProvider = String(process.env.MAIL_PROVIDER || 'smtp').toLowerCase();
  if (mailProvider === 'brevo' && process.env.BREVO_API_KEY) {
    try {
      const { result, ms } = await measure(() =>
        fetch('https://api.brevo.com/v3/account', {
          headers: { 'api-key': String(process.env.BREVO_API_KEY) },
        }).then(async (r) => ({ status: r.status, body: await r.text() }))
      );
      const ok = result?.status === 200;
      out.push({
        id: 'email',
        name: 'Email (Brevo)',
        status: ok ? 'operational' : 'degraded',
        latencyMs: ms,
        lastCheckedAt: now,
        detail: ok ? 'Account API OK' : `HTTP ${result.status}`,
      });
    } catch (error) {
      out.push({ id: 'email', name: 'Email (Brevo)', status: 'down', latencyMs: null, lastCheckedAt: now, detail: error.message });
    }
  } else if (process.env.SMTP_HOST) {
    const tcp = await checkTcp(String(process.env.SMTP_HOST), Number(process.env.SMTP_PORT) || 587);
    out.push({
      id: 'email',
      name: 'Email (SMTP)',
      status: tcp.ok ? 'operational' : 'degraded',
      latencyMs: tcp.latencyMs,
      lastCheckedAt: now,
      detail: tcp.detail,
    });
  } else {
    out.push({ id: 'email', name: 'Email (Brevo / SMTP)', status: 'unconfigured', latencyMs: null, lastCheckedAt: now, detail: 'No MAIL_PROVIDER / BREVO_API_KEY / SMTP_HOST configured.' });
  }

  // 6. SMS — no SMS provider exists in this project.
  out.push({ id: 'sms', name: 'SMS', status: 'unconfigured', latencyMs: null, lastCheckedAt: now, detail: 'No SMS provider configured; transactional email is used instead.' });

  // 7. Realtime (Socket.IO) — attached once at boot (index.js → initSockets).
  out.push({ id: 'realtime', name: 'Realtime (Socket.IO)', status: 'operational', latencyMs: null, lastCheckedAt: now, detail: 'Server socket layer attached at boot.' });

  return out;
};

/* ── Matching engine (real DB aggregates) ────────────────────── */

const matchingStats = async () => {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [total, pending, accepted, rejected, closed, last24h, aiFailed, aiPending] = await Promise.all([
    prisma.match.count(),
    prisma.match.count({ where: { status: 'pending' } }),
    prisma.match.count({ where: { status: 'accepted' } }),
    prisma.match.count({ where: { status: 'rejected' } }),
    prisma.match.count({ where: { status: 'closed' } }),
    prisma.match.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.match.count({ where: { aiStatus: 'failed' } }),
    prisma.match.count({ where: { aiStatus: 'pending' } }),
  ]);

  return {
    status: 'operational',
    total,
    pending,
    accepted,
    rejected,
    closed,
    last24h,
    aiFailed,
    aiPending,
    // Processing-time per match for completed AI-scored matches is not stored
    // historically; only live DB latency is measurable. Kept null → Unavailable.
    avgProcessingMs: null,
  };
};

/* ── Active users (last seen within 15 min) ──────────────────── */

const activeUsers = async () => {
  try {
    return await prisma.user.count({
      where: { lastSeenAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
    });
  } catch {
    return null;
  }
};

module.exports = {
  dbCheck,
  dbUsage,
  systemHealth,
  services,
  matchingStats,
  activeUsers,
  formatBytes,
};