/* ─── Breadcrumb — Shared breadcrumb navigation ───
   Renders a Home → ... → Current breadcrumb trail.
   Uses the existing `dash-breadcrumb*` CSS classes from Dashboard.css.

   Props:
     items — array of { label, to? }
       - Items with `to` render as <Link>
       - The last item (or items without `to`) render as plain text (current)
   ─────────────────────────────────────────────── */

import { Link } from "react-router-dom";

export default function Breadcrumb({ items = [] }) {
  if (items.length === 0) return null;

  return (
    <nav className="dash-breadcrumb">
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span key={idx}>
            {idx > 0 && <span className="dash-breadcrumb-sep">/</span>}
            {isLast || !item.to ? (
              <span className="dash-breadcrumb-current">{item.label}</span>
            ) : (
              <Link to={item.to} className="dash-breadcrumb-link">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
