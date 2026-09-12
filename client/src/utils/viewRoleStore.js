/* Device-local cache of the dashboard "Viewing as" hat.
 *
 * The DB column on the user row is the real source of truth; this is only a
 * fast path so the correct sidebar paints before /auth/me returns.
 *
 * It is keyed per user, like listingDraft/requirementDraft, because it used to
 * be a single browser-global "dash_view_role" key that was never cleared on
 * logout. That leaked the hat between accounts on a shared browser: a seller
 * signing out and an admin signing in left the admin looking at the SELLER
 * dashboard, because the member shell fell back to the stale key.
 *
 * clearViewRole() is called from authService.logout() so the hat dies with the
 * session even on the device that set it.
 */

const PREFIX = "dash_view_role";

// Anonymous callers share one bucket; they have no hat worth keeping anyway.
const keyFor = (userId) => `${PREFIX}:${userId || "anon"}`;

/* The old browser-global key. Read nowhere any more — removed on sight so a
   returning user does not carry a stranger's hat forward from before this fix. */
const LEGACY_KEY = PREFIX;

export const readViewRole = (userId) => {
  if (!userId) return null;
  try {
    localStorage.removeItem(LEGACY_KEY);
    return localStorage.getItem(keyFor(userId));
  } catch {
    // localStorage can throw in private mode — the hat is a nice-to-have.
    return null;
  }
};

export const writeViewRole = (userId, role) => {
  if (!userId || !role) return;
  try {
    localStorage.setItem(keyFor(userId), role);
  } catch {
    /* same nice-to-have caveat */
  }
};

/* Drops the caller's own hat plus the legacy global key. Used on logout.
   `userId` is optional: logout may run after currentUser is already gone, and
   clearing the legacy key is still worth doing. */
export const clearViewRole = (userId) => {
  try {
    localStorage.removeItem(LEGACY_KEY);
    if (userId) localStorage.removeItem(keyFor(userId));
  } catch {
    /* same nice-to-have caveat */
  }
};

export default { readViewRole, writeViewRole, clearViewRole };
