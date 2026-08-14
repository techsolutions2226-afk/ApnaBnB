import { Link } from "react-router-dom";

/* ─── DashStat — professional dashboard stat card ───
   Icon bubble (tinted brand accent) + value + label.
   Wraps in a <Link> when `to` is provided.

   Props:
     icon      — react-icons component (e.g. FiHome)
     value     — number or string
     label     — short label
     accent    — brand hex colour used for the icon bubble tint
     to        — optional route to wrap the whole card as a link
   ─────────────────────────────────────────────────────── */

const DashStat = ({ icon, value, label, accent = "#1a8f5a", to }) => {
  const Icon = icon;
  const body = (
    <>
      <div className="dash-stat" style={{ "--dash-accent": accent }}>
        <div className="dash-stat-icon">
          <Icon size={18} />
        </div>
        <div className="dash-stat-body">
          <div className="dash-stat-value">{value}</div>
          <div className="dash-stat-label">{label}</div>
        </div>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className="dash-stat-link">
        {body}
      </Link>
    );
  }
  return body;
};

export default DashStat;