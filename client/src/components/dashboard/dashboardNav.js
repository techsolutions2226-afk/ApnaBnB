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
  FiMessageSquare,
  FiBell,
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
  seller: { label: "Seller", icon: FiKey, accent: "#00a699" },
  buyer: { label: "Buyer", icon: FiHome, accent: "#4a90d9" },
  dealer: { label: "Dealer", icon: FiBriefcase, accent: "#8b5cf6" },
};

/* Shared items reused across roles. */
const DASH = { to: "/dashboard", label: "Dashboard", icon: FiGrid, end: true };
const MATCHES = { to: "/matches", label: "Matches", icon: FiGitMerge };
const MESSAGES = { to: "/messages", label: "Messages", icon: FiMessageSquare };
const NOTIFS = { to: "/account/notifications", label: "Notifications", icon: FiBell };

export const NAV_BY_ROLE = {
  seller: [
    DASH,
    { to: "/listing/new", label: "Create Listing", icon: FiPlusSquare },
    { to: "/my-listings", label: "My Listings", icon: FiList },
    { to: "/requirements", label: "Requirements Board", icon: FiClipboard },
    MATCHES,
    MESSAGES,
    NOTIFS,
  ],
  buyer: [
    DASH,
    { to: "/requirements/new", label: "Post Requirement", icon: FiPlusSquare },
    { to: "/", label: "Browse Properties", icon: FiSearch, end: true },
    { to: "/wishlists", label: "Wishlists", icon: FiHeart },
    MATCHES,
    MESSAGES,
    { to: "/trips", label: "Property Visits", icon: FiCalendar },
    NOTIFS,
  ],
  dealer: [
    DASH,
    { to: "/listing/new", label: "Create Listing", icon: FiPlusSquare },
    { to: "/my-listings", label: "My Listings", icon: FiList },
    { to: "/requirements", label: "Requirements Board", icon: FiClipboard },
    { to: "/requirements/new", label: "Post Requirement", icon: FiEdit3 },
    MATCHES,
    MESSAGES,
    { to: "/plans", label: "Plans", icon: FiCreditCard },
    NOTIFS,
  ],
};
