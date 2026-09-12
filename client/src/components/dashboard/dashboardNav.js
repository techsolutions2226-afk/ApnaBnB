/* ===================================================
   dashboardNav.js — sidebar navigation config per role.
   Icon values are react-icons component references (rendered
   as <item.icon /> in the shell). Every `to` points at an
   existing route — this only relocates the old "Quick Actions"
   links into the sidebar; it changes no destinations.
   =================================================== */
import {
  FiGrid,
  FiPlusSquare,
  FiList,
  FiClipboard,
  FiGitMerge,
  FiSearch,
  FiHeart,
  FiCalendar,
  FiEdit3,
  FiCreditCard,
  FiKey,
  FiHome,
  FiBriefcase,
} from "react-icons/fi";

export const ROLES = ["seller", "buyer", "dealer"];

export const ROLE_META = {
  seller: { labelKey: "roles.seller", icon: FiKey, accent: "#4f46e5" },
  buyer: { labelKey: "roles.buyer", icon: FiHome, accent: "#4a90d9" },
  dealer: { labelKey: "roles.dealer", icon: FiBriefcase, accent: "#8b5cf6" },
};

/**
 * Hats a member may wear in the dashboard "Viewing as" switcher.
 * Permanent account `role` is set at signup; this only constrains viewRole.
 *   seller | buyer → may view as seller or buyer (not dealer)
 *   dealer         → dealer only
 */
export function allowedViewRoles(accountRole) {
  if (accountRole === "dealer") return ["dealer"];
  if (accountRole === "seller" || accountRole === "buyer") {
    return ["seller", "buyer"];
  }
  return [];
}

export function clampViewRole(accountRole, viewRole) {
  const allowed = allowedViewRoles(accountRole);
  if (allowed.includes(viewRole)) return viewRole;
  if (allowed.includes(accountRole)) return accountRole;
  return allowed[0] || null;
}

/* Shared items reused across roles. */
const DASH = { to: "/dashboard", labelKey: "nav.dashboard", icon: FiGrid, end: true };
const MATCHES = { to: "/matches", labelKey: "nav.matches", icon: FiGitMerge };
const VISITS = { to: "/trips", labelKey: "nav.visits", icon: FiCalendar };
// Every member role has its own tier set and can subscribe while acting as
// that role, so Plans belongs in all three sidebars — not just the dealer's.
const PLANS = { to: "/plans", labelKey: "nav.plans", icon: FiCreditCard };

export const NAV_BY_ROLE = {
  seller: [
    DASH,
    { to: "/listing/new", labelKey: "nav.createListing", icon: FiPlusSquare },
    { to: "/my-listings", labelKey: "nav.myListings", icon: FiList },
    MATCHES,
    VISITS,
    PLANS,
  ],
  buyer: [
    DASH,
    { to: "/requirements/new", labelKey: "nav.postRequirement", icon: FiPlusSquare },
    { to: "/my-requirements", labelKey: "nav.myRequirements", icon: FiClipboard },
    { to: "/", labelKey: "nav.browseProperties", icon: FiSearch, end: true },
    { to: "/wishlists", labelKey: "nav.wishlists", icon: FiHeart },
    MATCHES,
    VISITS,
    PLANS,
  ],
  dealer: [
    DASH,
    { to: "/listing/new", labelKey: "nav.createListing", icon: FiPlusSquare },
    { to: "/my-listings", labelKey: "nav.myListings", icon: FiList },
    { to: "/requirements", labelKey: "nav.requirementsBoard", icon: FiClipboard, end: true },
    { to: "/requirements/new", labelKey: "nav.postRequirement", icon: FiEdit3 },
    MATCHES,
    VISITS,
    PLANS,
  ],
};
