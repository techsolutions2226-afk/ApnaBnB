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
  seller: { label: "Seller", icon: FiKey, accent: "#4f46e5" },
  buyer: { label: "Buyer", icon: FiHome, accent: "#4a90d9" },
  dealer: { label: "Dealer", icon: FiBriefcase, accent: "#8b5cf6" },
};

/* Shared items reused across roles. */
const DASH = { to: "/dashboard", label: "Dashboard", icon: FiGrid, end: true };
const MATCHES = { to: "/matches", label: "Matches", icon: FiGitMerge };
// Every member role has its own tier set and can subscribe while acting as
// that role, so Plans belongs in all three sidebars — not just the dealer's.
const PLANS = { to: "/plans", label: "Plans", icon: FiCreditCard };

export const NAV_BY_ROLE = {
  seller: [
    DASH,
    { to: "/listing/new", label: "Create Listing", icon: FiPlusSquare },
    { to: "/my-listings", label: "My Listings", icon: FiList },
    MATCHES,
    PLANS,
  ],
  buyer: [
    DASH,
    { to: "/requirements/new", label: "Post Requirement", icon: FiPlusSquare },
    { to: "/my-requirements", label: "My Requirements", icon: FiClipboard },
    { to: "/", label: "Browse Properties", icon: FiSearch, end: true },
    { to: "/wishlists", label: "Wishlists", icon: FiHeart },
    MATCHES,
    { to: "/trips", label: "Property Visits", icon: FiCalendar },
    PLANS,
  ],
  dealer: [
    DASH,
    { to: "/listing/new", label: "Create Listing", icon: FiPlusSquare },
    { to: "/my-listings", label: "My Listings", icon: FiList },
    { to: "/requirements", label: "Requirements Board", icon: FiClipboard },
    { to: "/requirements/new", label: "Post Requirement", icon: FiEdit3 },
    MATCHES,
    PLANS,
  ],
};
