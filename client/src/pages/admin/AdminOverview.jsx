import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import adminService from "../../services/adminService";
import {
  FiUsers,
  FiHome,
  FiFileText,
  FiLink,
  FiMail,
  FiMessageSquare,
  FiStar,
  FiShieldOff,
} from "react-icons/fi";
import "../../styles/Admin.css";

/* ─── AdminOverview — platform KPI dashboard ─── */
const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      adminService.getStats(),
      adminService.getActivityLogs({ limit: 8 }),
    ])
      .then(([s, a]) => {
        if (cancelled) return;
        setStats(s);
        setRecent(Array.isArray(a?.logs) ? a.logs : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load admin data");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="adm-page">
        <div className="adm-loading">Loading admin overview…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="adm-page">
        <div className="adm-error">Error loading admin overview: {error}</div>
      </div>
    );
  }

  const roleCount = (role) =>
    stats?.usersByRole?.find((r) => r._id === role)?.count || 0;
  const statusCount = (status) =>
    stats?.listingsByStatus?.find((s) => s._id === status)?.count || 0;

  const cards = [
    { to: "/admin/users", label: "Total Users", value: stats?.totalUsers || 0, icon: FiUsers, accent: "#16324f" },
    { to: "/admin/listings", label: "Properties", value: stats?.totalProperties || 0, icon: FiHome, accent: "#1a8f5a" },
    { to: "/admin/requirements", label: "Requirements", value: stats?.totalRequirements || 0, icon: FiFileText, accent: "#e1a100" },
    { to: "/admin/matches", label: "Matches", value: stats?.totalMatches || 0, icon: FiLink, accent: "#7c3aed" },
    { to: "/admin/messages", label: "Messages", value: stats?.totalMessages || 0, icon: FiMessageSquare, accent: "#0284c7" },
    { to: "/admin/listings", label: "Conversations", value: stats?.totalConversations || 0, icon: FiMail, accent: "#db2777" },
    { to: "/admin/users", label: "Reviews", value: stats?.totalReviews || 0, icon: FiStar, accent: "#ea580c" },
    { to: "/admin/users", label: "Suspended Users", value: stats?.totalSuspended || 0, icon: FiShieldOff, accent: "#b91c1c" },
  ];

  return (
    <div className="adm-page">
      <div className="adm-header">
        <h1 className="adm-title">Platform Overview</h1>
        <p className="adm-subtitle">
          A snapshot of everything happening on apnabnb right now.
        </p>
      </div>

      {/* KPI cards */}
      <div className="adm-kpis">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.to} className="adm-kpi">
              <div
                className="adm-kpi-icon"
                style={{ background: `${card.accent}1a`, color: card.accent }}
              >
                <Icon size={20} />
              </div>
              <div className="adm-kpi-body">
                <div className="adm-kpi-value">{card.value}</div>
                <div className="adm-kpi-label">{card.label}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Breakdowns */}
      <div className="adm-overview-grid">
        <div className="adm-card">
          <h3 className="adm-card-title">Users by Role</h3>
          {[
            { role: "seller", label: "Sellers" },
            { role: "buyer", label: "Buyers" },
            { role: "dealer", label: "Dealers" },
            { role: "admin", label: "Admins" },
          ].map(({ role, label }) => (
            <div className="adm-bar-row" key={role}>
              <span className="adm-bar-label">{label}</span>
              <div className="adm-bar-track">
                <div
                  className="adm-bar-fill adm-bar-fill--navy"
                  style={{
                    width: `${stats?.totalUsers ? Math.max(4, (roleCount(role) / stats.totalUsers) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="adm-bar-count">{roleCount(role)}</span>
            </div>
          ))}
        </div>

        <div className="adm-card">
          <h3 className="adm-card-title">Properties by Status</h3>
          {[
            { status: "active", label: "Active" },
            { status: "pending", label: "Pending" },
            { status: "sold", label: "Sold" },
            { status: "rented", label: "Rented" },
            { status: "featured", label: "Featured" },
            { status: "rejected", label: "Rejected" },
          ].map(({ status, label }) => (
            <div className="adm-bar-row" key={status}>
              <span className="adm-bar-label">{label}</span>
              <div className="adm-bar-track">
                <div
                  className="adm-bar-fill adm-bar-fill--green"
                  style={{
                    width: `${stats?.totalProperties ? Math.max(4, (statusCount(status) / stats.totalProperties) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="adm-bar-count">{statusCount(status)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="adm-card">
        <div className="adm-card-head">
          <h3 className="adm-card-title">Recent Activity</h3>
          <Link to="/admin/logs" className="adm-card-link">
            View all logs →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="adm-empty">No activity recorded yet.</p>
        ) : (
          <div className="adm-feed">
            {recent.map((log) => (
              <div className="adm-feed-item" key={log._id || log.id}>
                <div className="adm-feed-action">{log.action}</div>
                <div className="adm-feed-meta">
                  {log.userName || log.userEmail || "System"}
                  {log.entityType ? ` · ${log.entityType}` : ""}
                </div>
                <div className="adm-feed-time">
                  {log.createdAt
                    ? new Date(log.createdAt).toLocaleString()
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;