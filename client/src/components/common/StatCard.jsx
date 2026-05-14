/* ─── StatCard — Reusable dashboard stat card ───
   Displays an icon, a numeric value, and a label.
   Used across all dashboards (seller, buyer, dealer, admin).

   Props:
     icon    — emoji or React node displayed above the value
     value   — number or string (the main stat)
     label   — descriptive text beneath the value
     className — optional extra class
   ─────────────────────────────────────────────── */

import "../../styles/Common.css";

export default function StatCard({ icon, value, label, className = "" }) {
  return (
    <div className={`cm-stat ${className}`.trim()}>
      <div className="cm-stat-icon">{icon}</div>
      <div className="cm-stat-value">{value}</div>
      <div className="cm-stat-label">{label}</div>
    </div>
  );
}
