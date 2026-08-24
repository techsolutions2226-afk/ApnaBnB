/* Subscription helpers (pure functions only).
 *
 * Owner contact details are a paid reveal (see propertyController).
 * The actual gate is SERVER-driven: AuthContext fetches GET /api/payments/
 * status (the backend decides from the user's latest Payment row) and exposes
 * it as `subscription` + `refreshSubscription()`. Nothing is stored in
 * localStorage anymore — an admin rejecting a payment re-locks the reveal on
 * the user's next check.
 */

// The role that decides pricing = the role the user is currently acting as
// (falls back to their account role).
export const getEffectiveRole = (user) => user?.viewRole || user?.role || null;

// Buyers (and admins) never pay; sellers and dealers do.
export const roleRequiresPlan = (role) => role === "seller" || role === "dealer";
