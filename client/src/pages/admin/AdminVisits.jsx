import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import adminService from "../../services/adminService";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import RefreshButton from "../../components/common/RefreshButton";
import { FiExternalLink } from "react-icons/fi";
import "../../styles/Admin.css";

const VISIT_STATUSES = ["upcoming", "checked_in", "completed", "cancelled"];

const OUTCOME_META = {
  success: { label: "Successful", color: "#059669" },
  cancelled: { label: "Cancelled", color: "#dc2626" },
  no_show: { label: "No-show", color: "#d97706" },
  pending: { label: "Pending", color: "#6366f1" },
};

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleString() : "—";

/* Number of rows per page — the controller caps the page-size request at 100,
   so 15 keeps the table comfortable like the other admin lists. */
const PAGE_SIZE = 15;

/* ─── AdminVisits — platform-wide visit (trip) oversight.
   Read-only: every scheduled visit with its buyer, property owner, the
   property itself, status, schedule, and check-in trail. ─── */
const AdminVisits = () => {
  const [trips, setTrips] = useState([]);
  const [counts, setCounts] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getVisits({
        page,
        limit: PAGE_SIZE,
        status: status || undefined,
        q: query.trim() || undefined,
      });
      setTrips(data.trips || []);
      setCounts(data.counts || null);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load visits");
    } finally {
      setIsLoading(false);
    }
  }, [page, status, query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const summaryItems = [
    { label: "Total visits", value: counts?.total || 0, color: "var(--chart-1)" },
    { label: "Upcoming", value: counts?.upcoming || 0, color: "var(--chart-5)" },
    { label: "Checked in", value: counts?.checked_in || 0, color: "var(--chart-6)" },
    { label: "Completed", value: counts?.completed || 0, color: "#059669" },
    { label: "Successful", value: counts?.success || 0, color: "#059669" },
    { label: "Unsuccessful", value: counts?.unsuccessful || 0, color: "#dc2626" },
    { label: "Cancelled", value: counts?.cancelled || 0, color: "#dc2626" },
  ];

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Visits</h1>
          <p className="adm-subtitle">
            Every scheduled visit on the platform — buyer, property owner,
            property, status, schedule and check-in trail. Read-only oversight.
          </p>
        </div>
        <RefreshButton onRefresh={fetchData} refreshing={isLoading} />
      </div>

      {/* Summary strip */}
      <div className="adm-visit-summary">
        {summaryItems.map((item) => (
          <div
            className="adm-visit-summary-item"
            key={item.label}
            style={{ "--visit-color": item.color }}
          >
            <span className="adm-visit-summary-value">{item.value}</span>
            <span className="adm-visit-summary-label">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="adm-toolbar">
        <input
          className="adm-input adm-input--search"
          type="search"
          placeholder="Search buyer, owner, property, code…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="adm-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {VISIT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-table-wrap">
        {isLoading ? (
          <div className="adm-loading">Loading…</div>
        ) : error ? (
          <div className="adm-error">{error}</div>
        ) : trips.length === 0 ? (
          <p className="adm-empty">No visits found.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Owner</th>
                <th>Buyer</th>
                <th>Schedule</th>
                <th>Status</th>
                <th>Outcome</th>
                <th>Check-in</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((trip) => {
                const tid = trip._id || trip.id;
                const buyer = trip.user;
                const owner = trip.property?.listedBy;
                const outcomeMeta =
                  OUTCOME_META[trip.effectiveOutcome] || OUTCOME_META.pending;
                const schedule =
                  trip.visitorProposal?.date ||
                  trip.ownerProposal?.date ||
                  trip.checkIn ||
                  "—";
                const scheduledTime =
                  trip.visitorProposal?.time || trip.ownerProposal?.time || "";

                return (
                  <tr key={tid}>
                    <td>
                      <div className="adm-table-title">
                        {trip.property?.title || "—"}
                      </div>
                      <div className="adm-table-sub">
                        {trip.property?.location
                          ? `${trip.property.location.area || ""}, ${trip.property.location.city || ""}`
                          : "—"}
                      </div>
                    </td>
                    <td>
                      <div className="adm-table-title">{owner?.name || "—"}</div>
                      <div className="adm-table-sub">{owner?.email || "—"}</div>
                    </td>
                    <td>
                      <div className="adm-table-title">{buyer?.name || "—"}</div>
                      <div className="adm-table-sub">{buyer?.email || "—"}</div>
                    </td>
                    <td>
                      <div className="adm-table-title">{schedule}</div>
                      <div className="adm-table-sub">{scheduledTime || "—"}</div>
                    </td>
                    <td>
                      <StatusBadge status={trip.status} />
                    </td>
                    <td>
                      <span
                        className="adm-visit-outcome"
                        style={{ color: outcomeMeta.color }}
                      >
                        {outcomeMeta.label}
                      </span>
                    </td>
                    <td>
                      {trip.status === "checked_in" || trip.status === "completed" ? (
                        <div>
                          <div className="adm-table-title">✓ Checked in</div>
                          <div className="adm-table-sub">
                            {fmtDate(trip.checkedInAt)}
                          </div>
                        </div>
                      ) : (
                        <span className="adm-table-muted">—</span>
                      )}
                    </td>
                    <td className="adm-table-muted">
                      {fmtDate(trip.createdAt)}
                      <Link
                        to={`/visits/${tid}`}
                        className="adm-visit-view"
                        title="Open visit"
                      >
                        <FiExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  );
};

export default AdminVisits;
