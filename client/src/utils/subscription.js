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

/* Every member role can hold a plan. Buyers were exempt while messaging was the
   only paid feature; the paid feature is now the owner-contact reveal, which is
   billed to buyers too — and the server gates it on an approved payment
   regardless of role, so exempting buyers here would let them click through to
   a 402. Admins are not a member role and never see the paywall. */
export const roleRequiresPlan = (role) =>
  role === "seller" || role === "dealer" || role === "buyer";
