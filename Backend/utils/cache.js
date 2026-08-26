/* ─── cache — one small in-process store ───
 *
 * Everything that caches goes through this file, so swapping the backing store
 * for Redis later is one file rather than twenty call sites.
 *
 * In-process is the right call today: the app runs a single bare `node
 * index.js` (no cluster, no pm2) and db/prisma.js caps the pool at 8 against
 * PgBouncer's 15-session ceiling — headroom that only works for one instance.
 * If a second instance is ever added, each would hold its own copy and they
 * would disagree; that is the point at which this file becomes a Redis client.
 *
 * Deliberately small. Render's free tier sleeps on idle, so every cold start
 * begins with an empty cache — elaborate warming logic would never pay off.
 *
 * The golden rule this enforces: an entry is either fresh or gone. Callers must
 * treat a miss as normal, never as an error.
 * ─────────────────────────────────────────────── */

const DEFAULT_TTL_MS = 60_000;
// Bounded so a cache can never become a slow memory leak — the existing AI Map
// has no cap and grows one entry per pair forever.
const MAX_ENTRIES = 500;

const store = new Map();

const isExpired = (entry) => entry.expiresAt !== 0 && entry.expiresAt <= Date.now();

/* Oldest-inserted entry wins eviction. Map preserves insertion order, so the
   first key is the oldest — good enough here, and far cheaper than tracking
   access order for a cache this size. */
const evictIfFull = () => {
  if (store.size < MAX_ENTRIES) return;
  const oldest = store.keys().next().value;
  if (oldest !== undefined) store.delete(oldest);
};

const get = (key) => {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (isExpired(entry)) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
};

/* ttlMs of 0 means "no expiry" — only for values with explicit invalidation. */
const set = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  evictIfFull();
  store.set(key, {
    value,
    expiresAt: ttlMs > 0 ? Date.now() + ttlMs : 0,
  });
  return value;
};

const del = (key) => store.delete(key);

/* Invalidate a whole family at once, e.g. delByPrefix('plans:') after an admin
   edits a tier — the catalog has one entry per role and they all go stale
   together. */
const delByPrefix = (prefix) => {
  let removed = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      removed += 1;
    }
  }
  return removed;
};

const clear = () => store.clear();

/* Read-through helper: return the cached value, or run the loader and cache it.
   A loader that throws must NOT poison the cache — the error propagates and the
   next caller retries. */
const wrap = async (key, ttlMs, loader) => {
  const hit = get(key);
  if (hit !== undefined) return hit;
  const value = await loader();
  if (value !== undefined) set(key, value, ttlMs);
  return value;
};

const stats = () => ({ size: store.size, maxEntries: MAX_ENTRIES });

module.exports = {
  get,
  set,
  del,
  delByPrefix,
  clear,
  wrap,
  stats,
  DEFAULT_TTL_MS,
  MAX_ENTRIES,
};
