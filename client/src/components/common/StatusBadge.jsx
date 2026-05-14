/* ─── StatusBadge — Coloured status/role pill ───
   Renders a small badge with automatic colour based on the status string.
   Supports listing/deal statuses, user roles, and custom variants.

   Props:
     status    — the raw status string (e.g. "active", "sold", "pending")
     label     — optional display label; if omitted, `status` is displayed
                 with underscores replaced by spaces
     prefix    — CSS class prefix (default "cm-badge")
     className — optional extra class
   ─────────────────────────────────────────────── */

import "../../styles/Common.css";

export default function StatusBadge({
  status,
  label,
  prefix = "cm-badge",
  className = "",
}) {
  const displayLabel =
    label || (status ? status.replace(/_/g, " ") : "");
  return (
    <span
      className={`${prefix} ${prefix}--${status} ${className}`.trim()}
    >
      {displayLabel}
    </span>
  );
}
