import { Link } from "react-router-dom";

/* ─── SectionHeader — dashboard section heading with optional action ───
   Consistent heading + right-aligned link/button used across all three
   dashboards. Keeps section markup uniform and professional.

   Props:
     title     — heading text
     to        — optional route for the "View all" style action
     actionText— action label (default "View all")
     actionIcon— optional react-icons component for the action
     children  — optional custom action node (overrides to/actionText)
   ─────────────────────────────────────────────────────────────────── */

const SectionHeader = ({ title, to, actionText = "View all", actionIcon: Icon, children }) => (
  <div className="dash-section-header">
    <h2 className="dash-section-title">{title}</h2>
    {children ? (
      children
    ) : to ? (
      <Link to={to} className="dash-section-action">
        {Icon && <Icon size={14} />}
        <span>{actionText}</span>
      </Link>
    ) : null}
  </div>
);

export default SectionHeader;