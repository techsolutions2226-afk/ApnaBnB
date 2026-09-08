/* RequestMetrics — in-process, real-time traffic & error monitoring.
 *
 * Mounted BEFORE the rate limiter in index.js so rate-limited (429) responses
 * are observed too. Every finished response on /api/* is recorded:
 *
 *   - lifetime totals (requests / success / 4xx / 5xx / total latency)
 *   - per-minute buckets (powers the "requests per minute" sparkline)
 *   - per-endpoint latency aggregates (slowest endpoints ranking)
 *   - a bounded ring of error events (4xx/5xx) with status + severity
 *   - a bounded ring of security events (failed logins, rate limits,
 *     unauthorized/forbidden attempts)
 *
 * In-process by design: the app runs as a single `node index.js` instance
 * (see utils/cache.js for the same decision). If the app is ever scaled out,
 * these snapshots move to the cache/Redis layer or a metrics store.
 */

const INSTANCE_STARTED_AT = Date.now();

const store = {
  startedAt: INSTANCE_STARTED_AT,
  totals: { requests: 0, success: 0, clientError: 0, serverError: 0, totalMs: 0 },
  authFailures: 0,
  byMinute: new Map(),   // minuteKey -> { requests, errors }
  endpoints: new Map(),  // "METHOD path" -> { count, totalMs }
  errors: [],            // bounded ring
  security: [],          // bounded ring
};

const MAX_ENDPOINTS = 80;
const MAX_ERROR_RING = 150;
const MAX_SECURITY_RING = 100;
const MAX_MINUTES = 180;

const minuteKey = (ms = Date.now()) => Math.floor(ms / 60000);

const truncate = (arr, max) => {
  if (arr.length > max) arr.splice(0, arr.length - max);
};

const severityFor = (status) => {
  if (status >= 500) return 'critical';
  if (status === 429 || status === 404) return 'warning';
  if (status >= 400) return 'error';
  return 'info';
};

const record = (req, res, ms) => {
  const status = res.statusCode || 0;
  const t = store.totals;
  t.requests += 1;
  if (status >= 500) t.serverError += 1;
  else if (status >= 400) t.clientError += 1;
  else t.success += 1;
  t.totalMs += ms;

  // Per-minute bucket.
  const mk = minuteKey();
  const bucket = store.byMinute.get(mk);
  if (bucket) {
    bucket.requests += 1;
    if (status >= 400) bucket.errors += 1;
  } else {
    store.byMinute.set(mk, { requests: 1, errors: status >= 400 ? 1 : 0 });
    while (store.byMinute.size > MAX_MINUTES) {
      const oldest = store.byMinute.keys().next().value;
      if (oldest === undefined) break;
      store.byMinute.delete(oldest);
    }
  }

  // Endpoint latency aggregates. The health endpoint is excluded so the
  // dashboard never shows itself as the slowest "endpoint".
  const isHealthCall = req.path === '/health' && req.originalUrl.startsWith('/api/admin');
  if (!isHealthCall) {
    const key = `${req.method} ${req.path}`;
    const ep = store.endpoints.get(key);
    if (ep) {
      ep.count += 1;
      ep.totalMs += ms;
    } else if (store.endpoints.size < MAX_ENDPOINTS) {
      store.endpoints.set(key, { count: 1, totalMs: ms });
    }
  }

  // Error ring.
  if (status >= 400) {
    store.errors.push({
      time: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      status,
      ms: Math.round(ms),
      severity: severityFor(status),
    });
    truncate(store.errors, MAX_ERROR_RING);
  }

  // Security events.
  if (status >= 400) {
    const url = req.originalUrl || req.url || '';
    let type = null;
    if (status === 429) type = 'rate_limited';
    else if (url.includes('/api/auth/login')) type = 'failed_login';
    else if (status === 401) type = 'unauthorized';
    else if (status === 403) type = 'forbidden';

    if (type) {
      store.security.push({
        time: new Date().toISOString(),
        type,
        path: url,
        status,
      });
      truncate(store.security, MAX_SECURITY_RING);
      if (type === 'failed_login') store.authFailures += 1;
    }
  }
};

/* Bounded snapshot of everything the admin Health page shows. Nothing here is
   fabricated — every figure is derived from requests this process has actually
   served since boot. */
const snapshot = (timelineMinutes = 60) => {
  const now = Date.now();
  const mkNow = minuteKey(now);

  const byMinute = [];
  for (let i = timelineMinutes - 1; i >= 0; i -= 1) {
    const b = store.byMinute.get(mkNow - i);
    byMinute.push({
      min: mkNow - i,
      requests: b ? b.requests : 0,
      errors: b ? b.errors : 0,
    });
  }

  const endpoints = [...store.endpoints.entries()]
    .map(([name, e]) => ({
      name,
      count: e.count,
      avgMs: e.count ? Math.round((e.totalMs / e.count) * 10) / 10 : 0,
      totalMs: Math.round(e.totalMs),
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, 8);

  const t = store.totals;
  const elapsedSec = Math.max(1, (now - INSTANCE_STARTED_AT) / 1000);
  const elapsedMin = Math.max(0.1, elapsedSec / 60);

  let lastHourRequests = 0;
  let lastHourErrors = 0;
  for (let i = 0; i < 60; i += 1) {
    const b = store.byMinute.get(mkNow - i);
    if (b) {
      lastHourRequests += b.requests;
      lastHourErrors += b.errors;
    }
  }

  return {
    startedAt: new Date(INSTANCE_STARTED_AT).toISOString(),
    uptimeSec: Math.floor(elapsedSec),
    rpm: Math.round((t.requests / elapsedMin) * 10) / 10,
    lastHour: {
      requests: lastHourRequests,
      errors: lastHourErrors,
      errorRate: lastHourRequests
        ? Math.round((lastHourErrors / lastHourRequests) * 1000) / 10
        : 0,
      availability: lastHourRequests
        ? Math.round(((lastHourRequests - lastHourErrors) / lastHourRequests) * 1000) / 10
        : 100,
    },
    totals: {
      requests: t.requests,
      success: t.success,
      clientError: t.clientError,
      serverError: t.serverError,
      avgMs: t.requests ? Math.round((t.totalMs / t.requests) * 10) / 10 : 0,
    },
    byMinute,
    endpoints,
    errors: [...store.errors],
    security: [...store.security],
    authFailures: store.authFailures,
  };
};

const middleware = (req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    try {
      record(req, res, ms);
    } catch (err) {
      // Recording must never break the underlying request.
      console.error('requestMetrics.record failed:', err.message);
    }
  });
  next();
};

module.exports = { middleware, snapshot };