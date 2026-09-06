/** Shared formatters for admin user-detail panels. */

export const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

export const fmtDateTime = (v) => (v ? new Date(v).toLocaleString() : "—");

export const titleCase = (v) =>
  v ? String(v).charAt(0).toUpperCase() + String(v).slice(1).replace(/_/g, " ") : "—";

export const formatPrice = (n) => {
  if (n == null || n === "") return "—";
  const num = Number(n);
  if (Number.isNaN(num)) return String(n);
  return `PKR ${num.toLocaleString()}`;
};

export const formatBudget = (budget) => {
  if (!budget) return "—";
  if (typeof budget === "object") {
    const min = budget.min != null ? Number(budget.min).toLocaleString() : null;
    const max = budget.max != null ? Number(budget.max).toLocaleString() : null;
    if (min && max) return `PKR ${min} – ${max}`;
    if (min) return `From PKR ${min}`;
    if (max) return `Up to PKR ${max}`;
  }
  return String(budget);
};

export const locationLabel = (loc) => {
  if (!loc) return "—";
  if (typeof loc === "string") return loc;
  const parts = [loc.area, loc.city].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
};

export const accountStateLabel = (user) => {
  if (!user) return "Unknown";
  if (user.deactivated && user.suspended) return "Deactivated + Suspended";
  if (user.deactivated) return "Deactivated";
  if (user.suspended) return "Suspended";
  return "Active";
};

export const accountStateClass = (user) => {
  if (!user) return "";
  if (user.suspended) return "adm-suspended-tag";
  if (user.deactivated) return "adm-deactivated-tag";
  return "adm-active-tag";
};
