/* The role that decides pricing = the role the user is currently acting as
 * (falls back to their account role).
 *
 * Owner contact is now free for everyone on the property detail and profile
 * pages, so the remaining paid plans are a seller/dealer-side value (match
 * access, visibility). Buyers are never routed to a plan. Admins are not a
 * member role and never see the paywall. */
export const getEffectiveRole = (user) => user?.viewRole || user?.role || null;

export const roleRequiresPlan = (role) =>
  role === "seller" || role === "dealer";
