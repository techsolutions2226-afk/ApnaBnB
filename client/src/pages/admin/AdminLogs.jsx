import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import adminService from "../../services/adminService";
import SearchInput from "../../components/common/SearchInput";
import Pagination from "../../components/common/Pagination";
import { FiExternalLink } from "react-icons/fi";
import "../../styles/Admin.css";

const ACTIONS = [
  "auth.login", "auth.register", "auth.verify-otp", "auth.google",
  "property.create", "property.update", "property.delete",
  "listing.create", "listing.update", "listing.delete",
  "requirement.create", "requirement.update", "requirement.delete",
  "match.create", "match.accept", "match.reject", "match.close",
  "message.send", "conversation.create",
  "review.create",
  "trip.create", "trip.cancel",
  "wishlist.create", "wishlist.update",
  "admin.user.create", "admin.user.update", "admin.user.delete",
  "admin.user.verify", "admin.user.suspend",
  "admin.property.update", "admin.property.delete", "admin.property.approve", "admin.property.reject",
  "admin.listing.update", "admin.listing.delete",
  "admin.requirement.update", "admin.requirement.delete",
  "admin.match.delete", "admin.message.delete",
];

const ENTITY_TYPES = [
  "user", "property", "listing", "requirement", "match",
  "message", "conversation", "review", "trip", "wishlist", "auth", "system",
  "upload", "admin",
];

const PERIODS = [
  { label: "All time", value: "" },
  { label: "Last 24 hours", value: "1" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
];

/* ─── AdminLogs — full platform activity feed, filterable ─── */
const AdminLogs = () => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [days, setDays] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getActivityLogs({
        page,
        limit: 20,
        q: query || undefined,
        action: action || undefined,
        entityType: entityType || undefined,
        days: days || undefined,
      });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load logs");
    } finally {
      setIsLoading(false);
    }
  }, [page, query, action, entityType, days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / 20));
  const shownCount = logs.length;

  const actionStyle = (actionName = "") => {
    if (actionName.startsWith("admin")) return { badge: "adm-log-badge--admin", label: "Admin" };
    if (actionName.startsWith("auth")) return { badge: "adm-log-badge--auth", label: "Auth" };
    if (actionName.startsWith("match")) return { badge: "adm-log-badge--match", label: "Match" };
    if (actionName.startsWith("message")) return { badge: "adm-log-badge--message", label: "Message" };
    if (actionName.startsWith("review") || actionName.startsWith("trip") || actionName.startsWith("wishlist"))
      return { badge: "adm-log-badge--activity", label: "Activity" };
    if (actionName.startsWith("property") || actionName.startsWith("listing"))
      return { badge: "adm-log-badge--listing", label: "Listing" };
    return { badge: "", label: "Content" };
  };

  return (
    <div className="adm-page">
      <div className="adm-header">
        <h1 className="adm-title">System Logs</h1>
        <p className="adm-subtitle">
          Every action recorded on the platform — who did what, when, and where.
        </p>
      </div>

      <div className="adm-toolbar adm-toolbar--wrap">
        <SearchInput
          value={query}
          onChange={(v) => {
            setPage(1);
            setQuery(v);
          }}
          placeholder="Search by user name, email or title…"
          rawEvent={false}
        />
        <select
          className="adm-select"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          className="adm-select"
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All entity types</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="adm-select"
          value={days}
          onChange={(e) => {
            setDays(e.target.value);
            setPage(1);
          }}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-section-count adm-log-count">
        {shownCount} of {total} log{total !== 1 ? "s" : ""} shown
      </div>

      <div className="adm-card">
        {isLoading ? (
          <div className="adm-loading">Loading logs…</div>
        ) : error ? (
          <div className="adm-error">{error}</div>
        ) : logs.length === 0 ? (
          <p className="adm-empty">No activity logged yet.</p>
        ) : (
          <div className="adm-feed adm-feed--dense">
            {logs.map((log) => {
              const st = actionStyle(log.action);
              return (
                <div className="adm-feed-item" key={log._id || log.id}>
                  <div className="adm-feed-main">
                    <div className="adm-feed-line">
                      <span className={`adm-log-badge ${st.badge}`}>{st.label}</span>
                      <span className="adm-feed-action">{log.action}</span>
                      <span className="adm-feed-entity">{log.entityType}</span>
                    </div>
                    {log.userId ? (
                      <Link
                        to={`/admin/users/${log.userId}`}
                        className="adm-feed-actor"
                        title="View this user"
                      >
                        {log.userName || log.userEmail || "Unknown"}
                        <FiExternalLink size={12} />
                      </Link>
                    ) : (
                      <span className="adm-feed-actor">System</span>
                    )}
                    {log.meta && Boolean(Object.keys(log.meta).length) && (
                      <div className="adm-timeline-meta">
                        {Object.entries(log.meta).map(([k, v]) => (
                          <span key={k} className="adm-timeline-kv">
                            <strong>{k}:</strong>{" "}
                            {typeof v === "object" ? JSON.stringify(v) : String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="adm-feed-time">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                    {log.ip ? <div className="adm-feed-ip">IP {log.ip}</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
};

export default AdminLogs;