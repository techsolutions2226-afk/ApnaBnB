/* Client-side subscription gate (demo / no payment gateway).
 *
 * Messaging + Deal Room are paid for SELLERS and DEALERS; BUYERS are free.
 * A user "subscribes" by paying via EasyPaisa and uploading a payment
 * screenshot on the Plans page — on submit we mark them active here. State
 * lives in localStorage per user id (not secure/cross-device — a real backend
 * subscription would replace this later).
 */

const KEY = (userId) => `apnabnb_subscription_${userId}`;

// The role that decides pricing = the role the user is currently acting as
// (falls back to their account role).
export const getEffectiveRole = (user) => user?.viewRole || user?.role || null;

// Buyers (and admins) never pay; sellers and dealers do.
export const roleRequiresPlan = (role) => role === "seller" || role === "dealer";

export const getSubscription = (userId) => {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(KEY(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const hasActiveSubscription = (userId) => {
  const sub = getSubscription(userId);
  return !!sub && sub.status === "active";
};

export const activateSubscription = (userId, data = {}) => {
  if (!userId) return null;
  const sub = {
    status: "active",
    activatedAt: new Date().toISOString(),
    ...data,
  };
  try {
    localStorage.setItem(KEY(userId), JSON.stringify(sub));
  } catch {
    /* storage full / disabled — ignore in the demo */
  }
  return sub;
};

export const clearSubscription = (userId) => {
  try {
    localStorage.removeItem(KEY(userId));
  } catch {
    /* ignore */
  }
};

/** True when the user may use messaging / open a Deal Room. */
export const isMessagingUnlocked = (user) => {
  if (!user) return false;
  if (!roleRequiresPlan(getEffectiveRole(user))) return true; // buyers / admin free
  return hasActiveSubscription(user.id);
};
