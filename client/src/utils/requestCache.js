/* ─── requestCache — dedupe + short-TTL cache for GETs ───
 *
 * There is no React Query in this app; every hook is hand-rolled
 * useState + useEffect, so two components calling the same hook fire two
 * identical requests and a navigation away and back fires them all again.
 *
 * This does the two things that matter most, in ~40 lines:
 *
 *   1. IN-FLIGHT DEDUPE — concurrent callers for the same key share one
 *      promise. This is what collapses the duplicated /matches/mine (the
 *      dashboard and RecentMatches both mount it) and the doubled AI poll.
 *   2. SHORT TTL — a repeat read within the window skips the network.
 *
 * Deliberately NOT a full cache layer: no background revalidation, no
 * subscriptions. Anything user-specific must include the user or role in its
 * key, or one account would read another's data.
 * ─────────────────────────────────────────────── */

const DEFAULT_TTL_MS = 30_000;

const inFlight = new Map(); // key -> Promise
const entries = new Map(); // key -> { value, expiresAt }

/* Run `loader` for `key`, sharing any request already in flight and reusing a
   fresh result. Failures are never cached — the next caller retries. */
export const cachedRequest = (key, loader, ttlMs = DEFAULT_TTL_MS) => {
  const hit = entries.get(key);
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.value);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const promise = loader()
    .then((value) => {
      entries.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
};

/* Drop a cached result so the next read is fresh — call after a mutation. */
export const invalidate = (key) => {
  entries.delete(key);
  inFlight.delete(key);
};

export const invalidateByPrefix = (prefix) => {
  for (const key of [...entries.keys()]) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
  for (const key of [...inFlight.keys()]) {
    if (key.startsWith(prefix)) inFlight.delete(key);
  }
};

/* Wipe everything — used on logout so a cached list can never survive into the
   next account's session. */
export const clearRequestCache = () => {
  entries.clear();
  inFlight.clear();
};

export default { cachedRequest, invalidate, invalidateByPrefix, clearRequestCache };
