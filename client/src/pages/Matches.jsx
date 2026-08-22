/* /matches — full list of every match involving the current user.
   Renders the same colored-pill cards as the dashboard's Recent Matches,
   plus filter tabs (by type / status) and per-card actions. */

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useMyMatches } from "../hooks/useMatches";
import useViewRole from "../hooks/useViewRole";
import matchService from "../services/matchService";
import { formatPrice } from "../utils/formatters";
import Breadcrumb from "../components/common/Breadcrumb";
import RefreshButton from "../components/common/RefreshButton";
import useRefresh from "../hooks/useRefresh";
import FilterTabs from "../components/common/FilterTabs";
import "../styles/Match.css";
import "../styles/Dashboard.css"; /* breadcrumb styles */

const TYPE_LABELS = {
  "seller-buyer": "Seller ↔ Buyer",
  "dealer-buyer": "Dealer ↔ Buyer",
  "dealer-dealer": "Dealer ↔ Dealer",
  "seller-dealer": "Seller ↔ Dealer",
};

const TYPE_STYLES = {
  "seller-buyer": { bg: "#e6f4ea", color: "#1e7e34" },
  "dealer-buyer": { bg: "#e3f2fd", color: "#1565c0" },
  "dealer-dealer": { bg: "#f3e5f5", color: "#6a1b9a" },
  "seller-dealer": { bg: "#fff3e0", color: "#e65100" },
};

const STATUS_STYLES = {
  pending: { bg: "#fff8e1", color: "#8d6e00" },
  accepted: { bg: "#e6f4ea", color: "#1e7e34" },
  rejected: { bg: "#fdecea", color: "#c62828" },
  closed: { bg: "#eee", color: "#555" },
};

const FILTER_OPTIONS = [
  { key: "all", label: "All Matches" },
  { key: "seller-buyer", label: "Seller ↔ Buyer" },
  { key: "dealer-buyer", label: "Dealer ↔ Buyer" },
  { key: "dealer-dealer", label: "Dealer ↔ Dealer" },
  { key: "seller-dealer", label: "Seller ↔ Dealer" },
];

const formatBudget = (budget) => {
  if (!budget) return "—";
  const { min, max } = budget;
  if (min && max)
    return `PKR ${Number(min).toLocaleString()} – ${Number(max).toLocaleString()}`;
  if (max) return `Up to PKR ${Number(max).toLocaleString()}`;
  if (min) return `From PKR ${Number(min).toLocaleString()}`;
  return "—";
};

const Matches = () => {
    const { getDashboardPath } = useAuth();
  const { viewRole } = useViewRole();
  const { matches, isLoading, error, refetch } = useMyMatches(viewRole);

  // Refresh just this tab — no browser reload.
  const { refresh, refreshing } = useRefresh(refetch);
  const [activeFilter, setActiveFilter] = useState("all");
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState(null);

  // Accept / reject a match. Accepting opens the private deal room.
  const handleStatus = async (match, status) => {
    setBusyId(match._id);
    try {
      await matchService.updateStatus(match._id, status);
      if (status === "accepted") {
        toast.success("Match accepted — opening your deal room.");
        navigate(`/messages?match=${match._id}`);
        return;
      }
      toast.info("Match dismissed.");
      refetch();
    } catch (e) {
      toast.error(e.message || "Could not update match.");
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => {
    if (activeFilter === "all") return matches || [];
    return (matches || []).filter((m) => m.type === activeFilter);
  }, [matches, activeFilter]);

  const stats = useMemo(() => {
    const total = (matches || []).length;
    const pending = (matches || []).filter((m) => m.status === "pending").length;
    const accepted = (matches || []).filter((m) => m.status === "accepted").length;
    const avg =
      total > 0
        ? Math.round(
            (matches || []).reduce((s, m) => s + (m.score || 0), 0) / total,
          )
        : 0;
    return { total, pending, accepted, avg };
  }, [matches]);

  // Loading
  if (isLoading) {
    return (
      <div className="mtch-page">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Dashboard", to: getDashboardPath() },
            { label: "Matches" },
          ]}
        />
        <div style={{ padding: 40, textAlign: "center" }}>
          <div className="auth-spinner" style={{ margin: "0 auto 20px" }} />
          <p>Loading your matches...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="mtch-page">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Dashboard", to: getDashboardPath() },
            { label: "Matches" },
          ]}
        />
        <div style={{ padding: 40, textAlign: "center", color: "#d32f2f" }}>
          <p>Error loading matches: {error}</p>
          <button
            onClick={refetch}
            style={{
              marginTop: 10,
              padding: "8px 16px",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Empty (no matches at all)
  if (!matches || matches.length === 0) {
    return (
      <div className="mtch-page">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Dashboard", to: getDashboardPath() },
            { label: "Matches" },
          ]}
        />
        <div className="mtch-header-row">
          <div className="mtch-header">
            <h1 className="mtch-title">Matches</h1>
            <p className="mtch-subtitle">Your property matches will appear here.</p>
          </div>
          <RefreshButton onRefresh={refresh} refreshing={refreshing} />
        </div>
        <div className="mtch-empty">
          <div className="mtch-empty-icon">🔗</div>
          <h3 className="mtch-empty-title">No matches yet</h3>
          <p className="mtch-empty-text">
            When a property and a requirement line up on city, area, type, and
            price (±10%), they'll show up here automatically.
          </p>
          <Link to={getDashboardPath()} className="mtch-btn mtch-btn--primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mtch-page">
      <Breadcrumb
        items={[
          { label: "Home", to: "/" },
          { label: "Dashboard", to: getDashboardPath() },
          { label: "Matches" },
        ]}
      />

      <div className="mtch-header-row">
        <div className="mtch-header">
          <h1 className="mtch-title">Matches</h1>
          <p className="mtch-subtitle">
            Properties and requirements matched for you, ranked by score.
          </p>
        </div>
        <RefreshButton onRefresh={refresh} refreshing={refreshing} />
      </div>

      {/* Stats */}
      <div className="mtch-stats-bar">
        <div className="mtch-stats-item">
          <span className="mtch-stats-num">{stats.total}</span>
          <span className="mtch-stats-label">Total</span>
        </div>
        <div className="mtch-stats-item">
          <span className="mtch-stats-num">{stats.pending}</span>
          <span className="mtch-stats-label">Pending</span>
        </div>
        <div className="mtch-stats-item">
          <span className="mtch-stats-num">{stats.accepted}</span>
          <span className="mtch-stats-label">Accepted</span>
        </div>
        <div className="mtch-stats-item">
          <span className="mtch-stats-num">{stats.avg}%</span>
          <span className="mtch-stats-label">Avg Score</span>
        </div>
      </div>

      {/* Type filter */}
      <div className="mtch-toolbar">
        <div className="mtch-filters">
          <FilterTabs
            tabs={FILTER_OPTIONS}
            activeKey={activeFilter}
            onChange={setActiveFilter}
            prefix="mtch-filter-btn"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mtch-empty">
          <div className="mtch-empty-icon">🔗</div>
          <h3 className="mtch-empty-title">No matches in this category</h3>
          <p className="mtch-empty-text">
            Try selecting a different filter to see your matches.
          </p>
          <button
            className="mtch-btn mtch-btn--primary"
            onClick={() => setActiveFilter("all")}
          >
            View all matches
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {filtered.map((match) => {
            const property = match.property || {};
            const requirement = match.requirement || {};
            const typeLabel = TYPE_LABELS[match.type] || match.type;
            const typeStyle =
              TYPE_STYLES[match.type] || { bg: "#eee", color: "#222" };
            const statusStyle =
              STATUS_STYLES[match.status] ||
              { bg: "#eee", color: "#555" };
            const location = [
              property.location?.area,
              property.location?.city,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <div
                key={match._id}
                style={{
                  background: "#fff",
                  border: "1px solid #ebebeb",
                  borderRadius: 12,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* Top: relationship + score + status */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      padding: "5px 12px",
                      borderRadius: 999,
                      background: typeStyle.bg,
                      color: typeStyle.color,
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    {typeLabel}
                  </span>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flex: 1,
                      maxWidth: 360,
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        height: 8,
                        background: "#f0f0f0",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${match.score || 0}%`,
                          background:
                            (match.score || 0) >= 85
                              ? "#1e7e34"
                              : (match.score || 0) >= 70
                                ? "#f9a825"
                                : "#bdbdbd",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#222",
                        minWidth: 40,
                      }}
                    >
                      {Math.round(match.score || 0)}%
                    </span>
                  </div>

                  <span
                    style={{
                      display: "inline-flex",
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: statusStyle.bg,
                      color: statusStyle.color,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {match.status || "pending"}
                  </span>
                </div>

                {/* Property block */}
                {property._id && (
                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    <img
                      src={
                        property.photos?.[0] ||
                        "https://via.placeholder.com/120x90?text=No+Image"
                      }
                      alt={property.title}
                      style={{
                        width: 120,
                        height: 90,
                        objectFit: "cover",
                        borderRadius: 8,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          margin: "0 0 4px",
                          color: "#222",
                        }}
                      >
                        <Link
                          to={`/property/${property._id}`}
                          style={{ color: "inherit", textDecoration: "none" }}
                        >
                          {property.title || "Untitled property"}
                        </Link>
                      </h4>
                      <div style={{ fontSize: 13, color: "#717171" }}>
                        {location || "Location pending"}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 14,
                          fontWeight: 600,
                          color: "#222",
                        }}
                      >
                        PKR {formatPrice(property.price)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Requirement summary */}
                <div
                  style={{
                    background: "#fafafa",
                    padding: 12,
                    borderRadius: 8,
                    fontSize: 13,
                    color: "#444",
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    Buyer/dealer is looking for:
                  </div>
                  <div>
                    <strong>{requirement.title || requirement.propertyType || "—"}</strong>
                    {" · "}
                    {[requirement.location?.area, requirement.location?.city]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                  <div style={{ marginTop: 2 }}>
                    Budget: {formatBudget(requirement.budget)}
                  </div>
                </div>

                {/* Notes if any */}
                {match.notes && (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#555",
                      margin: 0,
                      fontStyle: "italic",
                    }}
                  >
                    "{match.notes}"
                  </p>
                )}

                {/* AI matchmaking explanation */}
                {(match.aiReason || match.aiStatus === "pending") && (
                  <div className="mtch-ai">
                    <span className="mtch-ai-badge">AI</span>
                    {match.aiStatus === "pending" ? (
                      <span className="mtch-ai-pending">
                        AI scoring in progress…
                      </span>
                    ) : (
                      <span>Matched because: {match.aiReason}</span>
                    )}
                  </div>
                )}

                {/* Actions — driven by the deal state */}
                <div className="mtch-actions">
                  {match.status === "pending" && (
                    <>
                      <button
                        type="button"
                        className="mtch-btn mtch-btn--primary"
                        disabled={busyId === match._id}
                        onClick={() => handleStatus(match, "accepted")}
                      >
                        {busyId === match._id ? "Working…" : "Accept & open deal room"}
                      </button>
                      <button
                        type="button"
                        className="mtch-btn mtch-btn--ghost"
                        disabled={busyId === match._id}
                        onClick={() => handleStatus(match, "rejected")}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {match.status === "accepted" && (
                    <button
                      type="button"
                      className="mtch-btn mtch-btn--primary"
                      onClick={() => navigate(`/messages?match=${match._id}`)}
                    >
                      Open deal room →
                    </button>
                  )}
                  {match.status === "closed" && (
                    <span className="mtch-deal-done">✓ Deal closed</span>
                  )}
                  {match.status === "rejected" && (
                    <span className="mtch-deal-rejected">Dismissed</span>
                  )}
                  {property._id && (
                    <Link
                      to={`/property/${property._id}`}
                      className="mtch-btn mtch-btn--secondary"
                    >
                      View property
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Matches;
