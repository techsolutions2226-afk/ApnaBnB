import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import adminService from "../../services/adminService";
import StatusBadge from "../../components/common/StatusBadge";
import RefreshButton from "../../components/common/RefreshButton";
import { DonutChart, BarChart } from "../../components/admin/AdminCharts";
import {
  FiUsers,
  FiHome,
  FiFileText,
  FiLink,
  FiStar,
  FiShieldOff,
  FiLayers,
  FiCalendar,
  FiCheckCircle,
  FiXCircle,
} from "react-icons/fi";
import "../../styles/Admin.css";

/* KPI accents map to chart / theme CSS variables in index.css. */
const KPI_CARDS = [
  { to: "/admin/users", label: "Total Users", key: "totalUsers", icon: FiUsers, accent: "var(--chart-1)" },
  { to: "/admin/listings", label: "Properties", key: "totalProperties", icon: FiHome, accent: "var(--chart-2)" },
  { to: "/admin/requirements", label: "Requirements", key: "totalRequirements", icon: FiFileText, accent: "var(--chart-3)" },
  { to: "/admin/matches", label: "Matches", key: "totalMatches", icon: FiLink, accent: "var(--chart-5)" },
  { to: "/admin/listings", label: "Listings", key: "totalListings", icon: FiLayers, accent: "var(--chart-6)" },
  { to: "/admin/users", label: "Reviews", key: "totalReviews", icon: FiStar, accent: "var(--chart-3)" },
  { to: "/admin/users", label: "Suspended", key: "totalSuspended", icon: FiShieldOff, accent: "var(--chart-4)" },
];

const ROLE_META = [
  { role: "seller", label: "Sellers", color: "var(--chart-1)" },
  { role: "buyer", label: "Buyers", color: "var(--chart-2)" },
  { role: "dealer", label: "Dealers", color: "var(--chart-3)" },
  { role: "admin", label: "Admins", color: "var(--chart-4)" },
];

const STATUS_META = [
  { status: "active", label: "Active", color: "var(--chart-2)" },
  { status: "pending", label: "Pending", color: "var(--chart-3)" },
  { status: "sold", label: "Sold", color: "var(--chart-1)" },
  { status: "rented", label: "Rented", color: "var(--chart-5)" },
  { status: "featured", label: "Featured", color: "var(--chart-6)" },
  { status: "rejected", label: "Rejected", color: "var(--chart-4)" },
];

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [visits, setVisits] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    setError(null);
    try {
      const [s, a, v] = await Promise.all([
        adminService.getStats({ fresh: isRefresh }),
        adminService.getActivityLogs({ limit: 8 }),
        adminService.getVisits({ page: 1, limit: 5 }).catch(() => null),
      ]);
      setStats(s);
      setRecent(Array.isArray(a?.logs) ? a.logs : []);
      setVisits(v || null);
    } catch (err) {
      if (isRefresh) toast.error(err.message || "Failed to refresh");
      else setError(err.message || "Failed to load admin data");
    } finally {
      setRefreshing(false);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const roleCount = useCallback(
    (role) => stats?.usersByRole?.find((r) => r._id === role)?.count || 0,
    [stats]
  );
  const statusCount = useCallback(
    (status) => stats?.listingsByStatus?.find((s) => s._id === status)?.count || 0,
    [stats]
  );

  const roleItems = useMemo(
    () =>
      ROLE_META.map((r) => ({
        label: r.label,
        value: roleCount(r.role),
        color: r.color,
      })),
    [roleCount]
  );

  const statusItems = useMemo(
    () =>
      STATUS_META.map((s) => ({
        label: s.label,
        value: statusCount(s.status),
        color: s.color,
      })),
    [statusCount]
  );

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

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Platform Overview</h1>
          <p className="adm-subtitle">
            Live analytics across users, inventory, demand, and matches.
            {stats?.generatedAt ? (
              <>
                {" "}
                <span className="adm-updated-at">
                  Updated {new Date(stats.generatedAt).toLocaleString()}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <div className="adm-header-actions">
          <RefreshButton onRefresh={() => loadData(true)} refreshing={refreshing} />
        </div>
      </div>

      {/* KPI cards */}
      <div className="adm-kpis">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.label} to={card.to} className="adm-kpi">
              <div
                className="adm-kpi-icon"
                style={{
                  background: `color-mix(in srgb, ${card.accent} 14%, transparent)`,
                  color: card.accent,
                }}
              >
                <Icon size={20} />
              </div>
              <div className="adm-kpi-body">
                <div className="adm-kpi-value">{stats?.[card.key] || 0}</div>
                <div className="adm-kpi-label">{card.label}</div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Distribution charts */}
      <div className="adm-overview-grid adm-overview-grid--charts">
        <div className="adm-card adm-card--chart">
          <h3 className="adm-card-title">Users by role</h3>
          <p className="adm-card-sub">Share of each account type on the platform.</p>
          <DonutChart items={roleItems} size={200} thickness={26} />
        </div>

        <div className="adm-card adm-card--chart">
          <h3 className="adm-card-title">Properties by status</h3>
          <p className="adm-card-sub">Moderation and lifecycle mix for inventory.</p>
          <BarChart items={statusItems} height={240} />
        </div>
      </div>

      {/* Recent activity + recent visits */}
      <div className="adm-overview-grid adm-overview-grid--two">
        <div className="adm-card">
          <div className="adm-card-head">
            <h3 className="adm-card-title">Recent activity</h3>
            <Link to="/admin/logs" className="adm-card-link">
              View all logs →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="adm-empty">No activity recorded yet.</p>
          ) : (
            <div
              className="adm-activity-slider"
              role="list"
              aria-label="Recent activity"
            >
              {recent.map((log) => (
                <article
                  className="adm-activity-slide"
                  role="listitem"
                  key={log._id || log.id}
                >
                  <div className="adm-activity-slide-action">{log.action}</div>
                  <div className="adm-activity-slide-meta">
                    {log.userName || log.userEmail || "System"}
                    {log.entityType ? ` · ${log.entityType}` : ""}
                  </div>
                  <div className="adm-activity-slide-time">
                    {log.createdAt
                      ? new Date(log.createdAt).toLocaleString()
                      : "—"}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="adm-card">
          <div className="adm-card-head">
            <h3 className="adm-card-title">Visits</h3>
            <Link to="/admin/visits" className="adm-card-link">
              View all visits →
            </Link>
          </div>
          {!visits ? (
            <p className="adm-empty">No visit data.</p>
          ) : (
            <div className="adm-visits-card">
              <div className="adm-visits-card-totals">
                <div className="adm-visits-card-total">
                  <div className="adm-visits-card-total-num">
                    {visits.counts?.total || 0}
                  </div>
                  <div className="adm-visits-card-total-label">Total visits</div>
                </div>
                <div className="adm-visits-card-chips">
                  <span className="adm-visits-card-chip adm-visits-card-chip--ok">
                    <FiCheckCircle size={13} />
                    {visits.counts?.success || 0} successful
                  </span>
                  <span className="adm-visits-card-chip adm-visits-card-chip--bad">
                    <FiXCircle size={13} />
                    {visits.counts?.unsuccessful || 0} unsuccessful
                  </span>
                </div>
              </div>
              {Array.isArray(visits.trips) && visits.trips.length === 0 ? (
                <p className="adm-empty">No visits recorded yet.</p>
              ) : (
                <div className="adm-visits-card-list">
                  {(visits.trips || []).slice(0, 4).map((trip) => (
                    <div className="adm-visits-card-row" key={trip._id || trip.id}>
                      <FiCalendar size={14} className="adm-visits-card-row-icon" />
                      <div className="adm-visits-card-row-body">
                        <div className="adm-visits-card-row-title">
                          {trip.property?.title || "Property visit"}
                        </div>
                        <div className="adm-visits-card-row-sub">
                          {trip.user?.name || "Buyer"} ·{" "}
                          {trip.property?.listedBy?.name || "Owner"}
                        </div>
                      </div>
                      <StatusBadge status={trip.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
