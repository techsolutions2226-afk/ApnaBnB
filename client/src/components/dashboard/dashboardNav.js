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
import { MESSAGING_ENABLED } from "../../config/features";

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

const NAV_BY_ROLE_ALL = {
  seller: [
    DASH,
    { to: "/listing/new", label: "Create Listing", icon: FiPlusSquare },
    { to: "/my-listings", label: "My Listings", icon: FiList },
    MATCHES,
    MESSAGES,
    NOTIFS,
  ],
  buyer: [
    DASH,
    { to: "/requirements/new", label: "Post Requirement", icon: FiPlusSquare },
    { to: "/my-requirements", label: "My Requirements", icon: FiClipboard },
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

/* Chat is shelved (see config/features.js). Filtering here rather than editing
   each role's array keeps the MESSAGES entry intact for the day it returns —
   re-enabling is a flag flip, not a re-edit. */
export const NAV_BY_ROLE = MESSAGING_ENABLED
  ? NAV_BY_ROLE_ALL
  : Object.fromEntries(
      Object.entries(NAV_BY_ROLE_ALL).map(([role, items]) => [
        role,
        items.filter((item) => item.to !== "/messages"),
      ]),
    );

