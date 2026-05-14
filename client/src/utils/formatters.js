/* ═══════════════════════════════════════════════
   formatters.js — Shared formatting utilities
   Centralises duplicate helpers used across
   dashboards, listings, matches, requirements, etc.
   ═══════════════════════════════════════════════ */

/**
 * Format a PKR price to a human-readable short string.
 * e.g.  42 000 000 → "4.2 Cr"   |  8 500 000 → "85.0 Lac"
 *
 * @param {number}  n              Raw price in PKR
 * @param {object}  [opts]
 * @param {boolean} [opts.prefix]  Prepend "PKR " (default false)
 * @returns {string}
 */
export const formatPrice = (n, { prefix = false } = {}) => {
  const p = prefix ? "PKR " : "";
  if (n >= 10000000) return `${p}${(n / 10000000).toFixed(1)} Cr`;
  if (n >= 100000) return `${p}${(n / 100000).toFixed(1)} Lac`;
  return `${p}${n.toLocaleString()}`;
};

/**
 * Return a human-readable "time ago" string from a date string.
 * e.g.  "Today"  |  "Yesterday"  |  "5d ago"  |  "2mo ago"
 *
 * @param {string} dateStr   ISO date string or parseable date
 * @returns {string}
 */
export const timeAgo = (dateStr) => {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

/**
 * Format a date string into a readable short date.
 * e.g.  "Jan 5, 2025"
 *
 * @param {string} dateStr
 * @returns {string}
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const formatLocation = (locationObj, fallbackCity = "") => {
  if (!locationObj) return fallbackCity || "Unknown location";
  if (typeof locationObj === "object") {
    return [locationObj.area, locationObj.city].filter(Boolean).join(", ") || fallbackCity || "Unknown location";
  }
  return locationObj;
};

export const formatCity = (locationObj, fallbackCity = "") => {
  if (!locationObj) return fallbackCity || "";
  if (typeof locationObj === "object") {
    return locationObj.city || fallbackCity || "";
  }
  return typeof locationObj === "string" ? locationObj.split(",")[0] || fallbackCity || "" : fallbackCity;
};

/**
 * Notification type → emoji icon mapping.
 * Used across all dashboards and the notifications page.
 */
export const NOTIF_ICONS = {
  match: "\uD83D\uDD17",    // 🔗
  message: "\uD83D\uDCAC",  // 💬
  deal: "\uD83E\uDD1D",     // 🤝
  listing: "\uD83C\uDFE0",  // 🏠
  review: "\u2B50",          // ⭐
  system: "\uD83D\uDD14",   // 🔔
};
